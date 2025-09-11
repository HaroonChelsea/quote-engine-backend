import { Module } from '@nestjs/common';
import { QuotesService } from './quotes.service';
import { QuotesController } from './quotes.controller';
import { DatabaseModule } from 'src/database/database.module';
import { EmailModule } from 'src/email/email.module';
import { PdfModule } from 'src/pdf/pdf.module';
import { ShopifyModule } from 'src/shopify/shopify.module';

@Module({
  imports: [DatabaseModule, EmailModule, PdfModule, ShopifyModule],
  providers: [QuotesService],
  controllers: [QuotesController],
})
export class QuotesModule {}
