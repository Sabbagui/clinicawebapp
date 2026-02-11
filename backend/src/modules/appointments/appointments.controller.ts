import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { UpdateAppointmentStatusDto } from './dto/update-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Appointments')
@Controller('appointments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new appointment' })
  create(@Body() dto: CreateAppointmentDto) {
    return this.appointmentsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get appointments by date range' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'doctorId', required: false })
  findAll(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('doctorId') doctorId?: string,
  ) {
    return this.appointmentsService.findAll(startDate, endDate, doctorId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get appointment by ID' })
  findOne(@Param('id') id: string) {
    return this.appointmentsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update appointment details' })
  update(@Param('id') id: string, @Body() dto: UpdateAppointmentDto) {
    return this.appointmentsService.update(id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update appointment status' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateAppointmentStatusDto) {
    return this.appointmentsService.updateStatus(id, dto.status);
  }
}
