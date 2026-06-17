import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { ServiceContext } from '../src/services';
import { JsonFileAdapter } from '../src/storage';
import { Config } from '../src/types';
import { defaultConfig } from '../src/services/ConfigService';

export function createTestContext(
  testDir: string,
  initialConfig?: Partial<Config>
): ServiceContext {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ctm-test-'));
  const baseDir = path.join(tempDir, testDir);

  const storage = new JsonFileAdapter({
    baseDir,
    fileExtension: '.json',
    prettyPrint: true
  });

  const context = new ServiceContext({ storage });

  const config: Config = {
    ...defaultConfig,
    ...initialConfig
  };

  storage.initialize();
  storage.write('config', config);

  return context;
}

export function cleanupTestContext(context: ServiceContext): void {
  const storage = context.storage as JsonFileAdapter;
  const baseDir = (storage as any).getBaseDir
    ? (storage as any).getBaseDir()
    : (storage as any).baseDir;

  if (baseDir && fs.existsSync(baseDir)) {
    const parentDir = path.dirname(baseDir);
    if (parentDir.includes('ctm-test-')) {
      fs.rmSync(parentDir, { recursive: true, force: true });
    }
  }
}
