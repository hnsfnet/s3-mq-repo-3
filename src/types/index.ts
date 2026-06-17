export interface TemplateVersion {
  version: string;
  tag: string;
  commitHash?: string;
  createdAt: number;
  description?: string;
  variables?: TemplateVariable[];
}

export interface TemplateVariable {
  name: string;
  description?: string;
  defaultValue?: string;
  required?: boolean;
  type?: 'string' | 'number' | 'boolean';
}

export interface Template {
  name: string;
  repo: string;
  branch?: string;
  description?: string;
  type: 'github' | 'gitlab' | 'local';
  versions?: TemplateVersion[];
  variables?: TemplateVariable[];
}

export interface Config {
  defaultTemplate?: string;
  projectDir?: string;
  templateMarketOrg?: string;
  templates: Template[];
}

export interface InitOptions {
  template?: string;
  version?: string;
  name?: string;
  dir?: string;
  force?: boolean;
  skipVariables?: boolean;
}

export interface AddTemplateOptions {
  name: string;
  repo: string;
  branch?: string;
  description?: string;
  type?: 'github' | 'gitlab' | 'local';
}

export type ConfigKey = keyof Config;

export interface ConfigSetOptions {
  key: string;
  value: string;
}

export interface TagVersionOptions {
  template: string;
  version: string;
  description?: string;
}

export interface SearchResult {
  name: string;
  fullName: string;
  description: string;
  stars: number;
  url: string;
  defaultBranch: string;
  language?: string;
  topics?: string[];
}

export interface VariableReplacement {
  name: string;
  value: string;
}
