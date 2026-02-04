import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';

@Injectable()
export class MinioService {
  private client: Minio.Client;
  private bucketName: string;

  constructor(private configService: ConfigService) {
    this.client = new Minio.Client({
      endPoint: this.configService.get<string>('MINIO_ENDPOINT', ''),
      port: +this.configService.get<number>('MINIO_PORT', 9000),
      useSSL: true,
      accessKey: this.configService.get<string>('MINIO_ACCESS_KEY', ''),
      secretKey: this.configService.get<string>('MINIO_SECRET_KEY', ''),
      region: this.configService.get<string>('MINIO_REGION', ''),
    });
    this.bucketName = this.configService.get<string>('MINIO_BUCKET_NAME', '');
  }

  async upload(file: Express.Multer.File, folder: string): Promise<string> {
    const fileName = `${folder}/${Date.now()}-${file.originalname}`;

    await this.client.putObject(
      this.bucketName,
      fileName,
      file.buffer,
      file.size,
      { 'Content-Type': file.mimetype },
    );

    return fileName;
  }

  async getPresignedUrl(fileName: string, expiry: number = 3600): Promise<string> {
    return await this.client.presignedGetObject(this.bucketName, fileName, expiry);
  }

  async delete(fileName: string): Promise<void> {
    await this.client.removeObject(this.bucketName, fileName);
  }
}
