import {
  BaseStorageAdapter,
  StorageReadOptions,
  StorageWriteOptions,
  StorageDeleteOptions
} from './StorageAdapter';
import { StorageError, StorageNotInitializedError } from '../errors';

export interface SqliteAdapterOptions {
  dbPath: string;
  tableName?: string;
}

export class SqliteAdapter extends BaseStorageAdapter {
  public readonly name = 'sqlite';

  private readonly dbPath: string;
  private readonly tableName: string;
  private db: unknown | null = null;
  private initialized = false;

  constructor(options: SqliteAdapterOptions) {
    super();
    this.dbPath = options.dbPath;
    this.tableName = options.tableName || 'ctm_storage';
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      const sqlite3 = await this.loadSqlite3();
      this.db = new sqlite3.Database(this.dbPath);

      await this.execAsync(
        `CREATE TABLE IF NOT EXISTS ${this.tableName} (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at INTEGER NOT NULL
        )`
      );

      this.initialized = true;
    } catch (error: any) {
      throw new StorageError('initialize', error.message);
    }
  }

  async read<T = unknown>(key: string, options: StorageReadOptions = {}): Promise<T> {
    this.ensureInitialized();

    try {
      const row = await this.getAsync(`SELECT value FROM ${this.tableName} WHERE key = ?`, [key]);

      if (!row) {
        if (options.defaultValue !== undefined) {
          return options.defaultValue as T;
        }
        throw new StorageError('read', `Key not found: ${key}`);
      }

      return JSON.parse((row as any).value) as T;
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      throw new StorageError('read', (error as Error).message);
    }
  }

  async write<T = unknown>(key: string, data: T, options: StorageWriteOptions = {}): Promise<void> {
    this.ensureInitialized();

    const { createIfNotExists = true, overwrite = true } = options;

    try {
      const existing = await this.getAsync(`SELECT 1 FROM ${this.tableName} WHERE key = ?`, [key]);

      if (existing && !overwrite) {
        throw new StorageError('write', `Key already exists and overwrite is disabled: ${key}`);
      }

      if (!existing && !createIfNotExists) {
        throw new StorageError('write', `Key not found and createIfNotExists is disabled: ${key}`);
      }

      const value = JSON.stringify(data);
      const now = Date.now();

      if (existing) {
        await this.runAsync(
          `UPDATE ${this.tableName} SET value = ?, updated_at = ? WHERE key = ?`,
          [value, now, key]
        );
      } else {
        await this.runAsync(
          `INSERT INTO ${this.tableName} (key, value, updated_at) VALUES (?, ?, ?)`,
          [key, value, now]
        );
      }
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      throw new StorageError('write', (error as Error).message);
    }
  }

  async delete(key: string, _options: StorageDeleteOptions = {}): Promise<boolean> {
    this.ensureInitialized();

    try {
      const result = await this.runAsync(`DELETE FROM ${this.tableName} WHERE key = ?`, [key]);

      return (result as any).changes > 0;
    } catch (error) {
      throw new StorageError('delete', (error as Error).message);
    }
  }

  async exists(key: string): Promise<boolean> {
    this.ensureInitialized();

    try {
      const row = await this.getAsync(`SELECT 1 FROM ${this.tableName} WHERE key = ?`, [key]);
      return !!row;
    } catch (error) {
      throw new StorageError('exists', (error as Error).message);
    }
  }

  async listKeys(prefix?: string): Promise<string[]> {
    this.ensureInitialized();

    try {
      let sql = `SELECT key FROM ${this.tableName}`;
      const params: string[] = [];

      if (prefix) {
        sql += ` WHERE key LIKE ?`;
        params.push(prefix + '%');
      }

      sql += ` ORDER BY key`;

      const rows = await this.allAsync(sql, params);
      return (rows as any[]).map((row) => row.key);
    } catch (error) {
      throw new StorageError('listKeys', (error as Error).message);
    }
  }

  async close(): Promise<void> {
    if (this.db) {
      await new Promise<void>((resolve, reject) => {
        (this.db as any).close((err: Error | null) => {
          if (err) reject(err);
          else resolve();
        });
      });
      this.db = null;
      this.initialized = false;
    }
  }

  private ensureInitialized(): void {
    if (!this.initialized || !this.db) {
      throw new StorageNotInitializedError();
    }
  }

  private async loadSqlite3(): Promise<any> {
    try {
      // @ts-expect-error - sqlite3 is an optional dependency
      return await import('sqlite3');
    } catch (error) {
      throw new StorageError(
        'initialize',
        'sqlite3 package is not installed. Install it with: npm install sqlite3 @types/sqlite3'
      );
    }
  }

  private runAsync(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      (this.db as any).run(sql, params, function (this: any, err: Error | null) {
        if (err) reject(err);
        else resolve(this);
      });
    });
  }

  private getAsync(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      (this.db as any).get(sql, params, (err: Error | null, row: any) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  private allAsync(sql: string, params: any[] = []): Promise<any[]> {
    return new Promise((resolve, reject) => {
      (this.db as any).all(sql, params, (err: Error | null, rows: any[]) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  private execAsync(sql: string): Promise<void> {
    return new Promise((resolve, reject) => {
      (this.db as any).exec(sql, (err: Error | null) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}
