import * as fs from 'fs';
import * as path from 'path';
import { VariableReplacement, TemplateVariable } from '../types';

const VARIABLE_PATTERN = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_-]*)\s*\}\}/g;
const EXTENSIONS_TO_PROCESS = [
  '.js',
  '.ts',
  '.jsx',
  '.tsx',
  '.json',
  '.md',
  '.txt',
  '.html',
  '.css',
  '.scss',
  '.vue',
  '.yaml',
  '.yml',
  '.xml',
  '.sh',
  '.bat',
  '.ini',
  '.env',
  '.toml'
];

export function scanDirectoryForVariables(dirPath: string): TemplateVariable[] {
  const foundVariables = new Map<string, TemplateVariable>();

  function scanDirectory(currentPath: string): void {
    if (!fs.existsSync(currentPath)) {
      return;
    }

    const items = fs.readdirSync(currentPath);

    for (const item of items) {
      const itemPath = path.join(currentPath, item);
      const stat = fs.statSync(itemPath);

      if (item === 'node_modules' || item === '.git') {
        continue;
      }

      if (stat.isDirectory()) {
        scanDirectory(itemPath);
      } else if (stat.isFile()) {
        const ext = path.extname(item).toLowerCase();

        if (EXTENSIONS_TO_PROCESS.includes(ext)) {
          const variables = scanFileForVariables(itemPath);
          variables.forEach((v) => {
            if (!foundVariables.has(v.name)) {
              foundVariables.set(v.name, v);
            }
          });
        }

        const fileNameVariables = scanFileNameForVariables(item);
        fileNameVariables.forEach((v) => {
          if (!foundVariables.has(v.name)) {
            foundVariables.set(v.name, v);
          }
        });
      }
    }
  }

  scanDirectory(dirPath);
  return Array.from(foundVariables.values());
}

export function scanFileForVariables(filePath: string): TemplateVariable[] {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return extractVariablesFromContent(content);
  } catch (error) {
    return [];
  }
}

export function scanFileNameForVariables(fileName: string): TemplateVariable[] {
  return extractVariablesFromContent(fileName);
}

export function extractVariablesFromContent(content: string): TemplateVariable[] {
  const variables = new Map<string, TemplateVariable>();
  let match: RegExpExecArray | null;

  VARIABLE_PATTERN.lastIndex = 0;
  while ((match = VARIABLE_PATTERN.exec(content)) !== null) {
    const name = match[1];
    if (!variables.has(name)) {
      variables.set(name, {
        name,
        required: true,
        type: 'string'
      });
    }
  }

  return Array.from(variables.values());
}

export function replaceVariablesInDirectory(
  dirPath: string,
  replacements: VariableReplacement[]
): { processedFiles: number; renamedFiles: number } {
  let processedFiles = 0;
  let renamedFiles = 0;

  const replacementMap = new Map(replacements.map((r) => [r.name, r.value]));

  function processDirectory(currentPath: string): void {
    if (!fs.existsSync(currentPath)) {
      return;
    }

    const items = fs.readdirSync(currentPath);

    for (const item of items) {
      const itemPath = path.join(currentPath, item);
      const stat = fs.statSync(itemPath);

      if (item === 'node_modules' || item === '.git') {
        continue;
      }

      if (stat.isDirectory()) {
        processDirectory(itemPath);
      } else if (stat.isFile()) {
        const ext = path.extname(item).toLowerCase();

        if (EXTENSIONS_TO_PROCESS.includes(ext)) {
          const success = replaceVariablesInFile(itemPath, replacementMap);
          if (success) {
            processedFiles++;
          }
        }

        const newFileName = replaceVariablesInString(item, replacementMap);
        if (newFileName !== item) {
          const newItemPath = path.join(currentPath, newFileName);
          try {
            fs.renameSync(itemPath, newItemPath);
            renamedFiles++;
          } catch (error) {}
        }
      }
    }
  }

  processDirectory(dirPath);
  return { processedFiles, renamedFiles };
}

export function replaceVariablesInFile(
  filePath: string,
  replacementMap: Map<string, string>
): boolean {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const newContent = replaceVariablesInString(content, replacementMap);

    if (newContent !== content) {
      fs.writeFileSync(filePath, newContent, 'utf-8');
      return true;
    }
    return false;
  } catch (error) {
    return false;
  }
}

export function replaceVariablesInString(
  content: string,
  replacementMap: Map<string, string>
): string {
  return content.replace(VARIABLE_PATTERN, (_, variableName: string) => {
    const value = replacementMap.get(variableName);
    return value !== undefined ? value : `{{${variableName}}}`;
  });
}

export function validateVersionTag(version: string): boolean {
  const semverPattern = /^v?\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?$/;
  return semverPattern.test(version);
}
