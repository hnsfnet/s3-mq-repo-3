export * from './ConfigService';
export * from './TemplateService';
export * from './InitService';
export * from './MarketService';

import { StorageAdapter, createDefaultStorage, CONFIG_STORAGE_KEY } from '../storage';
import { ConfigService, defaultConfig } from './ConfigService';
import { TemplateService } from './TemplateService';
import { InitService } from './InitService';
import { MarketService } from './MarketService';

export interface ServiceContextOptions {
  storage?: StorageAdapter;
  storageKey?: string;
}

export class ServiceContext {
  public readonly storage: StorageAdapter;
  public readonly storageKey: string;
  public readonly configService: ConfigService;
  public readonly templateService: TemplateService;
  public readonly initService: InitService;
  public readonly marketService: MarketService;

  private initialized = false;

  constructor(options: ServiceContextOptions = {}) {
    this.storage = options.storage || createDefaultStorage();
    this.storageKey = options.storageKey || CONFIG_STORAGE_KEY;

    this.configService = new ConfigService(this.storage, this.storageKey);
    this.templateService = new TemplateService(this.configService);
    this.initService = new InitService(this.templateService, this.configService);
    this.marketService = new MarketService();
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    this.storage.initialize();

    if (!this.storage.exists(this.storageKey)) {
      await this.configService.save({ ...defaultConfig });
    }

    this.initialized = true;
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

let defaultContext: ServiceContext | null = null;

export function getDefaultContext(): ServiceContext {
  if (!defaultContext) {
    defaultContext = new ServiceContext();
  }
  return defaultContext;
}

export async function initializeContext(): Promise<ServiceContext> {
  const context = getDefaultContext();
  await context.initialize();
  return context;
}
