import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Res, StreamableFile, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../users/user-role.enum';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/auth.types';
import { CreateGlassCategoryDto } from './dto/create-glass-category.dto';
import { CreateGlassMaterialTypeDto } from './dto/create-glass-material-type.dto';
import { CreateGlassProductDto } from './dto/create-glass-product.dto';
import { CreateGlassRenderPresetDto } from './dto/create-glass-render-preset.dto';
import { ListGlassProductsDto } from './dto/list-glass-products.dto';
import { UpdateGlassCategoryDto } from './dto/update-glass-category.dto';
import { UpdateGlassMaterialTypeDto } from './dto/update-glass-material-type.dto';
import { UpdateGlassProductDto } from './dto/update-glass-product.dto';
import { UpdateGlassRenderPresetDto } from './dto/update-glass-render-preset.dto';
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

  @Get('glass-material-types')
  listActiveMaterialTypes() {
    return this.glassCatalogService.listActiveMaterialTypes();
  }

  @Get('glass-render-presets')
  listActiveRenderPresets() {
    return this.glassCatalogService.listActiveRenderPresets();
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
  createCategory(@CurrentUser() user: JwtPayload, @Body() dto: CreateGlassCategoryDto) {
    return this.glassCatalogService.createCategory(user, dto);
  }

  @Patch('admin/glass-categories/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  updateCategory(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateGlassCategoryDto) {
    return this.glassCatalogService.updateCategory(user, id, dto);
  }

  @Delete('admin/glass-categories/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  deleteCategory(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.glassCatalogService.deleteCategory(user, id);
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
  createProduct(@CurrentUser() user: JwtPayload, @Body() dto: CreateGlassProductDto) {
    return this.glassCatalogService.createProduct(user, dto);
  }

  @Patch('admin/glass-products/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  updateProduct(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateGlassProductDto) {
    return this.glassCatalogService.updateProduct(user, id, dto);
  }

  @Delete('admin/glass-products/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  deleteProduct(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.glassCatalogService.deleteProduct(user, id);
  }

  @Get('admin/glass-material-types')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  listMaterialTypes() {
    return this.glassCatalogService.listMaterialTypes();
  }

  @Post('admin/glass-material-types')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  createMaterialType(@CurrentUser() user: JwtPayload, @Body() dto: CreateGlassMaterialTypeDto) {
    return this.glassCatalogService.createMaterialType(user, dto);
  }

  @Patch('admin/glass-material-types/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  updateMaterialType(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateGlassMaterialTypeDto) {
    return this.glassCatalogService.updateMaterialType(user, id, dto);
  }

  @Delete('admin/glass-material-types/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  deleteMaterialType(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.glassCatalogService.deleteMaterialType(user, id);
  }

  @Get('admin/glass-render-presets')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  listRenderPresets() {
    return this.glassCatalogService.listRenderPresets();
  }

  @Post('admin/glass-render-presets')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  createRenderPreset(@CurrentUser() user: JwtPayload, @Body() dto: CreateGlassRenderPresetDto) {
    return this.glassCatalogService.createRenderPreset(user, dto);
  }

  @Patch('admin/glass-render-presets/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  updateRenderPreset(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateGlassRenderPresetDto) {
    return this.glassCatalogService.updateRenderPreset(user, id, dto);
  }

  @Delete('admin/glass-render-presets/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  deleteRenderPreset(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.glassCatalogService.deleteRenderPreset(user, id);
  }
}
