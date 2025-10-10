import { Injectable, Logger } from '@nestjs/common';
import puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';

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
    unitType: string;
    unitQuantity: number;
    basePrice: number;
    options: Array<{
      groupName: string;
      groupType: string;
      name: string;
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
  discount?: {
    description?: string;
    value: number;
    valueType: 'FIXED_AMOUNT' | 'PERCENTAGE';
    title?: string;
  };
  createdAt: Date;
  validUntil: Date;
}

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  async generateQuotePdf(quoteData: QuotePdfData): Promise<Buffer> {
    let browser;
    try {
      this.logger.log('Generating quote PDF with brand pages...');
      this.logger.log(
        'Quote data received:',
        JSON.stringify(quoteData, null, 2),
      );

      this.logger.log('Launching Puppeteer browser...');
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu',
        ],
        timeout: 60000, // 60 second timeout for browser launch
      });

      this.logger.log('Creating new page...');
      const page = await browser.newPage();

      this.logger.log('Generating brand pages HTML...');
      // Generate brand pages HTML
      let brandPagesHtml = '';
      try {
        brandPagesHtml = this.generateBrandPagesHtml();
        this.logger.log('Brand pages HTML generated successfully');
      } catch (brandError) {
        this.logger.warn(
          'Failed to generate brand pages, continuing without them:',
          brandError,
        );
        brandPagesHtml = ''; // Continue without brand pages
      }

      this.logger.log('Generating quote content HTML...');
      // Generate quote content HTML
      const quoteHtml = this.generateQuoteHtml(quoteData);

      // Combine all content
      const fullHtmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Quote ${quoteData.quoteNumber}</title>
             <style>
               html, body {
                 margin: 0;
                 padding: 0;
                 width: 100%;
                 height: 100%;
               }
               body {
                 font-family: 'Arial', sans-serif;
                 color: #333;
               }
               .page-break {
                 page-break-before: always;
               }
               .brand-page {
                 width: 100%;
                 height: 70vh;
                 display: flex;
                 align-items: center;
                 justify-content: center;
                 background: white;
                 page-break-after: always;
                 page-break-inside: avoid;
               }
               .brand-page img {
                 max-width: 100%;
                 max-height: 100%;
                 width: auto;
                 height: auto;
                 object-fit: contain;
                 display: block;
               }
             </style>
          </head>
          <body>
            ${brandPagesHtml}
            ${brandPagesHtml ? '<div class="page-break"></div>' : ''}
            ${quoteHtml}
          </body>
        </html>
      `;

      this.logger.log('Setting page content...');
      // Set page timeout to prevent hanging
      page.setDefaultTimeout(45000); // 45 seconds

      await page.setContent(fullHtmlContent, {
        waitUntil: 'domcontentloaded',
        timeout: 45000,
      });

      this.logger.log('Waiting for content to load...');
      // Wait a bit more for any dynamic content to load
      await new Promise((resolve) => setTimeout(resolve, 2000));

      this.logger.log('Generating PDF...');
      // Generate PDF
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '10mm',
          right: '10mm',
          bottom: '10mm',
          left: '10mm',
        },
        preferCSSPageSize: true,
      });

      await browser.close();

      this.logger.log('Quote PDF with brand pages generated successfully');
      return Buffer.from(pdfBuffer);
    } catch (error) {
      this.logger.error('Failed to generate quote PDF:', error);

      // Ensure browser is closed even if there's an error
      if (browser) {
        try {
          await browser.close();
        } catch (closeError) {
          this.logger.warn('Failed to close browser:', closeError);
        }
      }

      // Try fallback method without brand pages
      this.logger.log(
        'Attempting fallback PDF generation without brand pages...',
      );
      try {
        return await this.generateQuotePdfFallback(quoteData);
      } catch (fallbackError) {
        this.logger.error(
          'Fallback PDF generation also failed:',
          fallbackError,
        );
        throw new Error('Failed to generate PDF');
      }
    }
  }

  private async generateQuotePdfFallback(
    quoteData: QuotePdfData,
  ): Promise<Buffer> {
    let browser;
    try {
      this.logger.log('Generating fallback PDF without brand pages...');

      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu',
        ],
        timeout: 60000,
      });

      const page = await browser.newPage();
      page.setDefaultTimeout(45000);

      // Generate only quote content HTML (no brand pages)
      const quoteHtml = this.generateQuoteHtml(quoteData);

      const fullHtmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Quote ${quoteData.quoteNumber}</title>
            <style>
              html, body {
                margin: 0;
                padding: 0;
                width: 100%;
                height: 100%;
              }
              body {
                font-family: 'Arial', sans-serif;
                color: #333;
              }
            </style>
          </head>
          <body>
            ${quoteHtml}
          </body>
        </html>
      `;

      await page.setContent(fullHtmlContent, {
        waitUntil: 'domcontentloaded',
        timeout: 45000,
      });

      await new Promise((resolve) => setTimeout(resolve, 2000));

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '10mm',
          right: '10mm',
          bottom: '10mm',
          left: '10mm',
        },
        preferCSSPageSize: true,
      });

      await browser.close();

      this.logger.log('Fallback PDF generated successfully');
      return Buffer.from(pdfBuffer);
    } catch (error) {
      this.logger.error('Fallback PDF generation failed:', error);

      if (browser) {
        try {
          await browser.close();
        } catch (closeError) {
          this.logger.warn('Failed to close browser in fallback:', closeError);
        }
      }

      throw error;
    }
  }

  private generateBrandPagesHtml(): string {
    const brandImages = [
      'Thinktanks_1.png',
      'Thinktanks_2.png',
      'Thinktanks_3.png',
      'Thinktanks_5.png', // Note: Thinktanks_4.png is missing
      'Thinktanks_6.png',
    ];

    // Add an extra page to make it 6 pages total
    const allPages = [...brandImages]; // Duplicate first image for 6th page

    return allPages
      .map((imageName, index) => {
        try {
          const imagePath = path.join(
            process.cwd(),
            'src',
            'assets',
            imageName,
          );
          const imageBuffer = fs.readFileSync(imagePath);
          const base64Image = imageBuffer.toString('base64');
          const dataUrl = `data:image/png;base64,${base64Image}`;

          return `
          <div class="brand-page">
            <img src="${dataUrl}" alt="Thinktanks Brand Page ${index + 1}" />
          </div>
        `;
        } catch (error) {
          this.logger.error(`Failed to load image ${imageName}:`, error);
          // Fallback to a placeholder if image fails to load
          return `
          <div class="brand-page">
            <div style="display: flex; align-items: center; justify-content: center; height: 100vh; background-color: #f0f0f0;">
              <div style="text-align: center;">
                <h2>Thinktanks Brand Page ${index + 1}</h2>
                <p>Image: ${imageName}</p>
              </div>
            </div>
          </div>
        `;
        }
      })
      .join('');
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
              margin-bottom: 30px;
            }
            .customer-info {
              max-width: 50%;
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
                  <td>
                    <strong>${product.title}</strong>
                    ${product.basePrice > 0 ? '' : '<br><small style="color: #6b7280;">(Price varies by options)</small>'}
                  </td>
                  <td>
                    ${product.quantity} ${product.unitType}${product.quantity > 1 ? 's' : ''}
                    ${product.unitQuantity > 1 ? `<br><small>(${product.unitQuantity} units per ${product.unitType})</small>` : ''}
                  </td>
                  <td>
                    ${product.basePrice > 0 ? `$${product.basePrice.toLocaleString()}` : 'Included in options'}
                  </td>
                  <td>
                    ${
                      product.options.length > 0
                        ? product.options
                            .map(
                              (option) =>
                                `<strong>${option.groupName}:</strong> ${option.name} ${parseFloat(option.price.toString()) > 0 ? `(+$${parseFloat(option.price.toString()).toLocaleString()})` : ''}`,
                            )
                            .join('<br>')
                        : '<em>No options selected</em>'
                    }
                  </td>
                  <td><strong>$${product.totalPrice.toLocaleString()}</strong></td>
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
            ${
              quoteData.discount && quoteData.discount.value > 0
                ? `
            <div class="pricing-row" style="color: #7c3aed;">
              <span>
                Discount${quoteData.discount.valueType === 'PERCENTAGE' ? ` (${quoteData.discount.value}%)` : ''}
                ${quoteData.discount.description ? `<br><small style="color: #6b7280;">${quoteData.discount.description}</small>` : ''}
              </span>
              <span>-$${(quoteData.discount.valueType === 'PERCENTAGE'
                ? ((quoteData.pricing.subtotal + quoteData.pricing.shipping) *
                    quoteData.discount.value) /
                  100
                : quoteData.discount.value
              ).toLocaleString()}</span>
            </div>`
                : ''
            }
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
