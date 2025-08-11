import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Res,
  NotFoundException,
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

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.quotesService.findQuoteById(Number(id));
  }

  // @Get(':id/pdf')
  // async getQuotePdf(@Param('id') id: string, @Res() res: Response) {
  //   try {
  //     const pdfBuffer = await this.quotesService.generateQuotePdf(Number(id));

  //     res.set({
  //       'Content-Type': 'application/pdf',
  //       'Content-Length': pdfBuffer.length,
  //       'Content-Disposition': `attachment; filename="quote-${id}.pdf"`,
  //     });
  //     res.end(pdfBuffer);
  //   } catch (error) {
  //     if (error instanceof NotFoundException) {
  //       res.status(404).send({ message: error.message });
  //     } else {
  //       res.status(500).send({ message: 'Failed to generate PDF.' });
  //     }
  //   }
  // }
}
