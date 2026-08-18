import { AvatarResponse } from '@app/contracts/auth/interfaces/avatar-response.interface';
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';

@Injectable()
export class StorageService {
  private readonly s3Client = new S3Client({
    endpoint: process.env.MINIO_ENDPOINT,
    region: 'us-east-1',
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.MINIO_ACCESS_KEY!,
      secretAccessKey: process.env.MINIO_SECRET_KEY!,
    },
  });

  async upload(
    bucket: string,
    key: string,
    buffer: Buffer,
    mimetype: string,
  ): Promise<AvatarResponse> {
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: mimetype,
      }),
    );

    const avatarUrl = this.getSignedUrl(bucket, key);
    return { avatarUrl };
  }

  async delete(bucket: string, key: string): Promise<void> {
    await this.s3Client.send(
      new DeleteObjectCommand({ Bucket: bucket, Key: key }),
    );
  }

  getSignedUrl(bucket: string, key: string): string {
    return `${process.env.MINIO_ENDPOINT}/${bucket}/${key}`;
  }
}
