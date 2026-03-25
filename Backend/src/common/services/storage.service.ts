import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private s3: S3Client;
  private bucket: string;
  private cdnUrl: string;

  private configured: boolean;

  constructor(private config: ConfigService) {
    const key = this.config.get<string>('DO_SPACES_KEY') || '';
    const secret = this.config.get<string>('DO_SPACES_SECRET') || '';
    const endpoint = this.config.get<string>('DO_SPACES_ENDPOINT');
    const region = endpoint?.split('.')[0]?.replace('https://', '') || 'nyc3';

    this.configured = !!(key && key !== 'your_do_spaces_key' && secret && secret !== 'your_do_spaces_secret');

    this.s3 = new S3Client({
      endpoint,
      region,
      credentials: { accessKeyId: key, secretAccessKey: secret },
      forcePathStyle: false,
    });

    this.bucket = this.config.get<string>('DO_SPACES_BUCKET') || '';
    this.cdnUrl = this.config.get<string>('DO_SPACES_CDN_URL') || '';

    if (!this.configured) {
      this.logger.warn('DO_SPACES no configurado — las imágenes no se subirán (modo dev)');
    }
  }

  /**
   * Sube un archivo y devuelve la URL pública
   * @param key  ruta dentro del bucket  ej: tenants/tid/products/pid.jpg
   * @param buffer contenido del archivo
   * @param mimeType content-type del archivo
   */
  async upload(key: string, buffer: Buffer, mimeType: string): Promise<string | null> {
    if (!this.configured) {
      this.logger.warn(`upload omitido (sin credenciales): ${key}`);
      return null;
    }
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        ACL: 'public-read' as any,
      }),
    );

    const base = this.cdnUrl || `https://${this.bucket}.${this.config.get('DO_SPACES_ENDPOINT')?.replace('https://', '')}`;
    return `${base}/${key}`;
  }

  /** Elimina un objeto del bucket */
  async delete(key: string): Promise<void> {
    try {
      await this.s3.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
      );
    } catch (err) {
      this.logger.warn(`No se pudo eliminar ${key}: ${err.message}`);
    }
  }

  /** Extrae el key del bucket a partir de una URL pública */
  keyFromUrl(url: string): string | null {
    if (!url) return null;
    const base = this.cdnUrl || '';
    if (base && url.startsWith(base)) {
      return url.slice(base.length + 1); // +1 por el "/"
    }
    // Fallback: extraer todo después del bucket en la URL
    const match = url.match(/\/tenants\/.+/);
    return match ? match[0].slice(1) : null;
  }
}
