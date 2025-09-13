import { Inject, Injectable, NotFoundException, Logger } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database-connection';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { eq } from 'drizzle-orm';
import { fullSchema } from 'src/database/database.module';
import { EmailService } from '../email/email.service';
import { PdfService, QuotePdfData } from '../pdf/pdf.service';
import { ShopifyService } from '../shopify/shopify.service';
import { ShopifyMappingService } from '../shopify/shopify-mapping.service';
import { ShopifyVariantMatcherService } from '../shopify/shopify-variant-matcher.service';

@Injectable()
export class QuotesService {
  private readonly logger = new Logger(QuotesService.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly database: NodePgDatabase<typeof fullSchema>,
    private readonly emailService: EmailService,
    private readonly pdfService: PdfService,
    private readonly shopifyService: ShopifyService,
    private readonly shopifyMappingService: ShopifyMappingService,
    private readonly shopifyVariantMatcher: ShopifyVariantMatcherService,
  ) {}

  async createQuote(dto: CreateQuoteDto) {
    // First, create or find the customer
    let customerId: number;

    try {
      // Try to find existing customer by email
      const existingCustomer = await this.database.query.customers.findFirst({
        where: eq(fullSchema.customers.email, dto.customerInfo.email),
      });

      if (existingCustomer) {
        customerId = existingCustomer.id;
        console.log(
          `Using existing customer: ${existingCustomer.firstName} ${existingCustomer.lastName} (ID: ${customerId})`,
        );
      } else {
        // Create new customer
        const [newCustomer] = await this.database
          .insert(fullSchema.customers)
          .values({
            firstName: dto.customerInfo.firstName,
            lastName: dto.customerInfo.lastName,
            companyName: dto.customerInfo.companyName,
            email: dto.customerInfo.email,
            phone: dto.customerInfo.phone,
            streetAddress: dto.customerInfo.streetAddress,
            city: dto.customerInfo.city,
            state: dto.customerInfo.state,
            zip: dto.customerInfo.zip,
          })
          .returning();

        customerId = newCustomer.id;
        console.log(
          `Created new customer: ${newCustomer.firstName} ${newCustomer.lastName} (ID: ${customerId})`,
        );
      }

      // Calculate total amount from selected products
      const productTotal = dto.selectedProducts.reduce((sum, product) => {
        const productAmount =
          parseFloat(product.basePrice) +
          product.selectedOptions.reduce(
            (optSum, opt) => optSum + parseFloat(opt.price),
            0,
          );
        return sum + productAmount * product.quantity;
      }, 0);

      // Add shipping cost to total
      const shippingCost = parseFloat(dto.shippingInfo?.cost || '0');
      const totalAmount = productTotal + shippingCost;

      // Create the quote
      const [newQuote] = await this.database
        .insert(fullSchema.quotes)
        .values({
          customerId: customerId,
          productId: dto.selectedProducts[0].id,
          status: 'DRAFT',
          basePrice: dto.selectedProducts[0].basePrice,
          optionsPrice: dto.selectedProducts[0].selectedOptions
            .reduce((sum, opt) => sum + parseFloat(opt.price), 0)
            .toString(),
          totalAmount: totalAmount.toFixed(2),
          // Store shipping information
          shippingMethod: dto.shippingInfo?.method,
          shippingCost: dto.shippingInfo?.cost,
          shippingEstimatedDays: dto.shippingInfo?.estimatedDays,
        })
        .returning();

      // Save the selected options for this quote
      if (dto.selectedProducts[0].selectedOptions.length > 0) {
        const quoteOptionsToInsert =
          dto.selectedProducts[0].selectedOptions.map((option) => ({
            quoteId: newQuote.id,
            optionId: option.id,
            price: option.price,
          }));

        await this.database
          .insert(fullSchema.quoteOptions)
          .values(quoteOptionsToInsert);
      }

      console.log(
        `Created quote with ID: ${newQuote.id} for customer: ${customerId}`,
      );

      // Shopify Integration - Create customer, find variant, and create draft order
      try {
        this.logger.log(
          `Starting Shopify integration for quote ${newQuote.id}`,
        );

        // 1. Create or find Shopify customer
        this.logger.log(
          `Creating Shopify customer for: ${dto.customerInfo.email}`,
        );
        const shopifyCustomerId = await this.createShopifyCustomer(
          dto.customerInfo,
        );
        this.logger.log(
          `Shopify customer creation result: ${shopifyCustomerId}`,
        );

        // 2. Find matching Shopify variant
        this.logger.log(
          `Looking for variant match for product ${dto.selectedProducts[0].id} with options:`,
          dto.selectedProducts[0].selectedOptions,
        );
        const variantMatch = await this.findMatchingShopifyVariant(
          dto.selectedProducts[0].id,
          dto.selectedProducts[0].selectedOptions,
        );
        this.logger.log(`Variant match result:`, variantMatch);

        // 3. Create Shopify draft order if we have both customer and variant
        let shopifyDraftOrderId: string | null = null;
        this.logger.log(
          `Draft order conditions - Customer ID: ${shopifyCustomerId}, Variant Match: ${!!variantMatch}`,
        );
        if (shopifyCustomerId && variantMatch) {
          this.logger.log(
            `Creating draft order with customer ${shopifyCustomerId} and variant ${variantMatch.variantId}`,
          );
          shopifyDraftOrderId = await this.createShopifyDraftOrder(
            shopifyCustomerId,
            variantMatch.variantId,
            dto.selectedProducts[0].quantity,
            variantMatch.price,
            dto.shippingInfo,
          );
          this.logger.log(
            `Draft order created with ID: ${shopifyDraftOrderId}`,
          );
        } else {
          this.logger.warn(
            `Cannot create draft order - Missing customer ID: ${!shopifyCustomerId}, Missing variant match: ${!variantMatch}`,
          );
        }

        // 4. Update quote with Shopify data
        const shopifyUpdateData: any = {
          shopifySyncedAt: new Date(),
          shopifySyncError: null,
        };

        // Determine sync status based on what was actually created
        if (shopifyCustomerId && shopifyDraftOrderId) {
          shopifyUpdateData.shopifySyncStatus = 'SYNCED';
          this.logger.log(
            `Successfully integrated quote ${newQuote.id} with Shopify - Customer and Draft Order created`,
          );
        } else if (shopifyCustomerId && variantMatch) {
          shopifyUpdateData.shopifySyncStatus = 'PARTIAL';
          shopifyUpdateData.shopifySyncError =
            'Customer created but draft order failed';
          this.logger.warn(
            `Partial Shopify integration for quote ${newQuote.id} - Customer created but draft order failed`,
          );
        } else if (variantMatch) {
          shopifyUpdateData.shopifySyncStatus = 'PARTIAL';
          shopifyUpdateData.shopifySyncError =
            'Variant found but customer creation failed';
          this.logger.warn(
            `Partial Shopify integration for quote ${newQuote.id} - Variant found but customer creation failed`,
          );
        } else {
          shopifyUpdateData.shopifySyncStatus = 'FAILED';
          shopifyUpdateData.shopifySyncError =
            'Customer creation and variant matching failed';
          this.logger.error(
            `Shopify integration failed for quote ${newQuote.id} - Customer creation and variant matching failed`,
          );
        }

        if (shopifyCustomerId)
          shopifyUpdateData.shopifyCustomerId = shopifyCustomerId;
        if (shopifyDraftOrderId)
          shopifyUpdateData.shopifyDraftOrderId = shopifyDraftOrderId;
        if (variantMatch)
          shopifyUpdateData.shopifyVariantId = variantMatch.variantId;

        await this.database
          .update(fullSchema.quotes)
          .set(shopifyUpdateData)
          .where(eq(fullSchema.quotes.id, newQuote.id));
      } catch (shopifyError) {
        this.logger.error(
          `Shopify integration failed for quote ${newQuote.id}:`,
          shopifyError,
        );

        // Update quote with error status but don't fail the entire operation
        await this.database
          .update(fullSchema.quotes)
          .set({
            shopifySyncStatus: 'FAILED',
            shopifySyncError: shopifyError.message,
          })
          .where(eq(fullSchema.quotes.id, newQuote.id));
      }

      return this.findQuoteById(newQuote.id);
    } catch (error) {
      console.error('Error creating quote:', error);
      throw new Error(`Failed to create quote: ${error.message}`);
    }
  }

