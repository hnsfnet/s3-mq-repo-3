import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'node:path';
import * as os from 'node:os';
import * as fs from 'node:fs';
import { TemplateService, ConfigService, ServiceContext } from '../src/services/index.js';
import { JsonFileAdapter } from '../src/storage/index.js';
import { TemplateNotFoundError, TemplateAlreadyExistsError } from '../src/errors/index.js';
import { defaultConfig } from '../src/services/ConfigService.js';

function createTestContext(testName: string): ServiceContext {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), `ctm-test-${testName}-`));
  const baseDir = path.join(tempDir, 'ctm');

  const storage = new JsonFileAdapter({
    baseDir,
    fileExtension: '.json',
    prettyPrint: true
  });

  const context = new ServiceContext({ storage });
  storage.initialize();
  storage.write('config', { ...defaultConfig, templates: [] });

  return context;
}

function cleanupTestContext(context: ServiceContext): void {
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

describe('ConfigService', () => {
  let context: ServiceContext;
  let configService: ConfigService;

  beforeEach(() => {
    context = createTestContext('config');
    configService = context.configService;
  });

  afterEach(() => {
    cleanupTestContext(context);
  });

  it('should load default config', async () => {
    const config = await configService.load();
    expect(config).toBeDefined();
    expect(config.templates).toEqual([]);
    expect(config.projectDir).toBeDefined();
  });

  it('should get and set config values', async () => {
    await configService.setValue('projectDir', os.tmpdir());
    const value = await configService.getValue('projectDir');
    expect(value).toBe(os.tmpdir());
  });

  it('should throw when getting non-existent key', async () => {
    await expect(configService.getValue('nonExistent')).rejects.toThrow();
  });

  it('should reset to defaults', async () => {
    const tempDir = os.tmpdir();
    await configService.setValue('projectDir', tempDir);
    await configService.reset();
    const config = await configService.load();
    expect(config.projectDir).toBe(defaultConfig.projectDir);
  });

  it('should detect corrupted config', async () => {
    const storage = context.storage as JsonFileAdapter;
    const filePath = (storage as any).getFilePath('config');
    fs.writeFileSync(filePath, '{invalid json content');

    const isCorrupted = await configService.isCorrupted();
    expect(isCorrupted).toBe(true);
  });

  it('should repair corrupted config', async () => {
    const storage = context.storage as JsonFileAdapter;
    const filePath = (storage as any).getFilePath('config');
    fs.writeFileSync(filePath, '{invalid json content');

    const result = await configService.repair();
    expect(result.success).toBe(true);

    const config = await configService.load();
    expect(config).toBeDefined();
    expect(Array.isArray(config.templates)).toBe(true);
  });
});

describe('TemplateService', () => {
  let context: ServiceContext;
  let templateService: TemplateService;

  beforeEach(() => {
    context = createTestContext('template');
    templateService = context.templateService;
  });

  afterEach(() => {
    cleanupTestContext(context);
  });

  it('should return empty array when no templates', async () => {
    const templates = await templateService.getAll();
    expect(templates).toEqual([]);
  });

  it('should add a template', async () => {
    const template = await templateService.add({
      name: 'test-template',
      repo: 'https://github.com/test/template.git',
      branch: 'main',
      description: 'Test template',
      type: 'github'
    });

    expect(template.name).toBe('test-template');
    expect(template.repo).toBe('https://github.com/test/template.git');
    expect(Array.isArray(template.versions)).toBe(true);
  });

  it('should throw when adding duplicate template', async () => {
    await templateService.add({
      name: 'duplicate',
      repo: 'https://github.com/test/1.git',
      type: 'github'
    });

    await expect(
      templateService.add({
        name: 'duplicate',
        repo: 'https://github.com/test/2.git',
        type: 'github'
      })
    ).rejects.toThrow(TemplateAlreadyExistsError);
  });

  it('should get template by name', async () => {
    await templateService.add({
      name: 'find-me',
      repo: 'https://github.com/test/find.git',
      type: 'github'
    });

    const found = await templateService.getByName('find-me');
    expect(found.name).toBe('find-me');
  });

  it('should throw when template not found', async () => {
    await expect(templateService.getByName('not-exist')).rejects.toThrow(TemplateNotFoundError);
  });

  it('should check template existence', async () => {
    expect(await templateService.exists('not-exist')).toBe(false);

    await templateService.add({
      name: 'exist',
      repo: 'https://github.com/test/exist.git',
      type: 'github'
    });

    expect(await templateService.exists('exist')).toBe(true);
  });

  it('should remove a template', async () => {
    await templateService.add({
      name: 'to-remove',
      repo: 'https://github.com/test/remove.git',
      type: 'github'
    });

    expect(await templateService.exists('to-remove')).toBe(true);

    const result = await templateService.remove('to-remove');
    expect(result).toBe(true);
    expect(await templateService.exists('to-remove')).toBe(false);
  });

  it('should manage template versions', async () => {
    await templateService.add({
      name: 'versioned',
      repo: 'https://github.com/test/versioned.git',
      type: 'github'
    });

    const version = await templateService.addVersion('versioned', {
      version: '1.0.0',
      tag: 'v1.0.0',
      commitHash: 'abc123',
      description: 'Initial release'
    });

    expect(version.version).toBe('1.0.0');
    expect(version.tag).toBe('v1.0.0');

    const versions = await templateService.getVersions('versioned');
    expect(versions.length).toBe(1);

    const found = await templateService.getVersion('versioned', '1.0.0');
    expect(found.tag).toBe('v1.0.0');

    await templateService.removeVersion('versioned', '1.0.0');
    expect(await templateService.getVersions('versioned')).toEqual([]);
  });
});
