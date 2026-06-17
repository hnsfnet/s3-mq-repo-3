import { ConfigService } from './ConfigService';
import { Template, TemplateVersion } from '../types';
import {
  TemplateNotFoundError,
  TemplateAlreadyExistsError,
  TemplateVersionNotFoundError,
  TemplateVersionAlreadyExistsError,
  InvalidVersionTagError,
  InvalidRepoUrlError,
  ValidationError
} from '../errors';
import { validateVersionTag } from '../utils/variables';
import { validateRepoUrl } from '../utils/git';

export class TemplateService {
  private configService: ConfigService;

  constructor(configService: ConfigService) {
    this.configService = configService;
  }

  async getAll(): Promise<Template[]> {
    const config = await this.configService.load();
    return [...config.templates];
  }

  async getByName(name: string): Promise<Template> {
    const templates = await this.getAll();
    const template = templates.find((t) => t.name === name);

    if (!template) {
      throw new TemplateNotFoundError(name);
    }

    return template;
  }

  async exists(name: string): Promise<boolean> {
    const templates = await this.getAll();
    return templates.some((t) => t.name === name);
  }

  async add(
    template: Omit<Template, 'versions'> & { versions?: TemplateVersion[] }
  ): Promise<Template> {
    const { name, repo } = template;

    if (!name?.trim()) {
      throw new ValidationError('name', 'Template name cannot be empty');
    }

    if (!repo?.trim()) {
      throw new ValidationError('repo', 'Repository URL cannot be empty');
    }

    if (!validateRepoUrl(repo)) {
      throw new InvalidRepoUrlError(repo);
    }

    const exists = await this.exists(name);
    if (exists) {
      throw new TemplateAlreadyExistsError(name);
    }

    const newTemplate: Template = {
      name: name.trim(),
      repo: repo.trim(),
      branch: template.branch || 'main',
      description: template.description,
      type: template.type || 'github',
      versions: template.versions || []
    };

    const config = await this.configService.load();
    config.templates.push(newTemplate);
    await this.configService.save(config);

    return newTemplate;
  }

  async remove(name: string): Promise<boolean> {
    const config = await this.configService.load();
    const index = config.templates.findIndex((t) => t.name === name);

    if (index === -1) {
      throw new TemplateNotFoundError(name);
    }

    config.templates.splice(index, 1);

    if (config.defaultTemplate === name) {
      config.defaultTemplate = undefined;
    }

    await this.configService.save(config);
    return true;
  }

  async update(template: Template): Promise<Template> {
    const config = await this.configService.load();
    const index = config.templates.findIndex((t) => t.name === template.name);

    if (index === -1) {
      throw new TemplateNotFoundError(template.name);
    }

    config.templates[index] = { ...template };
    await this.configService.save(config);

    return config.templates[index];
  }

  async getVersions(templateName: string): Promise<TemplateVersion[]> {
    const template = await this.getByName(templateName);
    return [...(template.versions || [])];
  }

  async getVersion(templateName: string, version: string): Promise<TemplateVersion> {
    const versions = await this.getVersions(templateName);
    const found = versions.find((v) => v.version === version || v.tag === version);

    if (!found) {
      throw new TemplateVersionNotFoundError(templateName, version);
    }

    return found;
  }

  async addVersion(
    templateName: string,
    version: Omit<TemplateVersion, 'createdAt'> & { createdAt?: number }
  ): Promise<TemplateVersion> {
    await this.getByName(templateName);

    if (!validateVersionTag(version.version) && !validateVersionTag(version.tag)) {
      throw new InvalidVersionTagError(version.version || version.tag);
    }

    const config = await this.configService.load();
    const template = config.templates.find((t) => t.name === templateName)!;

    if (!template.versions) {
      template.versions = [];
    }

    const exists = template.versions.some(
      (v) => v.version === version.version || v.tag === version.tag
    );

    if (exists) {
      throw new TemplateVersionAlreadyExistsError(templateName, version.version || version.tag);
    }

    const versionTag =
      version.tag || (version.version.startsWith('v') ? version.version : `v${version.version}`);
    const versionNum = version.version.startsWith('v')
      ? version.version.substring(1)
      : version.version;

    const newVersion: TemplateVersion = {
      version: versionNum,
      tag: versionTag,
      commitHash: version.commitHash,
      createdAt: version.createdAt || Date.now(),
      description: version.description,
      variables: version.variables
    };

    template.versions.push(newVersion);
    template.versions.sort((a, b) => b.createdAt - a.createdAt);

    await this.configService.save(config);
    return newVersion;
  }

  async removeVersion(templateName: string, version: string): Promise<boolean> {
    await this.getByName(templateName);

    const config = await this.configService.load();
    const template = config.templates.find((t) => t.name === templateName)!;

    if (!template.versions) {
      throw new TemplateVersionNotFoundError(templateName, version);
    }

    const index = template.versions.findIndex((v) => v.version === version || v.tag === version);

    if (index === -1) {
      throw new TemplateVersionNotFoundError(templateName, version);
    }

    template.versions.splice(index, 1);
    await this.configService.save(config);

    return true;
  }
}
