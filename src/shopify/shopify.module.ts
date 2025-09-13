import { Module } from '@nestjs/common';
import { ShopifyService } from './shopify.service';
import { ShopifyController } from './shopify.controller';
import { ShopifyMappingService } from './shopify-mapping.service';
import { ShopifyMappingController } from './shopify-mapping.controller';
import { ShopifyVariantMatcherService } from './shopify-variant-matcher.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ShopifyController, ShopifyMappingController],
  providers: [
    ShopifyService,
    ShopifyMappingService,
    ShopifyVariantMatcherService,
  ],
  exports: [
    ShopifyService,
    ShopifyMappingService,
    ShopifyVariantMatcherService,
  ],
})
export class ShopifyModule {}
