import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database-connection';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { eq } from 'drizzle-orm';
import { fullSchema } from 'src/database/database.module';
import { EmailService } from '../email/email.service';
import { PdfService, QuotePdfData } from '../pdf/pdf.service';

@Injectable()
export class QuotesService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly database: NodePgDatabase<typeof fullSchema>,
    private readonly emailService: EmailService,
    private readonly pdfService: PdfService,
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
      const totalAmount = dto.selectedProducts.reduce((sum, product) => {
        const productTotal =
          parseFloat(product.basePrice) +
          product.selectedOptions.reduce(
            (optSum, opt) => optSum + parseFloat(opt.price),
            0,
          );
        return sum + productTotal * product.quantity;
      }, 0);

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
        method: 'Standard Shipping',
        estimatedCost: 0,
        transitTime: '5-10 business days',
      },
      pricing: {
        subtotal: subtotal,
        shipping: 0,
        total: subtotal,
        tax: tax,
        finalTotal: finalTotal,
      },
      createdAt: quote.createdAt || new Date(),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    };
  }
}
