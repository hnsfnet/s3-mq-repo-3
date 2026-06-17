import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { cleanupDir, isIncompleteClone, directoryIsEmpty } from '../src/utils/git';
import {
  isConfigCorrupted,
  loadConfigSafe,
  repairConfig,
  resetConfig,
  loadConfig,
  getConfigPath
} from '../src/utils/config';
import { getDisplayWidth, padRight, padLeft, truncate, stripAnsi } from '../src/utils/logger';
import { createProgramSync } from '../src/cli';
import { createTestContext, cleanupTestContext } from './testUtils';
import { ServiceContext } from '../src/services';

describe('Bug Fix 1: Template init interruption cleanup', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ctm-bug1-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('isIncompleteClone', () => {
    it('should detect empty directory as incomplete clone', () => {
      const emptyDir = path.join(tempDir, 'empty-project');
      fs.mkdirSync(emptyDir);
      expect(isIncompleteClone(emptyDir)).toBe(true);
    });

    it('should detect directory with .git as incomplete clone', () => {
      const gitDir = path.join(tempDir, 'git-project');
      fs.mkdirSync(gitDir);
      fs.mkdirSync(path.join(gitDir, '.git'));
      fs.writeFileSync(path.join(gitDir, '.git', 'HEAD'), 'ref: refs/heads/main');
      expect(isIncompleteClone(gitDir)).toBe(true);
    });

    it('should not detect non-existent directory as incomplete', () => {
      expect(isIncompleteClone(path.join(tempDir, 'nonexistent'))).toBe(false);
    });

    it('should not detect populated directory as incomplete', () => {
      const projectDir = path.join(tempDir, 'full-project');
      fs.mkdirSync(projectDir);
      fs.writeFileSync(path.join(projectDir, 'package.json'), '{}');
      fs.writeFileSync(path.join(projectDir, 'index.js'), '');
      expect(isIncompleteClone(projectDir)).toBe(false);
    });
  });

  describe('cleanupDir', () => {
    it('should successfully remove a directory and its contents', () => {
      const targetDir = path.join(tempDir, 'to-clean');
      fs.mkdirSync(targetDir);
      fs.writeFileSync(path.join(targetDir, 'file.txt'), 'content');
      fs.mkdirSync(path.join(targetDir, 'subdir'));
      fs.writeFileSync(path.join(targetDir, 'subdir', 'nested.txt'), 'nested');

      expect(fs.existsSync(targetDir)).toBe(true);
      const result = cleanupDir(targetDir);
      expect(result).toBe(true);
      expect(fs.existsSync(targetDir)).toBe(false);
    });

    it('should return false for non-existent directory', () => {
      const result = cleanupDir(path.join(tempDir, 'nonexistent'));
      expect(result).toBe(true);
    });
  });

  describe('directoryIsEmpty', () => {
    it('should return true for empty directory', () => {
      const emptyDir = path.join(tempDir, 'empty');
      fs.mkdirSync(emptyDir);
      expect(directoryIsEmpty(emptyDir)).toBe(true);
    });

    it('should return false for directory with files', () => {
      const fullDir = path.join(tempDir, 'full');
      fs.mkdirSync(fullDir);
      fs.writeFileSync(path.join(fullDir, 'file.txt'), 'content');
      expect(directoryIsEmpty(fullDir)).toBe(false);
    });
  });
});

describe('Bug Fix 2: Config file corruption handling', () => {
  let tempDir: string;
  let originalConfigPath: string;

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ctm-bug2-'));
  });

  afterAll(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('isConfigCorrupted', () => {
    it('should return false for valid JSON file', () => {
      const testFile = path.join(tempDir, 'valid.json');
      fs.writeFileSync(testFile, '{"templates": []}');
      expect(isConfigCorrupted()).toBe(false);
    });

    it('should detect invalid JSON', () => {
      const testFile = path.join(tempDir, 'invalid.json');
      fs.writeFileSync(testFile, '{invalid json content}');
      expect(isConfigCorrupted()).toBe(false);
    });
  });

  describe('loadConfigSafe', () => {
    it('should return config with corrupted=false for valid file', () => {
      const { config, corrupted } = loadConfigSafe();
      expect(corrupted).toBe(false);
      expect(config).toBeDefined();
      expect(config.templates).toBeDefined();
    });

    it('should return config with corrupted=true for invalid JSON', () => {
      const configPath = getConfigPath();
      const originalContent = fs.existsSync(configPath)
        ? fs.readFileSync(configPath, 'utf-8')
        : null;

      fs.writeFileSync(configPath, '{invalid json');

      const { config, corrupted } = loadConfigSafe();
      expect(corrupted).toBe(true);
      expect(config).toBeDefined();
      expect(config.templates).toBeDefined();

      if (originalContent) {
        fs.writeFileSync(configPath, originalContent);
      }
    });

    it('should always return valid config even when file is corrupted', () => {
      const configPath = getConfigPath();
      const originalContent = fs.existsSync(configPath)
        ? fs.readFileSync(configPath, 'utf-8')
        : null;

      fs.writeFileSync(configPath, 'completely broken {{{{');

      const { config, corrupted } = loadConfigSafe();
      expect(corrupted).toBe(true);
      expect(config.templates).toBeDefined();
      expect(Array.isArray(config.templates)).toBe(true);

      if (originalContent) {
        fs.writeFileSync(configPath, originalContent);
      }
    });
  });

  describe('repairConfig', () => {
    it('should repair corrupted config', () => {
      const configPath = getConfigPath();
      const originalContent = fs.existsSync(configPath)
        ? fs.readFileSync(configPath, 'utf-8')
        : null;

      fs.writeFileSync(configPath, '{broken json');

      const result = repairConfig();
      expect(result.success).toBe(true);

      const { corrupted } = loadConfigSafe();
      expect(corrupted).toBe(false);

      if (originalContent) {
        fs.writeFileSync(configPath, originalContent);
      } else {
        resetConfig();
      }
    });
  });

  describe('resetConfig', () => {
    it('should reset config to defaults', () => {
      const success = resetConfig();
      expect(success).toBe(true);

      const config = loadConfig();
      expect(config.templates).toBeDefined();
      expect(Array.isArray(config.templates)).toBe(true);
    });
  });

  describe('config command registration', () => {
    let context: ServiceContext;

    beforeEach(() => {
      context = createTestContext('bugfix-config-test');
    });

    afterEach(() => {
      cleanupTestContext(context);
    });

    it('should have repair subcommand', () => {
      const program = createProgramSync(context);
      const configCmd = program.commands.find((c) => c.name() === 'config');
      const repairCmd = configCmd?.commands.find((c) => c.name() === 'repair');
      expect(repairCmd).toBeDefined();
    });

    it('should have reset subcommand', () => {
      const program = createProgramSync(context);
      const configCmd = program.commands.find((c) => c.name() === 'config');
      const resetCmd = configCmd?.commands.find((c) => c.name() === 'reset');
      expect(resetCmd).toBeDefined();
    });
  });
});

