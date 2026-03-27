import {
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  @Get('*')
  serveFile(@Req() req: any, @Res() res: Response) {
    const relativePath: string = req.params[0] ?? '';

    if (relativePath.includes('..')) {
      throw new ForbiddenException('Invalid path');
    }

    const absolutePath = path.join(process.cwd(), 'uploads', relativePath);

    if (!fs.existsSync(absolutePath)) {
      throw new NotFoundException('File not found');
    }

    const ext = path.extname(absolutePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
    };
    const contentType = mimeTypes[ext] ?? 'application/octet-stream';

    res.setHeader('Content-Type', contentType);
    fs.createReadStream(absolutePath).pipe(res);
  }
}
