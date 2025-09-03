import { Module } from '@nestjs/common';
import { QuotesService } from './quotes.service';
import { QuotesController } from './quotes.controller';
import { DatabaseModule } from 'src/database/database.module';
import { EmailModule } from 'src/email/email.module';
import { PdfModule } from 'src/pdf/pdf.module';

@Module({
  imports: [DatabaseModule, EmailModule, PdfModule],
  providers: [QuotesService],
  controllers: [QuotesController],
})
export class QuotesModule {}
