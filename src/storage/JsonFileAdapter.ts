import * as fs from 'fs';
import * as path from 'path';
import {
  BaseStorageAdapter,
  StorageReadOptions,
  StorageWriteOptions,
  StorageDeleteOptions
} from './StorageAdapter';
import { StorageError, ConfigCorruptedError } from '../errors';

export interface JsonFileAdapterOptions {
  baseDir: string;
  fileExtension?: string;
  prettyPrint?: boolean;
}

export class JsonFileAdapter extends BaseStorageAdapter {
  public readonly name = 'json-file';

  private readonly baseDir: string;
  private readonly fileExtension: string;
  private readonly prettyPrint: boolean;
  private initialized = false;

  constructor(options: JsonFileAdapterOptions) {
    super();
    this.baseDir = options.baseDir;
    this.fileExtension = options.fileExtension || '.json';
    this.prettyPrint = options.prettyPrint ?? true;
  }

  initialize(): void {
    if (this.initialized) {
      return;
    }

    try {
      if (!fs.existsSync(this.baseDir)) {
        fs.mkdirSync(this.baseDir, { recursive: true });
      }
      this.initialized = true;
    } catch (error: any) {
      throw new StorageError('initialize', error.message);
    }
  }

  read<T = unknown>(key: string, options: StorageReadOptions = {}): T {
    this.ensureInitialized();

    const filePath = this.getKeyPath(key);

    try {
      if (!fs.existsSync(filePath)) {
        if (options.defaultValue !== undefined) {
          return options.defaultValue as T;
        }
        throw new StorageError('read', `File not found: ${filePath}`);
      }

      const content = fs.readFileSync(filePath, 'utf-8');

      try {
        return JSON.parse(content) as T;
      } catch (parseError: any) {
        throw new ConfigCorruptedError(filePath, parseError.message);
      }
    } catch (error) {
      if (error instanceof ConfigCorruptedError || error instanceof StorageError) {
        throw error;
      }
      throw new StorageError('read', (error as Error).message);
    }
  }

  write<T = unknown>(key: string, data: T, options: StorageWriteOptions = {}): void {
    this.ensureInitialized();

    const filePath = this.getKeyPath(key);
    const { createIfNotExists = true, overwrite = true } = options;

    try {
      const exists = fs.existsSync(filePath);

      if (exists && !overwrite) {
        throw new StorageError(
          'write',
          `File already exists and overwrite is disabled: ${filePath}`
        );
      }

      if (!exists && !createIfNotExists) {
        throw new StorageError(
          'write',
          `File not found and createIfNotExists is disabled: ${filePath}`
        );
      }

      const content = this.prettyPrint ? JSON.stringify(data, null, 2) : JSON.stringify(data);

      fs.writeFileSync(filePath, content, 'utf-8');
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      throw new StorageError('write', (error as Error).message);
    }
  }

  delete(key: string, options: StorageDeleteOptions = {}): boolean {
    this.ensureInitialized();

    const filePath = this.getKeyPath(key);

    try {
      if (!fs.existsSync(filePath)) {
        return false;
      }

      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        if (options.recursive) {
          this.removeDirectoryRecursive(filePath);
        } else {
          throw new StorageError(
            'delete',
            `Path is a directory: ${filePath}. Use recursive option to delete.`
          );
        }
      } else {
        fs.unlinkSync(filePath);
      }

      return true;
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      throw new StorageError('delete', (error as Error).message);
    }
  }

  exists(key: string): boolean {
    this.ensureInitialized();
    const filePath = this.getKeyPath(key);
    return fs.existsSync(filePath);
  }

  listKeys(prefix?: string): string[] {
    this.ensureInitialized();

    try {
      const files = fs.readdirSync(this.baseDir);
      const keys = files
        .filter((f) => f.endsWith(this.fileExtension))
        .map((f) => f.slice(0, -this.fileExtension.length));

      if (prefix) {
        return keys.filter((k) => k.startsWith(prefix));
      }

      return keys;
    } catch (error) {
      throw new StorageError('listKeys', (error as Error).message);
    }
  }

  private getKeyPath(key: string): string {
    const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, '_');
    return path.join(this.baseDir, safeKey + this.fileExtension);
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new StorageError('operation', 'Adapter not initialized. Call initialize() first.');
    }
  }

  private removeDirectoryRecursive(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      return;
    }

    const files = fs.readdirSync(dirPath);
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        this.removeDirectoryRecursive(filePath);
      } else {
        fs.unlinkSync(filePath);
      }
    }

    fs.rmdirSync(dirPath);
  }

  getFilePath(key: string): string {
    return this.getKeyPath(key);
  }

  getBaseDir(): string {
    return this.baseDir;
  }

  copyFile(key: string, backupKey: string): boolean {
    this.ensureInitialized();

    const srcPath = this.getKeyPath(key);
    const destPath = this.getKeyPath(backupKey);

    try {
      if (!fs.existsSync(srcPath)) {
        return false;
      }
      fs.copyFileSync(srcPath, destPath);
      return true;
    } catch (error) {
      throw new StorageError('copyFile', (error as Error).message);
    }
  }
}
