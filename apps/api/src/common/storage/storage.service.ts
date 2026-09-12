import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { extname } from 'path';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private s3: S3Client | null = null;
  private bucket = '';
  private publicUrl = '';

  constructor(private config: ConfigService) {}

  // Resolved lazily (not in the constructor) so the app can boot and serve
  // every other feature even when R2 isn't configured yet — only an actual
  // upload/delete call fails until CLOUDFLARE_R2_*/R2_PUBLIC_URL are set.
  private getClient(): S3Client {
    if (!this.s3) {
      const accountId = this.config.getOrThrow<string>('CLOUDFLARE_R2_ACCOUNT_ID');
      this.bucket = this.config.getOrThrow<string>('CLOUDFLARE_R2_BUCKET');
      this.publicUrl = this.config.getOrThrow<string>('R2_PUBLIC_URL').replace(/\/$/, '');

      this.s3 = new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: this.config.getOrThrow<string>('CLOUDFLARE_R2_ACCESS_KEY_ID'),
          secretAccessKey: this.config.getOrThrow<string>('CLOUDFLARE_R2_SECRET_ACCESS_KEY'),
        },
      });
    }
    return this.s3;
  }

  async upload(file: Express.Multer.File, folder = 'uploads'): Promise<string> {
    const client = this.getClient();
    const ext = extname(file.originalname).toLowerCase() || '';
    const year = new Date().getFullYear();
    const key = `${folder}/${year}/${randomUUID()}${ext}`;

    await client.send(new PutObjectCommand({
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
      const client = this.getClient();
      if (!fileUrl || !fileUrl.startsWith(this.publicUrl)) return;
      const key = fileUrl.slice(this.publicUrl.length + 1);
      if (!key) return;
      await client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
    } catch (err) {
      this.logger.warn(`Failed to delete R2 object for URL ${fileUrl}: ${err}`);
    }
  }
}
