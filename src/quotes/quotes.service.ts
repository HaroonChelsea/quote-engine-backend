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

  async sendQuoteEmail(quoteId: number) {
    const quote = await this.findQuoteById(quoteId);
    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    const { customerInfo, emailMessage } = quote as any;

    try {
      // Generate PDF for the quote
      const pdfData = await this.generateQuotePdfData(quoteId);
      const pdfBuffer = await this.pdfService.generateQuotePdf(pdfData);

      // For development, use mock email service
      const result = await this.emailService.sendMockEmail(
        customerInfo.email,
        emailMessage.subject,
        emailMessage.message,
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

  async generateQuotePdfData(quoteId: number): Promise<QuotePdfData> {
    const quote = await this.findQuoteById(quoteId);
    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    // For now, return mock data - you'll need to adapt this based on your actual data structure
    return {
      quoteNumber: `Q-${quoteId}`,
      customerInfo: {
        name:
          quote.customer?.firstName + ' ' + quote.customer?.lastName ||
          'Unknown',
        company: quote.customer?.companyName || 'Unknown Company',
        email: quote.customer?.email || 'unknown@email.com',
        phone: quote.customer?.phone || 'Unknown',
        address: quote.customer?.streetAddress || 'Unknown',
        city: quote.customer?.city || 'Unknown',
        state: quote.customer?.state || 'Unknown',
        zip: quote.customer?.zip || 'Unknown',
        country: 'US', // Default to US for now
      },
      products: [
        {
          title: 'Sample Product',
          quantity: 1,
          basePrice: parseFloat(quote.basePrice || '0'),
          options: [],
          totalPrice: parseFloat(quote.totalAmount || '0'),
        },
      ],
      shippingInfo: {
        origin: 'NO.12 HUASHAN RD, SHILOU TOWN, PANYU DISTRICT, GUANGZHOU',
        destination: 'Customer Address',
        method: 'Standard Shipping',
        estimatedCost: 0,
        transitTime: '5-10 business days',
      },
      pricing: {
        subtotal: parseFloat(quote.basePrice || '0'),
        shipping: 0,
        total: parseFloat(quote.totalAmount || '0'),
        tax: parseFloat(quote.totalAmount || '0') * 0.08,
        finalTotal: parseFloat(quote.totalAmount || '0') * 1.08,
      },
      createdAt: quote.createdAt || new Date(),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    };
  }
}
