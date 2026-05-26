import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Res, StreamableFile, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../users/user-role.enum';
import { CreateGlassCategoryDto } from './dto/create-glass-category.dto';
import { CreateGlassProductDto } from './dto/create-glass-product.dto';
import { ListGlassProductsDto } from './dto/list-glass-products.dto';
import { UpdateGlassCategoryDto } from './dto/update-glass-category.dto';
import { UpdateGlassProductDto } from './dto/update-glass-product.dto';
import { GlassCatalogService } from './glass-catalog.service';

// VI: Controller catalog kinh gom endpoint public active va endpoint admin CRUD duoc bao ve role.
@Controller()
export class GlassCatalogController {
  constructor(private readonly glassCatalogService: GlassCatalogService) {}

  @Get('glass-categories')
  listActiveCategories() {
    return this.glassCatalogService.listActiveCategories();
  }

  @Get('glass-products')
  listActiveProducts(@Query() query: ListGlassProductsDto) {
    return this.glassCatalogService.listActiveProducts(query);
  }

  @Get('catalog-assets/:fileName')
  // VI: Texture catalog la tai nguyen public rieng, khong mo quyen doc anh project dang bao ve.
  async getCatalogAsset(@Param('fileName') fileName: string, @Res({ passthrough: true }) response: Response): Promise<StreamableFile> {
    const file = await this.glassCatalogService.getCatalogAsset(fileName);
    response.setHeader('Content-Type', file.contentType);
    response.setHeader('Cache-Control', 'public, max-age=3600');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    return new StreamableFile(file.buffer);
  }

  @Get('admin/glass-categories')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  listCategories() {
    return this.glassCatalogService.listCategories();
  }

  @Post('admin/glass-categories')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  createCategory(@Body() dto: CreateGlassCategoryDto) {
    return this.glassCatalogService.createCategory(dto);
  }

  @Patch('admin/glass-categories/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  updateCategory(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateGlassCategoryDto) {
    return this.glassCatalogService.updateCategory(id, dto);
  }

  @Delete('admin/glass-categories/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  deleteCategory(@Param('id', ParseIntPipe) id: number) {
    return this.glassCatalogService.deleteCategory(id);
  }

  @Get('admin/glass-products')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  listProducts(@Query() query: ListGlassProductsDto) {
    return this.glassCatalogService.listProducts(query);
  }

  @Post('admin/glass-products')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  createProduct(@Body() dto: CreateGlassProductDto) {
    return this.glassCatalogService.createProduct(dto);
  }

  @Patch('admin/glass-products/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  updateProduct(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateGlassProductDto) {
    return this.glassCatalogService.updateProduct(id, dto);
  }

  @Delete('admin/glass-products/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  deleteProduct(@Param('id', ParseIntPipe) id: number) {
    return this.glassCatalogService.deleteProduct(id);
  }
}
