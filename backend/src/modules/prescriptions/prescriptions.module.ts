import { Module } from '@nestjs/common';
import { PrescriptionsController } from './prescriptions.controller';
import { PrescriptionsService } from './prescriptions.service';
import { CertificateService } from './certificate.service';
import { PdfBuilderService } from './pdf-builder.service';

@Module({
  controllers: [PrescriptionsController],
  providers: [PrescriptionsService, CertificateService, PdfBuilderService],
  exports: [CertificateService],
})
export class PrescriptionsModule {}
