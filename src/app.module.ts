import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { ConfigModule } from '@nestjs/config';
import { CustomersModule } from './customers/customers.module';
import { UserModule } from './users/user.module';
import { QuotesModule } from './quotes/quotes.module';
import { ProductsModule } from './products/products.module';
import { OptionsModule } from './options/options.module';
import { EmailModule } from './email/email.module';
import { ShopifyModule } from './shopify/shopify.module';
import { ShippingModule } from './shipping/shipping.module';

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
    EmailModule,
    ShopifyModule,
    ShippingModule,
  ],
})
export class AppModule {}
