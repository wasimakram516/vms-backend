import { Injectable } from '@nestjs/common';
import { createPresignedUpload } from '../common/s3.storage.js';
import { AuthorizeUploadDto } from './dto/authorize-upload.dto.js';

@Injectable()
export class UploadService {
  async authorize(dto: AuthorizeUploadDto) {
    return createPresignedUpload({
      fileName: dto.fileName,
      fileType: dto.fileType,
      inline: true,
    });
  }
}
