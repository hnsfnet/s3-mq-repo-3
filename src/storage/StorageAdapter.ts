export interface StorageReadOptions {
  defaultValue?: unknown;
}

export interface StorageWriteOptions {
  createIfNotExists?: boolean;
  overwrite?: boolean;
}

export interface StorageDeleteOptions {
  recursive?: boolean;
}

export interface StorageAdapter {
  readonly name: string;

  initialize(): Promise<void> | void;

  read<T = unknown>(key: string, options?: StorageReadOptions): Promise<T> | T;

  write<T = unknown>(key: string, data: T, options?: StorageWriteOptions): Promise<void> | void;

  delete(key: string, options?: StorageDeleteOptions): Promise<boolean> | boolean;

  exists(key: string): Promise<boolean> | boolean;

  listKeys?(prefix?: string): Promise<string[]> | string[];

  close?(): Promise<void> | void;
}

export abstract class BaseStorageAdapter implements StorageAdapter {
  abstract readonly name: string;

  abstract initialize(): Promise<void> | void;
  abstract read<T = unknown>(key: string, options?: StorageReadOptions): Promise<T> | T;
  abstract write<T = unknown>(
    key: string,
    data: T,
    options?: StorageWriteOptions
  ): Promise<void> | void;
  abstract delete(key: string, options?: StorageDeleteOptions): Promise<boolean> | boolean;
  abstract exists(key: string): Promise<boolean> | boolean;

  listKeys?(prefix?: string): Promise<string[]> | string[];
  close?(): Promise<void> | void;
}
