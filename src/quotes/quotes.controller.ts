import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Res,
  Patch,
  Delete,
  NotFoundException,
  ParseIntPipe,
} from '@nestjs/common';
import { QuotesService } from './quotes.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import type { Response } from 'express';

@Controller('quotes')
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Post()
  create(@Body() createQuoteDto: CreateQuoteDto) {
    return this.quotesService.createQuote(createQuoteDto);
  }

  @Get()
  findAll() {
    return this.quotesService.findAllQuotes();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.quotesService.findQuoteById(Number(id));
  }

  @Get(':id/pdf')
  async getQuotePdf(@Param('id') id: string, @Res() res: Response) {
    try {
      const pdfData = await this.quotesService.generateQuotePdfData(Number(id));
      const pdfBuffer =
        await this.quotesService['pdfService'].generateQuotePdf(pdfData);

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Length': pdfBuffer.length,
        'Content-Disposition': `attachment; filename="quote-${id}.pdf"`,
      });
      res.end(pdfBuffer);
    } catch (error) {
      if (error instanceof NotFoundException) {
        res.status(404).send({ message: error.message });
      } else {
        res.status(500).send({ message: 'Failed to generate PDF.' });
      }
    }
  }

  @Patch(':id/status')
  async updateQuoteStatus(
    @Param('id') id: string,
    @Body() body: { status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'INVOICED' },
  ) {
    return this.quotesService.updateQuoteStatus(Number(id), body.status);
  }

  @Post(':id/send-email')
  async sendQuoteEmail(
    @Param('id') id: string,
    @Body() body: { subject: string; message: string },
  ) {
    return this.quotesService.sendQuoteEmail(Number(id), body);
  }

  @Delete(':id')
  async deleteQuote(@Param('id') id: string) {
    return this.quotesService.deleteQuote(Number(id));
  }

  @Post('test-email')
  async testEmail(
    @Body() body: { to: string; subject?: string; message?: string },
  ) {
    return this.quotesService.testEmailConnection(
      body.to,
      body.subject,
      body.message,
    );
  }

  @Post(':id/sync-shopify')
  async syncQuoteWithShopify(@Param('id', ParseIntPipe) id: number) {
    try {
      const success = await this.quotesService.syncQuoteWithShopify(id);
      return {
        success,
        message: success
          ? 'Quote successfully synced with Shopify'
          : 'Failed to sync quote with Shopify',
      };
    } catch (error) {
      return {
        success: false,
        message: `Error syncing quote: ${error.message}`,
      };
    }
  }
}
