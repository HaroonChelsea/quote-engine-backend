import {
  Controller,
  Get,
  Param,
  Query,
  Post,
  Body,
  Patch,
  Delete,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { FindProductsDto } from './dto/find-products.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @Post(':id/link-options')
  linkOptions(@Param('id') id: string, @Body('optionIds') optionIds: number[]) {
    return this.productsService.linkOptionsToProduct(Number(id), optionIds);
  }

  @Get()
  findAll(@Query() query: FindProductsDto) {
    return this.productsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(Number(id));
  }

  @Get(':id/dimensions/:type')
  getProductDimensions(@Param('id') id: string, @Param('type') type: string) {
    return this.productsService.getProductDimensionsByType(Number(id), type);
  }

  @Post(':id/dimensions')
  createProductDimension(@Param('id') id: string, @Body() dimensionData: any) {
    return this.productsService.createProductDimension(Number(id), dimensionData);
  }

  @Patch(':id/dimensions/:dimensionId')
  updateProductDimension(
    @Param('id') id: string,
    @Param('dimensionId') dimensionId: string,
    @Body() dimensionData: any
  ) {
    return this.productsService.updateProductDimension(Number(id), Number(dimensionId), dimensionData);
  }

  @Delete(':id/dimensions/:dimensionId')
  deleteProductDimension(@Param('id') id: string, @Param('dimensionId') dimensionId: string) {
    return this.productsService.deleteProductDimension(Number(id), Number(dimensionId));
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productsService.update(Number(id), updateProductDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productsService.remove(Number(id));
  }
}
