import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private storageDir: string;

  constructor() {
    // DO NOT interact with FS in constructor
    this.storageDir = process.env.VERCEL ? path.join(os.tmpdir(), 'backups') : path.join(process.cwd(), 'backups');
  }

  async onModuleInit() {
    try {
      await fs.promises.mkdir(this.storageDir, { recursive: true });
      this.logger.log(`Storage directory initialized at ${this.storageDir}`);
    } catch (e) {
      this.logger.warn(`Could not initialize storage directory: ${(e as Error).message}`);
      // Graceful degradation: do not crash
    }
  }

  getFilePath(fileName: string): string {
    return path.join(this.storageDir, fileName);
  }

  createWriteStream(fileName: string): fs.WriteStream {
    const filePath = this.getFilePath(fileName);
    return fs.createWriteStream(filePath);
  }

  async fileExists(fileName: string): Promise<boolean> {
    const filePath = this.getFilePath(fileName);
    try {
      await fs.promises.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async getFileBuffer(fileName: string): Promise<Buffer> {
    const filePath = this.getFilePath(fileName);
    return fs.promises.readFile(filePath);
  }

  async getFileSize(fileName: string): Promise<number> {
    const filePath = this.getFilePath(fileName);
    const stats = await fs.promises.stat(filePath);
    return stats.size;
  }

  async calculateChecksum(fileName: string): Promise<string> {
    const buffer = await this.getFileBuffer(fileName);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(buffer);
    return hashSum.digest('hex');
  }
}