  async findQuoteById(id: number) {
    return this.database.query.quotes.findFirst({
      where: eq(fullSchema.quotes.id, id),
      with: {
        customer: true,
        selectedOptions: {
          with: {
            option: true,
          },
        },
      },
    });
  }

  async findAllQuotes() {
    return this.database.query.quotes.findMany({
      with: {
        customer: true,
        selectedOptions: {
          with: {
            option: true,
          },
        },
      },
      orderBy: (quotes, { desc }) => [desc(quotes.createdAt)],
    });
  }

  async updateQuoteStatus(
    id: number,
    status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'INVOICED',
  ) {
    const [updatedQuote] = await this.database
      .update(fullSchema.quotes)
      .set({
        status,
      })
      .where(eq(fullSchema.quotes.id, id))
      .returning();

    return updatedQuote;
  }

  async sendQuoteEmail(
    quoteId: number,
    emailData?: { subject: string; message: string },
  ) {
    const quote = await this.findQuoteById(quoteId);
    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    try {
      // Generate PDF for the quote
      const pdfData = await this.generateQuotePdfData(quoteId);
      const pdfBuffer = await this.pdfService.generateQuotePdf(pdfData);

      // Prepare email content
      const subject =
        emailData?.subject ||
        `Quote #${quoteId} - ${quote.customer?.companyName || 'Your Quote'}`;
      const message =
        emailData?.message || this.generateDefaultEmailMessage(quote, pdfData);

      // Send real email
      const result = await this.emailService.sendQuoteEmail(
        quote.customer?.email || '',
        subject,
        message,
        pdfBuffer,
      );

      // Update quote status to sent
      await this.updateQuoteStatus(quoteId, 'SENT');

      return result;
    } catch (error) {
      console.error('Failed to send quote email:', error);
      throw new Error(`Failed to send quote email: ${error.message}`);
    }
  }

