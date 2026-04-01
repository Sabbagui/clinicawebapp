import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { IncomeCategoriesService } from './income-categories.service';
import { CreateIncomeCategoryDto } from './dto/create-income-category.dto';
import { UpdateIncomeCategoryDto } from './dto/update-income-category.dto';

@ApiTags('Income Categories')
@Controller('income-categories')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class IncomeCategoriesController {
  constructor(private readonly service: IncomeCategoriesService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.DOCTOR, UserRole.NURSE)
  @ApiOperation({ summary: 'Listar categorias de receita' })
  @ApiQuery({ name: 'onlyActive', required: false, type: Boolean })
  findAll(@Query('onlyActive') onlyActive?: string) {
    return this.service.findAll(onlyActive === 'true');
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Criar nova categoria de receita' })
  create(@Body() dto: CreateIncomeCategoryDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Atualizar categoria de receita' })
  update(@Param('id') id: string, @Body() dto: UpdateIncomeCategoryDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Remover categoria de receita (somente se sem receitas)' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
