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

    // Test the connection on startup
    this.verifyConnection();
  }

  private async verifyConnection() {
    try {
      await this.transporter.verify();
      console.log('✅ Email service connection verified successfully');
    } catch (error) {
      console.error('❌ Email service connection failed:', error.message);
      console.error(
        'Please check your email credentials in the environment variables',
      );
    }
  }

  async sendQuoteEmail(
    to: string,
    subject: string,
    message: string,
    pdfBuffer?: Buffer,
  ) {
    // Validate email address
    if (!to || !to.includes('@')) {
      throw new Error('Invalid email address');
    }

    const mailOptions = {
      from: {
        name: 'Thinktanks Sales Team',
        address: this.configService.get('EMAIL_USER'),
      },
      to,
      subject,
      html: message,
      attachments: pdfBuffer
        ? [
            {
              filename: `quote-${Date.now()}.pdf`,
              content: pdfBuffer,
              contentType: 'application/pdf',
            },
          ]
        : [],
    };

    try {
      console.log(`📧 Sending email to: ${to}`);
      console.log(`📧 Subject: ${subject}`);
      console.log(`📧 PDF attached: ${pdfBuffer ? 'Yes' : 'No'}`);

      const result = await this.transporter.sendMail(mailOptions);

      console.log('✅ Email sent successfully:', result.messageId);
      console.log('✅ Response:', result.response);

      return {
        success: true,
        messageId: result.messageId,
        response: result.response,
        accepted: result.accepted,
        rejected: result.rejected,
      };
    } catch (error) {
      console.error('❌ Failed to send email:', error);
      console.error('❌ Error details:', {
        code: error.code,
        command: error.command,
        response: error.response,
      });

      // Provide more specific error messages
      let errorMessage = 'Failed to send email';
      if (error.code === 'EAUTH') {
        errorMessage =
          'Email authentication failed. Please check your email credentials.';
      } else if (error.code === 'ECONNECTION') {
        errorMessage =
          'Failed to connect to email server. Please check your internet connection.';
      } else if (error.code === 'ETIMEDOUT') {
        errorMessage = 'Email sending timed out. Please try again.';
      } else if (error.response) {
        errorMessage = `Email server error: ${error.response}`;
      }

      throw new Error(errorMessage);
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
