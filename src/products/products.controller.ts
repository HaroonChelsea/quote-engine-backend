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
import { LinkOptionsDto } from './dto/link-options.dto';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.createProduct({
      title: createProductDto.title,
      description: createProductDto.description,
      basePrice: createProductDto.basePrice.toString(),
      unitPrice: createProductDto.unitPrice,
      imageUrl: createProductDto.imageUrl,
      weightKg: createProductDto.weightKg?.toString(),
      lengthCm: createProductDto.lengthCm?.toString(),
      widthCm: createProductDto.widthCm?.toString(),
      heightCm: createProductDto.heightCm?.toString(),
      volumeCbm: createProductDto.volumeCbm?.toString(),
      shopifyId: createProductDto.shopifyId,
    });
  }

  @Get()
  findAll(@Query() query: FindProductsDto) {
    return this.productsService.getAllProducts(query.shopifyId);
  }

  @Get('option-groups')
  getAllProductOptionGroups() {
    return this.productsService.getAllProductOptionGroups();
  }

  @Get('with-option-counts')
  getProductsWithOptionCounts() {
    return this.productsService.getProductsWithOptionCounts();
  }

  @Post('cleanup-duplicate-options')
  cleanupDuplicateOptions() {
    return this.productsService.cleanupDuplicateOptions();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.getProductById(Number(id));
  }

  @Get(':id/dimensions')
  getProductDimensions(@Param('id') id: string) {
    return this.productsService.getProductDimensions(Number(id));
  }

  @Post(':id/dimensions')
  createProductDimension(@Param('id') id: string, @Body() dimensionData: any) {
    return this.productsService.createProductDimension({
      productId: Number(id),
      ...dimensionData,
    });
  }

  @Patch(':id/dimensions/:dimensionId')
  updateProductDimension(
    @Param('id') id: string,
    @Param('dimensionId') dimensionId: string,
    @Body() dimensionData: any,
  ) {
    return this.productsService.updateProductDimension(
      Number(dimensionId),
      dimensionData,
    );
  }

  @Delete(':id/dimensions/:dimensionId')
  deleteProductDimension(
    @Param('id') id: string,
    @Param('dimensionId') dimensionId: string,
  ) {
    return this.productsService.deleteProductDimension(Number(dimensionId));
  }

  @Post(':id/link-options')
  linkOptions(@Param('id') id: string, @Body() linkOptionsDto: LinkOptionsDto) {
    return this.productsService.linkOptions(
      Number(id),
      linkOptionsDto.optionIds,
    );
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productsService.updateProduct(Number(id), {
      title: updateProductDto.title,
      description: updateProductDto.description,
      basePrice: updateProductDto.basePrice,
      unitPrice: updateProductDto.unitPrice,
    });
  }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.productsService.remove(Number(id));
  // }
}
