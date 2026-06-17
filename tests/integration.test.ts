import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'node:path';
import * as os from 'node:os';
import * as fs from 'node:fs';
import { ServiceContext, ConfigService, TemplateService } from '../src/services/index.js';
import { JsonFileAdapter } from '../src/storage/index.js';
import { defaultConfig } from '../src/services/ConfigService.js';
import { scanDirectoryForVariables, replaceVariablesInDirectory } from '../src/utils/variables.js';
import { ensureDir, cleanupDir } from '../src/utils/git.js';

function createTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `ctm-integration-${prefix}-`));
}

function cleanupTempDir(dir: string): void {
  if (dir && fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

describe('Variable Replacement Integration', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir('variables');
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  it('should scan and replace variables in directory', () => {
    const projectDir = path.join(tempDir, 'my-project');
    ensureDir(projectDir);

    fs.writeFileSync(
      path.join(projectDir, 'package.json'),
      JSON.stringify({
        name: '{{projectName}}',
        version: '1.0.0',
        description: '{{description}}'
      })
    );

    fs.writeFileSync(path.join(projectDir, 'README.md'), '# {{projectName}}\n\n{{description}}\n');

    const srcDir = path.join(projectDir, 'src');
    ensureDir(srcDir);
    fs.writeFileSync(
      path.join(srcDir, '{{projectName}}.ts'),
      'export const name = "{{projectName}}";'
    );

    const variables = scanDirectoryForVariables(projectDir);
    const varNames = variables.map((v) => v.name).sort();
    expect(varNames).toContain('projectName');
    expect(varNames).toContain('description');

    const result = replaceVariablesInDirectory(projectDir, [
      { name: 'projectName', value: 'my-awesome-app' },
      { name: 'description', value: 'An awesome application' }
    ]);

    expect(result.processedFiles).toBeGreaterThan(0);
    expect(result.renamedFiles).toBeGreaterThan(0);

    const pkgJson = JSON.parse(fs.readFileSync(path.join(projectDir, 'package.json'), 'utf-8'));
    expect(pkgJson.name).toBe('my-awesome-app');
    expect(pkgJson.description).toBe('An awesome application');

    const readme = fs.readFileSync(path.join(projectDir, 'README.md'), 'utf-8');
    expect(readme).toContain('# my-awesome-app');
    expect(readme).toContain('An awesome application');

    expect(fs.existsSync(path.join(srcDir, 'my-awesome-app.ts'))).toBe(true);
    expect(fs.existsSync(path.join(srcDir, '{{projectName}}.ts'))).toBe(false);
  });

  it('should handle directories with no variables', () => {
    const projectDir = path.join(tempDir, 'simple-project');
    ensureDir(projectDir);
    fs.writeFileSync(path.join(projectDir, 'index.js'), 'console.log("hello");');

    const variables = scanDirectoryForVariables(projectDir);
    expect(variables).toEqual([]);

    const result = replaceVariablesInDirectory(projectDir, []);
    expect(result.processedFiles).toBe(0);
    expect(result.renamedFiles).toBe(0);
  });
});

describe('Storage Adapter Integration', () => {
  let tempDir: string;
  let storage: JsonFileAdapter;

  beforeEach(() => {
    tempDir = createTempDir('storage');
    storage = new JsonFileAdapter({
      baseDir: tempDir,
      fileExtension: '.json',
      prettyPrint: true
    });
    storage.initialize();
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  it('should write and read data', () => {
    storage.write('test-key', { name: 'test', value: 42 });
    const data = storage.read<{ name: string; value: number }>('test-key');
    expect(data.name).toBe('test');
    expect(data.value).toBe(42);
  });

  it('should return default value when key not found', () => {
    const defaultValue = { fallback: true };
    const data = storage.read('not-exist', { defaultValue });
    expect(data).toEqual(defaultValue);
  });

  it('should check existence', () => {
    expect(storage.exists('new-key')).toBe(false);
    storage.write('new-key', 'data');
    expect(storage.exists('new-key')).toBe(true);
  });

  it('should delete data', () => {
    storage.write('to-delete', { data: 'yes' });
    expect(storage.exists('to-delete')).toBe(true);
    const result = storage.delete('to-delete');
    expect(result).toBe(true);
    expect(storage.exists('to-delete')).toBe(false);
  });

  it('should list keys with prefix', () => {
    storage.write('user_1', { id: 1 });
    storage.write('user_2', { id: 2 });
    storage.write('other', { data: 'x' });

    const userKeys = storage.listKeys?.('user_') || [];
    expect(userKeys.sort()).toEqual(['user_1', 'user_2']);
  });

  it('should throw ConfigCorruptedError for invalid JSON', () => {
    const filePath = (storage as any).getFilePath('corrupted');
    ensureDir(path.dirname(filePath));
    fs.writeFileSync(filePath, '{ invalid json');

    expect(() => storage.read('corrupted')).toThrow();
  });

  it('should copy file for backup', () => {
    storage.write('original', { important: true });
    const copied = storage.copyFile('original', 'backup');
    expect(copied).toBe(true);

    const backupData = storage.read<{ important: boolean }>('backup');
    expect(backupData.important).toBe(true);
  });
});

describe('Directory Cleanup Integration', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir('cleanup');
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  it('should clean up incomplete git clone directory', () => {
    const projectDir = path.join(tempDir, 'incomplete-project');
    ensureDir(projectDir);
    ensureDir(path.join(projectDir, '.git'));
    fs.writeFileSync(path.join(projectDir, '.git', 'HEAD'), 'ref: refs/heads/main');

    expect(fs.existsSync(projectDir)).toBe(true);
    const result = cleanupDir(projectDir);
    expect(result).toBe(true);
    expect(fs.existsSync(projectDir)).toBe(false);
  });

  it('should handle nested directories', () => {
    const rootDir = path.join(tempDir, 'nested');
    ensureDir(path.join(rootDir, 'a', 'b', 'c'));
    fs.writeFileSync(path.join(rootDir, 'a', 'b', 'c', 'file.txt'), 'content');

    expect(fs.existsSync(rootDir)).toBe(true);
    cleanupDir(rootDir);
    expect(fs.existsSync(rootDir)).toBe(false);
  });

  it('should return true for non-existent directory', () => {
    const result = cleanupDir(path.join(tempDir, 'does-not-exist'));
    expect(result).toBe(true);
  });
});
