import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { extname } from 'path';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(private config: ConfigService) {
    const accountId = config.getOrThrow<string>('CLOUDFLARE_R2_ACCOUNT_ID');
    this.bucket = config.getOrThrow<string>('CLOUDFLARE_R2_BUCKET');
    this.publicUrl = config.getOrThrow<string>('R2_PUBLIC_URL').replace(/\/$/, '');

    this.s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.getOrThrow<string>('CLOUDFLARE_R2_ACCESS_KEY_ID'),
        secretAccessKey: config.getOrThrow<string>('CLOUDFLARE_R2_SECRET_ACCESS_KEY'),
      },
    });
  }

  async upload(file: Express.Multer.File, folder = 'uploads'): Promise<string> {
    const ext = extname(file.originalname).toLowerCase() || '';
    const year = new Date().getFullYear();
    const key = `${folder}/${year}/${randomUUID()}${ext}`;

    await this.s3.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      ContentLength: file.size,
    }));

    return `${this.publicUrl}/${key}`;
  }

  async delete(fileUrl: string): Promise<void> {
    try {
      if (!fileUrl || !fileUrl.startsWith(this.publicUrl)) return;
      const key = fileUrl.slice(this.publicUrl.length + 1);
      if (!key) return;
      await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
    } catch (err) {
      this.logger.warn(`Failed to delete R2 object for URL ${fileUrl}: ${err}`);
    }
  }
}