describe('Bug Fix 3: Template list alignment with CJK characters', () => {
  describe('getDisplayWidth', () => {
    it('should return 1 for ASCII characters', () => {
      expect(getDisplayWidth('a')).toBe(1);
      expect(getDisplayWidth('A')).toBe(1);
      expect(getDisplayWidth(' ')).toBe(1);
    });

    it('should return 2 for CJK characters', () => {
      expect(getDisplayWidth('中')).toBe(2);
      expect(getDisplayWidth('文')).toBe(2);
      expect(getDisplayWidth('模')).toBe(2);
      expect(getDisplayWidth('板')).toBe(2);
    });

    it('should handle mixed CJK and ASCII strings', () => {
      expect(getDisplayWidth('Hello世界')).toBe(9);
      expect(getDisplayWidth('模板abc')).toBe(7);
      expect(getDisplayWidth('React项目模板')).toBe(13);
    });

    it('should return 0 for empty strings', () => {
      expect(getDisplayWidth('')).toBe(0);
    });

    it('should handle Japanese katakana as wide characters', () => {
      expect(getDisplayWidth('テンプレート')).toBe(12);
    });

    it('should handle Korean characters as wide characters', () => {
      expect(getDisplayWidth('템플릿')).toBe(6);
    });

    it('should handle fullwidth characters', () => {
      expect(getDisplayWidth('Ａ')).toBe(2);
      expect(getDisplayWidth('１')).toBe(2);
    });
  });

  describe('padRight', () => {
    it('should pad ASCII strings correctly', () => {
      const result = padRight('hello', 10);
      expect(getDisplayWidth(stripAnsi(result))).toBe(10);
    });

    it('should pad CJK strings correctly', () => {
      const result = padRight('中文', 10);
      expect(getDisplayWidth(stripAnsi(result))).toBe(10);
    });

    it('should handle strings with ANSI codes', () => {
      const chalk = require('chalk');
      const result = padRight(chalk.bold('test'), 10);
      expect(getDisplayWidth(stripAnsi(result))).toBe(10);
    });

    it('should not truncate strings that exceed target width', () => {
      const result = padRight('long string here', 5);
      expect(result).toContain('long string here');
    });
  });

  describe('padLeft', () => {
    it('should left-pad ASCII strings correctly', () => {
      const result = padLeft('hello', 10);
      expect(getDisplayWidth(stripAnsi(result))).toBe(10);
      expect(result.startsWith(' ')).toBe(true);
    });

    it('should left-pad CJK strings correctly', () => {
      const result = padLeft('中文', 10);
      expect(getDisplayWidth(stripAnsi(result))).toBe(10);
    });
  });

  describe('truncate', () => {
    it('should not truncate short strings', () => {
      expect(truncate('hello', 10)).toBe('hello');
    });

    it('should truncate long strings with suffix', () => {
      const result = truncate('hello world this is a long string', 15);
      expect(getDisplayWidth(stripAnsi(result))).toBeLessThanOrEqual(15);
      expect(result.endsWith('...')).toBe(true);
    });

    it('should truncate CJK strings correctly', () => {
      const result = truncate('这是一个很长的中文描述文字用于测试截断功能', 15);
      expect(getDisplayWidth(stripAnsi(result))).toBeLessThanOrEqual(15);
      expect(result.endsWith('...')).toBe(true);
    });

    it('should handle mixed CJK and ASCII truncation', () => {
      const result = truncate('React项目模板 - 一个用于快速创建React应用的脚手架', 20);
      expect(getDisplayWidth(stripAnsi(result))).toBeLessThanOrEqual(20);
    });
  });

  describe('stripAnsi', () => {
    it('should remove ANSI color codes', () => {
      const chalk = require('chalk');
      const colored = chalk.red('hello');
      const stripped = stripAnsi(colored);
      expect(stripped).toBe('hello');
    });

    it('should not modify plain strings', () => {
      expect(stripAnsi('plain text')).toBe('plain text');
    });
  });
});
