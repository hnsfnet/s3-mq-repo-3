import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  extractVariablesFromContent,
  replaceVariablesInString,
  scanFileForVariables,
  validateVersionTag
} from '../src/utils/variables';

describe('variables utils', () => {
  describe('validateVersionTag', () => {
    it('should accept standard semver format', () => {
      expect(validateVersionTag('1.0.0')).toBe(true);
      expect(validateVersionTag('1.2.3')).toBe(true);
      expect(validateVersionTag('10.20.30')).toBe(true);
    });

    it('should accept semver with v prefix', () => {
      expect(validateVersionTag('v1.0.0')).toBe(true);
      expect(validateVersionTag('v2.3.4')).toBe(true);
    });

    it('should accept pre-release versions', () => {
      expect(validateVersionTag('1.0.0-alpha')).toBe(true);
      expect(validateVersionTag('v1.0.0-beta.1')).toBe(true);
      expect(validateVersionTag('2.0.0-rc.1')).toBe(true);
    });

    it('should reject invalid version formats', () => {
      expect(validateVersionTag('invalid')).toBe(false);
      expect(validateVersionTag('1')).toBe(false);
      expect(validateVersionTag('1.0')).toBe(false);
      expect(validateVersionTag('v1.0')).toBe(false);
      expect(validateVersionTag('')).toBe(false);
    });
  });

  describe('extractVariablesFromContent', () => {
    it('should extract single variable', () => {
      const result = extractVariablesFromContent('Hello {{name}}!');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('name');
    });

    it('should extract multiple variables', () => {
      const result = extractVariablesFromContent(
        '{{greeting}} {{name}}, you are {{age}} years old'
      );
      expect(result).toHaveLength(3);
      expect(result.map((v) => v.name)).toEqual(
        expect.arrayContaining(['greeting', 'name', 'age'])
      );
    });

    it('should handle variables with spaces', () => {
      const result = extractVariablesFromContent('{{ name }} and {{  age  }}');
      expect(result).toHaveLength(2);
      expect(result.map((v) => v.name)).toEqual(expect.arrayContaining(['name', 'age']));
    });

    it('should not extract duplicates', () => {
      const result = extractVariablesFromContent('{{name}} {{name}} {{name}}');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('name');
    });

    it('should return empty array when no variables', () => {
      const result = extractVariablesFromContent('No variables here');
      expect(result).toHaveLength(0);
    });

    it('should handle variables in JSON', () => {
      const content = '{"name": "{{projectName}}", "version": "{{version}}"}';
      const result = extractVariablesFromContent(content);
      expect(result).toHaveLength(2);
      expect(result.map((v) => v.name)).toEqual(expect.arrayContaining(['projectName', 'version']));
    });
  });

  describe('replaceVariablesInString', () => {
    it('should replace single variable', () => {
      const replacements = new Map([['name', 'World']]);
      const result = replaceVariablesInString('Hello {{name}}!', replacements);
      expect(result).toBe('Hello World!');
    });

    it('should replace multiple variables', () => {
      const replacements = new Map([
        ['greeting', 'Hello'],
        ['name', 'World']
      ]);
      const result = replaceVariablesInString('{{greeting}}, {{name}}!', replacements);
      expect(result).toBe('Hello, World!');
    });

    it('should leave unreplaced variables unchanged', () => {
      const replacements = new Map([['name', 'World']]);
      const result = replaceVariablesInString('Hello {{name}}, {{unset}}!', replacements);
      expect(result).toBe('Hello World, {{unset}}!');
    });

    it('should handle variables with spaces', () => {
      const replacements = new Map([['name', 'World']]);
      const result = replaceVariablesInString('Hello {{ name }}!', replacements);
      expect(result).toBe('Hello World!');
    });

    it('should replace multiple occurrences', () => {
      const replacements = new Map([['name', 'World']]);
      const result = replaceVariablesInString('{{name}} {{name}} {{name}}', replacements);
      expect(result).toBe('World World World');
    });

    it('should handle empty replacements map', () => {
      const result = replaceVariablesInString('Hello {{name}}!', new Map());
      expect(result).toBe('Hello {{name}}!');
    });
  });

  describe('scanFileForVariables', () => {
    let tempDir: string;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ctm-test-'));
    });

    afterEach(() => {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it('should extract variables from a file', () => {
      const testFile = path.join(tempDir, 'test.txt');
      fs.writeFileSync(testFile, 'Hello {{name}}, you are {{age}} years old');

      const result = scanFileForVariables(testFile);
      expect(result).toHaveLength(2);
      expect(result.map((v) => v.name)).toEqual(expect.arrayContaining(['name', 'age']));
    });

    it('should return empty array for non-existent file', () => {
      const result = scanFileForVariables('/non/existent/file.txt');
      expect(result).toHaveLength(0);
    });

    it('should return empty array for file without variables', () => {
      const testFile = path.join(tempDir, 'test.txt');
      fs.writeFileSync(testFile, 'No variables in this file');

      const result = scanFileForVariables(testFile);
      expect(result).toHaveLength(0);
    });
  });
});
