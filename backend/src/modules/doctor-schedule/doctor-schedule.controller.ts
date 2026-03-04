import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateBlockedSlotDto } from './dto/create-blocked-slot.dto';
import { UpsertWeeklyScheduleDto } from './dto/upsert-weekly-schedule.dto';
import { DoctorScheduleService } from './doctor-schedule.service';

@ApiTags('Doctor Schedule')
@Controller('doctor-schedule')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class DoctorScheduleController {
  constructor(private readonly doctorScheduleService: DoctorScheduleService) {}

  @Get(':doctorId')
  @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.RECEPTIONIST, UserRole.NURSE)
  @ApiOperation({ summary: 'Buscar agenda semanal do medico' })
  @ApiResponse({ status: 200, description: 'Agenda semanal' })
  getWeeklySchedule(@Param('doctorId') doctorId: string) {
    return this.doctorScheduleService.getWeeklySchedule(doctorId);
  }

  @Put(':doctorId')
  @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  @ApiOperation({ summary: 'Atualizar agenda semanal completa (7 dias)' })
  @ApiResponse({ status: 200, description: 'Agenda atualizada' })
  upsertWeeklySchedule(
    @Param('doctorId') doctorId: string,
    @Body() dto: UpsertWeeklyScheduleDto,
    @Request() req,
  ) {
    if (req.user.role === UserRole.DOCTOR && req.user.id !== doctorId) {
      throw new ForbiddenException('Sem permissao para atualizar agenda de outro medico.');
    }
    return this.doctorScheduleService.upsertWeeklySchedule(doctorId, dto);
  }

  @Post('blocked-slots')
  @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  @ApiOperation({ summary: 'Criar bloqueio de agenda do medico' })
  @ApiResponse({ status: 201, description: 'Bloqueio criado' })
  createBlockedSlot(@Body() dto: CreateBlockedSlotDto, @Request() req) {
    if (req.user.role === UserRole.DOCTOR && req.user.id !== dto.doctorId) {
      throw new ForbiddenException('Sem permissao para criar bloqueio para outro medico.');
    }
    return this.doctorScheduleService.createBlockedSlot(dto);
  }

  @Delete('blocked-slots/:id')
  @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  @ApiOperation({ summary: 'Remover bloqueio de agenda' })
  @ApiResponse({ status: 200, description: 'Bloqueio removido' })
  deleteBlockedSlot(@Param('id') id: string) {
    return this.doctorScheduleService.deleteBlockedSlot(id);
  }
}
