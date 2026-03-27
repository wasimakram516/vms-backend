import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, Matches } from 'class-validator';

export class AuthorizeUploadDto {
  @ApiProperty({ example: 'profile-photo.jpg' })
  @IsString()
  @MaxLength(255)
  fileName: string;

  @ApiProperty({ example: 'image/jpeg' })
  @IsString()
  @Matches(/^[\w.+-]+\/[\w.+-]+$/, { message: 'fileType must be a valid MIME type' })
  fileType: string;
}
