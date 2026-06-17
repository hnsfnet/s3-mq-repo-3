import { StorageAdapter } from '../storage';
import { Config } from '../types';
import {
  ConfigCorruptedError,
  ConfigNotFoundError,
  ConfigInvalidValueError,
  StorageError
} from '../errors';

export const defaultConfig: Config = {
  defaultTemplate: undefined,
  projectDir: process.cwd(),
  templateMarketOrg: 'ctm-templates',
  templates: [
    {
      name: 'default-ts',
      repo: 'https://github.com/typescript-template/ts-starter.git',
      branch: 'main',
      description: 'Default TypeScript starter template',
      type: 'github',
      versions: []
    }
  ]
};

export class ConfigService {
  private storage: StorageAdapter;
  private storageKey: string;
  private configCache: Config | null = null;
  private cacheDirty = true;

  constructor(storage: StorageAdapter, storageKey: string = 'config') {
    this.storage = storage;
    this.storageKey = storageKey;
  }

  async initialize(): Promise<void> {
    this.storage.initialize();
    if (!this.storage.exists(this.storageKey)) {
      await this.reset();
    }
  }

  private mergeWithDefaults(parsed: Partial<Config>): Config {
    return {
      defaultTemplate: parsed.defaultTemplate ?? defaultConfig.defaultTemplate,
      projectDir: parsed.projectDir ?? defaultConfig.projectDir,
      templateMarketOrg: parsed.templateMarketOrg ?? defaultConfig.templateMarketOrg,
      templates: Array.isArray(parsed.templates) ? parsed.templates : defaultConfig.templates
    };
  }

  async load(): Promise<Config> {
    if (!this.cacheDirty || !this.configCache) {
      try {
        const parsed = await this.storage.read<Config>(this.storageKey, {
          defaultValue: defaultConfig
        });
        this.configCache = this.mergeWithDefaults(parsed);
        this.cacheDirty = false;
      } catch (error) {
        if (error instanceof ConfigCorruptedError) {
          throw error;
        }
        this.configCache = { ...defaultConfig };
        this.cacheDirty = false;
      }
    }
    return { ...this.configCache };
  }

  async loadSafe(): Promise<{ config: Config; corrupted: boolean; error?: string }> {
    try {
      const config = await this.load();
      return { config, corrupted: false };
    } catch (error: any) {
      return {
        config: { ...defaultConfig },
        corrupted: true,
        error: error.message
      };
    }
  }

  async save(config: Config): Promise<void> {
    try {
      await this.storage.write(this.storageKey, config);
      this.configCache = { ...config };
      this.cacheDirty = false;
    } catch (error) {
      throw new StorageError('save', (error as Error).message);
    }
  }

  async reset(): Promise<void> {
    await this.storage.write(this.storageKey, { ...defaultConfig });
    this.configCache = { ...defaultConfig };
    this.cacheDirty = false;
  }

  async isCorrupted(): Promise<boolean> {
    try {
      await this.storage.read<Config>(this.storageKey);
      return false;
    } catch (error) {
      return error instanceof ConfigCorruptedError;
    }
  }

  async backup(): Promise<string | null> {
    if (!this.storage.exists(this.storageKey)) {
      return null;
    }

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupKey = `config.corrupted.${timestamp}`;

      if ('copyFile' in this.storage) {
        const storage = this.storage as any;
        storage.copyFile(this.storageKey, backupKey);
        return storage.getFilePath(backupKey);
      }

      const data = await this.storage.read<any>(this.storageKey);
      await this.storage.write(backupKey, data);
      return backupKey;
    } catch (_error) {
      return null;
    }
  }

  async repair(): Promise<{ success: boolean; message: string }> {
    if (!this.storage.exists(this.storageKey)) {
      await this.reset();
      return {
        success: true,
        message: 'Created new config file with default values'
      };
    }

    try {
      await this.storage.read<Config>(this.storageKey);
      return {
        success: true,
        message: 'Config file is valid, no repair needed'
      };
    } catch (error) {
      const backupPath = await this.backup();
      let backupMsg = '';
      if (backupPath) {
        backupMsg = ` Corrupted file backed up to: ${backupPath}`;
      }

      await this.reset();
      return {
        success: true,
        message: 'Config file repaired with default values.' + backupMsg
      };
    }
  }

  async getValue(key: string): Promise<string | undefined> {
    const config = await this.load();

    if (!(key in config)) {
      throw new ConfigNotFoundError(key);
    }

    return (config as any)[key];
  }

  async setValue(
    key: string,
    value: string,
    validate?: (value: string) => Promise<boolean> | boolean
  ): Promise<boolean> {
    const config = await this.load();

    if (!(key in defaultConfig)) {
      throw new ConfigNotFoundError(key);
    }

    if (validate) {
      const isValid = await validate(value);
      if (!isValid) {
        return false;
      }
    }

    switch (key) {
      case 'defaultTemplate':
        if (!config.templates.some((t) => t.name === value)) {
          throw new ConfigInvalidValueError(key, value, 'Template does not exist');
        }
        break;
      case 'projectDir':
        const fs = await import('fs');
        if (!fs.existsSync(value)) {
          throw new ConfigInvalidValueError(key, value, 'Directory does not exist');
        }
        break;
    }

    (config as any)[key] = value;
    await this.save(config);
    return true;
  }

  async getPath(): Promise<string> {
    if ('getFilePath' in this.storage) {
      return (this.storage as any).getFilePath(this.storageKey);
    }
    return this.storageKey;
  }

  invalidateCache(): void {
    this.cacheDirty = true;
  }
}
