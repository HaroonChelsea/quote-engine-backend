import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    // Create transporter for development (using Gmail or other SMTP)
    this.transporter = nodemailer.createTransport({
      service: 'gmail', // or 'outlook', 'yahoo', etc.
      auth: {
        user: this.configService.get('EMAIL_USER'),
        pass: this.configService.get('EMAIL_PASSWORD'), // Use app password for Gmail
      },
    });
  }

  async sendQuoteEmail(
    to: string,
    subject: string,
    message: string,
    pdfBuffer?: Buffer,
  ) {
    const mailOptions = {
      from: this.configService.get('EMAIL_USER'),
      to,
      subject,
      html: message,
      attachments: pdfBuffer
        ? [
            {
              filename: 'quote.pdf',
              content: pdfBuffer,
              contentType: 'application/pdf',
            },
          ]
        : [],
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Failed to send email:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  // For development/testing without real email
  async sendMockEmail(
    to: string,
    subject: string,
    message: string,
    pdfBuffer?: Buffer,
  ) {
    console.log('📧 Mock Email Sent:');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('Message:', message);
    console.log('PDF attached:', pdfBuffer ? 'Yes' : 'No');

    return { success: true, messageId: 'mock-' + Date.now() };
  }
}