  private generateDefaultEmailMessage(quote: any, pdfData: any): string {
    const customerName =
      quote.customer?.firstName && quote.customer?.lastName
        ? `${quote.customer.firstName} ${quote.customer.lastName}`
        : 'Valued Customer';

    const companyName = quote.customer?.companyName || 'Your Company';

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">
          Quote #${quote.id} - ${companyName}
        </h2>

        <p>Dear ${customerName},</p>

        <p>Thank you for your interest in our products and services. Please find attached your detailed quote.</p>

        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #333; margin-top: 0;">Quote Summary</h3>
          <p><strong>Quote Number:</strong> #${quote.id}</p>
          <p><strong>Total Amount:</strong> $${parseFloat(quote.totalAmount || '0').toLocaleString()}</p>
          <p><strong>Valid Until:</strong> ${pdfData.validUntil.toLocaleDateString()}</p>
        </div>

        <p>This quote is valid for 30 days from the date of issue. If you have any questions or need any modifications, please don't hesitate to contact us.</p>

        <p>We look forward to working with you!</p>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 14px;">
            Best regards,<br>
            <strong>Your Sales Team</strong><br>
            Thinktanks
          </p>
        </div>
      </div>
    `;
  }

  async deleteQuote(id: number) {
    // First check if quote exists
    const quote = await this.findQuoteById(id);
    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    try {
      // Delete quote options first (due to foreign key constraint)
      await this.database
        .delete(fullSchema.quoteOptions)
        .where(eq(fullSchema.quoteOptions.quoteId, id));

      // Delete the quote
      await this.database
        .delete(fullSchema.quotes)
        .where(eq(fullSchema.quotes.id, id));

      return { message: 'Quote deleted successfully', id };
    } catch (error) {
      console.error('Error deleting quote:', error);
      throw new Error(`Failed to delete quote: ${error.message}`);
    }
  }

  async testEmailConnection(to: string, subject?: string, message?: string) {
    try {
      const testSubject = subject || 'Test Email from Quote Engine';
      const testMessage =
        message ||
        `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Test Email</h2>
          <p>This is a test email from the Quote Engine system.</p>
          <p>If you receive this email, the email functionality is working correctly!</p>
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="color: #666; font-size: 14px;">
              Best regards,<br>
              <strong>Quote Engine System</strong>
            </p>
          </div>
        </div>
      `;

      const result = await this.emailService.sendQuoteEmail(
        to,
        testSubject,
        testMessage,
      );

      return {
        success: true,
        message: 'Test email sent successfully',
        details: result,
      };
    } catch (error) {
      console.error('Test email failed:', error);
      return {
        success: false,
        message: error.message,
        error: error,
      };
    }
  }

  async generateQuotePdfData(quoteId: number): Promise<QuotePdfData> {
    const quote = await this.findQuoteById(quoteId);
    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    // Get the quote options with their details
    const quoteOptions = await this.database
      .select({
        id: fullSchema.quoteOptions.id,
        optionId: fullSchema.quoteOptions.optionId,
        price: fullSchema.quoteOptions.price,
        optionTitle: fullSchema.options.title,
        groupName: fullSchema.optionGroups.name,
      })
      .from(fullSchema.quoteOptions)
      .leftJoin(
        fullSchema.options,
        eq(fullSchema.quoteOptions.optionId, fullSchema.options.id),
      )
      .leftJoin(
        fullSchema.optionGroups,
        eq(fullSchema.options.groupId, fullSchema.optionGroups.id),
      )
      .where(eq(fullSchema.quoteOptions.quoteId, quoteId));

    // Get the product details
    const product = await this.database
      .select()
      .from(fullSchema.products)
      .where(eq(fullSchema.products.id, quote.productId))
      .limit(1);

    const productData = product[0];
    if (!productData) {
      throw new NotFoundException('Product not found');
    }

    // Calculate pricing
    const basePrice = parseFloat(quote.basePrice || '0');
    const optionsPrice = quoteOptions.reduce(
      (sum, opt) => sum + parseFloat(opt.price || '0'),
      0,
    );
    const subtotal = basePrice + optionsPrice;
    const tax = subtotal * 0.08;
    const finalTotal = subtotal + tax;

    return {
      quoteNumber: `Q-${quoteId}`,
      customerInfo: {
        name:
          `${quote.customer?.firstName || ''} ${quote.customer?.lastName || ''}`.trim() ||
          'Unknown',
        company: quote.customer?.companyName || 'Unknown Company',
        email: quote.customer?.email || 'unknown@email.com',
        phone: quote.customer?.phone || 'Unknown',
        address: quote.customer?.streetAddress || 'Unknown',
        city: quote.customer?.city || 'Unknown',
        state: quote.customer?.state || 'Unknown',
        zip: quote.customer?.zip || 'Unknown',
        country: 'US',
      },
      products: [
        {
          title: productData.title,
          quantity: 1, // Default quantity, you might want to store this in the quote
          basePrice: basePrice,
          options: quoteOptions.map((opt) => ({
            title: `${opt.groupName}: ${opt.optionTitle}`,
            price: parseFloat(opt.price || '0'),
          })),
          totalPrice: subtotal,
        },
      ],
      shippingInfo: {
        origin: 'NO.12 HUASHAN RD, SHILOU TOWN, PANYU DISTRICT, GUANGZHOU',
        destination: `${quote.customer?.city || 'Unknown'}, ${quote.customer?.state || 'Unknown'}`,
        method: quote.shippingMethod || 'Standard Shipping',
        estimatedCost: parseFloat(quote.shippingCost || '0'),
        transitTime: quote.shippingEstimatedDays || '5-10 business days',
      },
      pricing: {
        subtotal: subtotal,
        shipping: parseFloat(quote.shippingCost || '0'),
        total: subtotal + parseFloat(quote.shippingCost || '0'),
        tax: tax,
        finalTotal: finalTotal + parseFloat(quote.shippingCost || '0'),
      },
      createdAt: quote.createdAt || new Date(),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    };
  }

  /**
   * Get valid province code for Shopify using the Shopify service
   */
  private async getValidProvinceCode(
    countryCode: string,
    state: string,
  ): Promise<string> {
    if (!state) {
      return countryCode === 'US' ? 'CA' : 'ON';
    }

    try {
      return await this.shopifyService.validateProvinceCode(countryCode, state);
    } catch (error) {
      this.logger.error('Error validating province code:', error);
      // Return safe defaults
      return countryCode === 'US' ? 'CA' : 'ON';
    }
  }

  /**
   * Format phone number to E.164 format for Shopify
   */
  private formatPhoneNumber(phone: string): string {
    if (!phone) return '';

    const digits = phone.replace(/\D/g, '');

    if (digits.length === 11 && digits.startsWith('1')) {
      return `+${digits}`;
    }

    if (digits.length === 10) {
      return `+1${digits}`;
    }

    if (phone.startsWith('+')) {
      return phone;
    }
    return phone;
  }

  /**
   * Create or find Shopify customer
   */
  async createShopifyCustomer(customerInfo: any): Promise<string | null> {
    try {
      this.logger.log(
        `Creating/finding Shopify customer for: ${customerInfo.email}`,
      );

      // Check if customer already has Shopify ID in local database
      const existingCustomer = await this.database.query.customers.findFirst({
        where: eq(fullSchema.customers.email, customerInfo.email),
      });

      if (existingCustomer?.shopifyCustomerId) {
        this.logger.log(
          `Using existing Shopify customer from local DB: ${existingCustomer.shopifyCustomerId}`,
        );
        return existingCustomer.shopifyCustomerId;
      }

      // Check if customer exists in Shopify by email
      try {
        const existingShopifyCustomer =
          await this.shopifyService.getCustomerByEmail(customerInfo.email);
        if (existingShopifyCustomer?.customer?.id) {
          const shopifyCustomerId = existingShopifyCustomer.customer.id;
          this.logger.log(
            `Found existing Shopify customer: ${shopifyCustomerId}`,
          );

          // Update local customer with Shopify ID
          await this.database
            .update(fullSchema.customers)
            .set({ shopifyCustomerId })
            .where(eq(fullSchema.customers.email, customerInfo.email));

          return shopifyCustomerId;
        }
      } catch (error) {
        if (
          error.message?.includes('timeout') ||
          error.message?.includes('fetch failed')
        ) {
          this.logger.warn(
            'Shopify API timeout when checking existing customer, will try to create new one',
          );
        } else {
          this.logger.log('Customer not found in Shopify, will create new one');
        }
      }

      // Create new customer in Shopify
      const formattedPhone = this.formatPhoneNumber(customerInfo.phone);
      const countryCode = customerInfo.country || 'US';
      const validProvince = await this.getValidProvinceCode(
        countryCode,
        customerInfo.state,
      );

      this.logger.log(
        `Formatted phone number: ${customerInfo.phone} -> ${formattedPhone}`,
      );
      this.logger.log(
        `Validated province: ${customerInfo.state} -> ${validProvince} for country ${countryCode}`,
      );

      const shopifyCustomer = await this.shopifyService.createCustomer({
        firstName: customerInfo.firstName,
        lastName: customerInfo.lastName,
        email: customerInfo.email,
        phone: formattedPhone,
        addresses: [
          {
            firstName: customerInfo.firstName,
            lastName: customerInfo.lastName,
            company: customerInfo.companyName,
            address1: customerInfo.streetAddress,
            city: customerInfo.city,
            province: validProvince,
            zip: customerInfo.zip,
            country: countryCode,
          },
        ],
      });

      this.logger.log(`Shopify customer creation response:`, shopifyCustomer);

      if (shopifyCustomer?.customerCreate?.customer?.id) {
        const shopifyCustomerId = shopifyCustomer.customerCreate.customer.id;

        // Update local customer with Shopify ID
        await this.database
          .update(fullSchema.customers)
          .set({ shopifyCustomerId })
          .where(eq(fullSchema.customers.email, customerInfo.email));

        this.logger.log(`Created new Shopify customer: ${shopifyCustomerId}`);
        return shopifyCustomerId;
      }

      return null;
    } catch (error) {
      if (
        error.message?.includes('timeout') ||
        error.message?.includes('fetch failed')
      ) {
        this.logger.error(
          'Shopify API timeout when creating customer:',
          error.message,
        );
      } else {
        this.logger.error('Error creating Shopify customer:', error);
      }
      return null;
    }
  }

  /**
   * Find matching Shopify variant for selected options
   */
  async findMatchingShopifyVariant(
    productId: number,
    selectedOptions: any[],
  ): Promise<{ variantId: string; price: string; sku: string } | null> {
    try {
      this.logger.log(
        `Finding Shopify variant for product ${productId} with options:`,
        selectedOptions,
      );

      // Convert old format to new format
      const newFormatOptions = selectedOptions.map((opt) => ({
        optionGroupId: opt.optionGroupId || 0, // Use optionGroupId from the selected option
        optionId: opt.id,
        optionName: opt.name,
        optionGroupName: opt.groupName || 'Unknown',
        optionGroupType: opt.groupType || ('CUSTOM' as const),
      }));

      const variantMatch = await this.shopifyVariantMatcher.findMatchingVariant(
        productId,
        newFormatOptions,
      );

      if (variantMatch) {
        this.logger.log(`Found matching variant: ${variantMatch.variantId}`);
        return {
          variantId: variantMatch.variantId,
          price: variantMatch.price || '0',
          sku: variantMatch.sku || '',
        };
      }

      this.logger.warn(`No matching variant found for product ${productId}`);
      return null;
    } catch (error) {
      this.logger.error('Error finding Shopify variant:', error);
      return null;
    }
  }

  /**
   * Create Shopify draft order
   */
  async createShopifyDraftOrder(
    customerId: string,
    variantId: string,
    quantity: number,
    price: string,
    shippingInfo?: { method?: string; cost?: string; estimatedDays?: string },
  ): Promise<string | null> {
    try {
      this.logger.log(
        `Creating Shopify draft order for customer ${customerId}, variant ${variantId}`,
      );

      const draftOrderData: any = {
        customerId,
        lineItems: [
          {
            variantId,
            quantity,
            originalUnitPrice: price,
          },
        ],
        useCustomerDefaultAddress: true,
      };

      // Add shipping information if provided
      if (shippingInfo?.cost && parseFloat(shippingInfo.cost) > 0) {
        draftOrderData.shippingLine = {
          title: shippingInfo.method || 'Shipping',
          price: shippingInfo.cost,
        };
      }

      const draftOrder =
        await this.shopifyService.createDraftOrder(draftOrderData);

      if (draftOrder?.draftOrderCreate?.draftOrder?.id) {
        const draftOrderId = draftOrder.draftOrderCreate.draftOrder.id;
        this.logger.log(`Created Shopify draft order: ${draftOrderId}`);
        return draftOrderId;
      }

      return null;
    } catch (error) {
      this.logger.error('Error creating Shopify draft order:', error);
      return null;
    }
  }

  /**
   * Sync quote with Shopify (retry failed operations)
   */
  async syncQuoteWithShopify(quoteId: number): Promise<boolean> {
    try {
      this.logger.log(`Syncing quote ${quoteId} with Shopify`);

      const quote = await this.database.query.quotes.findFirst({
        where: eq(fullSchema.quotes.id, quoteId),
        with: {
          customer: true,
        },
      });

      if (!quote) {
        throw new Error(`Quote ${quoteId} not found`);
      }

      // Get the first selected product (assuming single product quotes for now)
      const quoteOptions = await this.database.query.quoteOptions.findMany({
        where: eq(fullSchema.quoteOptions.quoteId, quoteId),
        with: {
          option: true,
        },
      });

      if (quoteOptions.length === 0) {
        throw new Error(`No products found for quote ${quoteId}`);
      }

      // Create Shopify customer if needed
      let shopifyCustomerId = quote.shopifyCustomerId;
      if (!shopifyCustomerId && quote.customer) {
        shopifyCustomerId = await this.createShopifyCustomer(quote.customer);
      }

      // Find matching variant
      const variantMatch = await this.findMatchingShopifyVariant(
        quote.productId,
        quoteOptions.map((qo) => ({
          id: qo.optionId,
          name: qo.option?.title || 'Unknown',
        })),
      );

      // Create draft order if we have both customer and variant
      let shopifyDraftOrderId = quote.shopifyDraftOrderId;
      if (!shopifyDraftOrderId && shopifyCustomerId && variantMatch) {
        shopifyDraftOrderId = await this.createShopifyDraftOrder(
          shopifyCustomerId,
          variantMatch.variantId,
          1, // TODO: Get actual quantity
          variantMatch.price,
          {
            method: quote.shippingMethod || undefined,
            cost: quote.shippingCost || undefined,
            estimatedDays: quote.shippingEstimatedDays || undefined,
          },
        );
      }

      // Update quote with Shopify data
      const updateData: any = {
        shopifySyncStatus: 'SYNCED',
        shopifySyncedAt: new Date(),
        shopifySyncError: null,
      };

      if (shopifyCustomerId) updateData.shopifyCustomerId = shopifyCustomerId;
      if (shopifyDraftOrderId)
        updateData.shopifyDraftOrderId = shopifyDraftOrderId;
      if (variantMatch) updateData.shopifyVariantId = variantMatch.variantId;

      await this.database
        .update(fullSchema.quotes)
        .set(updateData)
        .where(eq(fullSchema.quotes.id, quoteId));

      this.logger.log(`Successfully synced quote ${quoteId} with Shopify`);
      return true;
    } catch (error) {
      this.logger.error(`Error syncing quote ${quoteId} with Shopify:`, error);

      // Update quote with error status
      await this.database
        .update(fullSchema.quotes)
        .set({
          shopifySyncStatus: 'FAILED',
          shopifySyncError: error.message,
        })
        .where(eq(fullSchema.quotes.id, quoteId));

      return false;
    }
  }
}
