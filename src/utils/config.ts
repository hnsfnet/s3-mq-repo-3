import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Config, Template, TemplateVersion } from '../types';

const CONFIG_DIR = path.join(os.homedir(), '.ctm');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

const defaultConfig: Config = {
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

export function ensureConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

export function isConfigCorrupted(): boolean {
  if (!fs.existsSync(CONFIG_FILE)) {
    return false;
  }
  try {
    const content = fs.readFileSync(CONFIG_FILE, 'utf-8');
    JSON.parse(content);
    return false;
  } catch (error) {
    return true;
  }
}

export function loadConfig(): Config {
  ensureConfigDir();

  if (!fs.existsSync(CONFIG_FILE)) {
    saveConfig(defaultConfig);
    return { ...defaultConfig };
  }

  try {
    const content = fs.readFileSync(CONFIG_FILE, 'utf-8');
    const parsed = JSON.parse(content);
    const config: Config = {
      defaultTemplate: parsed.defaultTemplate ?? defaultConfig.defaultTemplate,
      projectDir: parsed.projectDir ?? defaultConfig.projectDir,
      templateMarketOrg: parsed.templateMarketOrg ?? defaultConfig.templateMarketOrg,
      templates: Array.isArray(parsed.templates) ? parsed.templates : defaultConfig.templates
    };
    return config;
  } catch (error) {
    return defaultConfig;
  }
}

export function loadConfigSafe(): { config: Config; corrupted: boolean; error?: string } {
  ensureConfigDir();

  if (!fs.existsSync(CONFIG_FILE)) {
    saveConfig(defaultConfig);
    return { config: { ...defaultConfig }, corrupted: false };
  }

  try {
    const content = fs.readFileSync(CONFIG_FILE, 'utf-8');
    const parsed = JSON.parse(content);
    const config: Config = {
      defaultTemplate: parsed.defaultTemplate ?? defaultConfig.defaultTemplate,
      projectDir: parsed.projectDir ?? defaultConfig.projectDir,
      templateMarketOrg: parsed.templateMarketOrg ?? defaultConfig.templateMarketOrg,
      templates: Array.isArray(parsed.templates) ? parsed.templates : defaultConfig.templates
    };
    return { config, corrupted: false };
  } catch (error: any) {
    return { config: defaultConfig, corrupted: true, error: error.message };
  }
}

export function backupCorruptedConfig(): string | null {
  if (!fs.existsSync(CONFIG_FILE)) {
    return null;
  }
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(CONFIG_DIR, 'config.corrupted.' + timestamp + '.json');
    fs.copyFileSync(CONFIG_FILE, backupPath);
    return backupPath;
  } catch (error) {
    return null;
  }
}

export function resetConfig(): boolean {
  try {
    ensureConfigDir();
    saveConfig({ ...defaultConfig });
    return true;
  } catch (error) {
    return false;
  }
}

export function repairConfig(): { success: boolean; message: string } {
  ensureConfigDir();

  if (!fs.existsSync(CONFIG_FILE)) {
    saveConfig({ ...defaultConfig });
    return { success: true, message: 'Created new config file with default values' };
  }

  try {
    const content = fs.readFileSync(CONFIG_FILE, 'utf-8');
    JSON.parse(content);
    return { success: true, message: 'Config file is valid, no repair needed' };
  } catch (error) {
    const backupPath = backupCorruptedConfig();
    let backupMsg = '';
    if (backupPath) {
      backupMsg = ' Corrupted file backed up to: ' + backupPath;
    }

    saveConfig({ ...defaultConfig });
    return { success: true, message: 'Config file repaired with default values.' + backupMsg };
  }
}

export function saveConfig(config: Config): void {
  ensureConfigDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
}

export function getTemplates(): Template[] {
  const config = loadConfig();
  return config.templates;
}

export function getTemplateByName(name: string): Template | undefined {
  const templates = getTemplates();
  return templates.find((t) => t.name === name);
}

export function addTemplate(template: Template): boolean {
  const config = loadConfig();
  const exists = config.templates.some((t) => t.name === template.name);
  if (exists) {
    return false;
  }
  config.templates.push(template);
  saveConfig(config);
  return true;
}

export function removeTemplate(name: string): boolean {
  const config = loadConfig();
  const index = config.templates.findIndex((t) => t.name === name);
  if (index === -1) {
    return false;
  }
  config.templates.splice(index, 1);

  if (config.defaultTemplate === name) {
    config.defaultTemplate = undefined;
  }

  saveConfig(config);
  return true;
}

export function setConfigValue(key: string, value: string): boolean {
  const config = loadConfig();

  if (key === 'defaultTemplate') {
    const template = getTemplateByName(value);
    if (!template) {
      return false;
    }
    (config as any)[key] = value;
  } else if (key === 'projectDir') {
    if (!fs.existsSync(value)) {
      return false;
    }
    (config as any)[key] = value;
  } else if (key === 'templateMarketOrg') {
    (config as any)[key] = value;
  } else {
    return false;
  }

  saveConfig(config);
  return true;
}

export function getConfigValue(key: string): string | undefined {
  const config = loadConfig();
  return (config as any)[key];
}

export function getConfigPath(): string {
  return CONFIG_FILE;
}

export function addTemplateVersion(templateName: string, version: TemplateVersion): boolean {
  const config = loadConfig();
  const templateIndex = config.templates.findIndex((t) => t.name === templateName);

  if (templateIndex === -1) {
    return false;
  }

  const template = config.templates[templateIndex];
  if (!template.versions) {
    template.versions = [];
  }

  const exists = template.versions.some((v) => v.version === version.version);
  if (exists) {
    return false;
  }

  template.versions.push(version);
  template.versions.sort((a, b) => b.createdAt - a.createdAt);

  saveConfig(config);
  return true;
}

export function removeTemplateVersion(templateName: string, version: string): boolean {
  const config = loadConfig();
  const templateIndex = config.templates.findIndex((t) => t.name === templateName);

  if (templateIndex === -1) {
    return false;
  }

  const template = config.templates[templateIndex];
  if (!template.versions) {
    return false;
  }

  const versionIndex = template.versions.findIndex((v) => v.version === version);
  if (versionIndex === -1) {
    return false;
  }

  template.versions.splice(versionIndex, 1);
  saveConfig(config);
  return true;
}

export function getTemplateVersions(templateName: string): TemplateVersion[] {
  const template = getTemplateByName(templateName);
  if (!template) {
    return [];
  }
  return template.versions || [];
}

export function getTemplateVersion(
  templateName: string,
  version: string
): TemplateVersion | undefined {
  const versions = getTemplateVersions(templateName);
  return versions.find((v) => v.version === version || v.tag === version);
}

export function updateTemplate(template: Template): boolean {
  const config = loadConfig();
  const index = config.templates.findIndex((t) => t.name === template.name);

  if (index === -1) {
    return false;
  }

  config.templates[index] = template;
  saveConfig(config);
  return true;
}
