import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { getRequestAuditMeta } from '@/common/audit/request-audit-meta';
import { PrescriptionsService } from './prescriptions.service';
import { IssuePrescriptionDto } from './dto/issue-prescription.dto';

@ApiTags('Prescriptions')
@Controller('prescriptions')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PrescriptionsController {
  constructor(private readonly prescriptionsService: PrescriptionsService) {}

  @Post()
  @Roles(UserRole.DOCTOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Emite uma receita médica assinada digitalmente' })
  async issue(@Body() dto: IssuePrescriptionDto, @Request() req) {
    const { ip, userAgent } = getRequestAuditMeta(req);
    return this.prescriptionsService.issuePrescription(dto, req.user, ip, userAgent);
  }

  @Get('medical-record/:medicalRecordId')
  @Roles(UserRole.DOCTOR, UserRole.NURSE, UserRole.ADMIN)
  @ApiOperation({ summary: 'Lista receitas emitidas de um prontuário' })
  findByMedicalRecord(@Param('medicalRecordId') medicalRecordId: string, @Request() req) {
    return this.prescriptionsService.findByMedicalRecord(medicalRecordId, req.user);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Faz download do PDF da receita' })
  async download(@Param('id') id: string, @Request() req, @Res() res: Response) {
    const { buffer, filename } = await this.prescriptionsService.getPdfBuffer(id, req.user);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }
}
