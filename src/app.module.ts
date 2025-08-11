import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { ConfigModule } from '@nestjs/config';
import { CustomersModule } from './customers/customers.module';
import { UserModule } from './users/user.module';
import { QuotesModule } from './quotes/quotes.module';
import { ProductsModule } from './products/products.module';
import { OptionsModule } from './options/options.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    UserModule,
    CustomersModule,
    QuotesModule,
    ProductsModule,
    OptionsModule,
  ],
})
export class AppModule {}
