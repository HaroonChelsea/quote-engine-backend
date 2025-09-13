import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { ProductOptionsController } from './product-options.controller';
import { DatabaseModule } from '../database/database.module';
import { ShopifyModule } from '../shopify/shopify.module';

@Module({
  imports: [DatabaseModule, ShopifyModule],
  controllers: [ProductsController, ProductOptionsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
