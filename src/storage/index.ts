export * from './StorageAdapter';
export * from './JsonFileAdapter';
export * from './SQLiteAdapter';

import * as os from 'os';
import * as path from 'path';
import { JsonFileAdapter } from './JsonFileAdapter';

export const CONFIG_STORAGE_KEY = 'config';

export function createDefaultStorage(): JsonFileAdapter {
  const baseDir = path.join(os.homedir(), '.ctm');
  return new JsonFileAdapter({
    baseDir,
    fileExtension: '.json',
    prettyPrint: true
  });
}

export function getDefaultConfigPath(): string {
  return path.join(os.homedir(), '.ctm', 'config.json');
}
