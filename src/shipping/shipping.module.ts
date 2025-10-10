import { Module } from '@nestjs/common';
import { ShippingService } from './shipping.service';
import { ShippingController } from './shipping.controller';
import { FreightosService } from './freightos.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [ShippingService, FreightosService],
  controllers: [ShippingController],
  exports: [ShippingService, FreightosService],
})
export class ShippingModule {}
