import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { UploadService } from './upload.service.js';
import { AuthorizeUploadDto } from './dto/authorize-upload.dto.js';

@ApiTags('Upload')
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  /**
   * Request a pre-signed S3 URL so the browser can PUT the file directly.
   * The client must be authenticated.
   */
  @Post('authorize')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a pre-signed S3 upload URL' })
  authorize(@Body() dto: AuthorizeUploadDto) {
    return this.uploadService.authorize(dto);
  }
}
