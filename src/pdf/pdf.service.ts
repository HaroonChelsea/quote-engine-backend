import { Injectable, Logger } from '@nestjs/common';
import puppeteer from 'puppeteer';

export interface QuotePdfData {
  quoteNumber: string;
  customerInfo: {
    name: string;
    company: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  products: Array<{
    title: string;
    quantity: number;
    basePrice: number;
    options: Array<{
      title: string;
      price: number;
    }>;
    totalPrice: number;
  }>;
  shippingInfo: {
    origin: string;
    destination: string;
    method: string;
    estimatedCost: number;
    transitTime: string;
  };
  pricing: {
    subtotal: number;
    shipping: number;
    total: number;
    tax: number;
    finalTotal: number;
  };
  createdAt: Date;
  validUntil: Date;
}

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  async generateQuotePdf(quoteData: QuotePdfData): Promise<Buffer> {
    try {
      this.logger.log('Generating quote PDF...');

      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page = await browser.newPage();

      // Generate HTML content for the quote
      const htmlContent = this.generateQuoteHtml(quoteData);

      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

      // Generate PDF
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '20mm',
          bottom: '20mm',
          left: '20mm',
        },
      });

      await browser.close();

      this.logger.log('Quote PDF generated successfully');
      return Buffer.from(pdfBuffer);
    } catch (error) {
      this.logger.error('Failed to generate quote PDF:', error);
      throw new Error('Failed to generate PDF');
    }
  }

  private generateQuoteHtml(quoteData: QuotePdfData): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Quote ${quoteData.quoteNumber}</title>
          <style>
            body {
              font-family: 'Arial', sans-serif;
              margin: 0;
              padding: 20px;
              color: #333;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #2563eb;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .company-info {
              text-align: center;
              margin-bottom: 30px;
            }
            .quote-details {
              display: flex;
              justify-content: space-between;
              margin-bottom: 30px;
            }
            .customer-info, .shipping-info {
              flex: 1;
              margin: 0 10px;
            }
            .section-title {
              font-size: 18px;
              font-weight: bold;
              color: #2563eb;
              margin-bottom: 15px;
              border-bottom: 1px solid #e5e7eb;
              padding-bottom: 5px;
            }
            .info-row {
              margin-bottom: 8px;
            }
            .label {
              font-weight: bold;
              color: #6b7280;
            }
            .products-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 30px;
            }
            .products-table th,
            .products-table td {
              border: 1px solid #e5e7eb;
              padding: 12px;
              text-align: left;
            }
            .products-table th {
              background-color: #f9fafb;
              font-weight: bold;
            }
            .pricing-summary {
              border: 1px solid #e5e7eb;
              padding: 20px;
              background-color: #f9fafb;
              margin-bottom: 30px;
            }
            .pricing-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 10px;
            }
            .total-row {
              border-top: 2px solid #2563eb;
              padding-top: 10px;
              font-weight: bold;
              font-size: 18px;
            }
            .footer {
              text-align: center;
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              color: #6b7280;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>QUOTE</h1>
            <div class="company-info">
              <h2>Your Company Name</h2>
              <p>Professional Booth Solutions</p>
            </div>
          </div>

          <div class="quote-details">
            <div class="customer-info">
              <div class="section-title">Customer Information</div>
              <div class="info-row">
                <span class="label">Name:</span> ${quoteData.customerInfo.name}
              </div>
              <div class="info-row">
                <span class="label">Company:</span> ${quoteData.customerInfo.company}
              </div>
              <div class="info-row">
                <span class="label">Email:</span> ${quoteData.customerInfo.email}
              </div>
              <div class="info-row">
                <span class="label">Phone:</span> ${quoteData.customerInfo.phone}
              </div>
              <div class="info-row">
                <span class="label">Address:</span> ${quoteData.customerInfo.address}
              </div>
              <div class="info-row">
                <span class="label">City:</span> ${quoteData.customerInfo.city}, ${quoteData.customerInfo.state} ${quoteData.customerInfo.zip}
              </div>
              <div class="info-row">
                <span class="label">Country:</span> ${quoteData.customerInfo.country}
              </div>
            </div>

            <div class="shipping-info">
              <div class="section-title">Shipping Information</div>
              <div class="info-row">
                <span class="label">Origin:</span> ${quoteData.shippingInfo.origin}
              </div>
              <div class="info-row">
                <span class="label">Destination:</span> ${quoteData.shippingInfo.destination}
              </div>
              <div class="info-row">
                <span class="label">Method:</span> ${quoteData.shippingInfo.method}
              </div>
              <div class="info-row">
                <span class="label">Transit Time:</span> ${quoteData.shippingInfo.transitTime}
              </div>
            </div>
          </div>

          <div class="section-title">Products</div>
          <table class="products-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Quantity</th>
                <th>Base Price</th>
                <th>Options</th>
                <th>Total Price</th>
              </tr>
            </thead>
            <tbody>
              ${quoteData.products
                .map(
                  (product) => `
                <tr>
                  <td>${product.title}</td>
                  <td>${product.quantity}</td>
                  <td>$${product.basePrice.toLocaleString()}</td>
                  <td>
                    ${product.options
                      .map(
                        (option) =>
                          `${option.title} (+$${option.price.toLocaleString()})`,
                      )
                      .join('<br>')}
                  </td>
                  <td>$${product.totalPrice.toLocaleString()}</td>
                </tr>
              `,
                )
                .join('')}
            </tbody>
          </table>

          <div class="pricing-summary">
            <div class="section-title">Pricing Summary</div>
            <div class="pricing-row">
              <span>Products Subtotal:</span>
              <span>$${quoteData.pricing.subtotal.toLocaleString()}</span>
            </div>
            <div class="pricing-row">
              <span>Shipping:</span>
              <span>$${quoteData.pricing.shipping.toLocaleString()}</span>
            </div>
            <div class="pricing-row">
              <span>Tax (8%):</span>
              <span>$${quoteData.pricing.tax.toLocaleString()}</span>
            </div>
            <div class="pricing-row total-row">
              <span>Total:</span>
              <span>$${quoteData.pricing.finalTotal.toLocaleString()}</span>
            </div>
          </div>

          <div class="footer">
            <p><strong>Quote Number:</strong> ${quoteData.quoteNumber}</p>
            <p><strong>Created:</strong> ${quoteData.createdAt.toLocaleDateString()}</p>
            <p><strong>Valid Until:</strong> ${quoteData.validUntil.toLocaleDateString()}</p>
            <p>Thank you for your business!</p>
          </div>
        </body>
      </html>
    `;
  }
}
