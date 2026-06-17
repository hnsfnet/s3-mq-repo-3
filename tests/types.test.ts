import { Template, Config, InitOptions, AddTemplateOptions } from '../src/types';

describe('Type definitions', () => {
  describe('Template', () => {
    it('should allow creating a template with required fields', () => {
      const template: Template = {
        name: 'test-template',
        repo: 'https://github.com/test/repo.git',
        type: 'github'
      };

      expect(template.name).toBe('test-template');
      expect(template.repo).toBe('https://github.com/test/repo.git');
      expect(template.type).toBe('github');
      expect(template.branch).toBeUndefined();
      expect(template.description).toBeUndefined();
    });

    it('should allow creating a template with all fields', () => {
      const template: Template = {
        name: 'test-template',
        repo: 'https://github.com/test/repo.git',
        branch: 'main',
        description: 'A test template',
        type: 'github'
      };

      expect(template.branch).toBe('main');
      expect(template.description).toBe('A test template');
    });

    it('should support different template types', () => {
      const githubTemplate: Template = {
        name: 'gh',
        repo: 'https://github.com/test/repo.git',
        type: 'github'
      };

      const gitlabTemplate: Template = {
        name: 'gl',
        repo: 'https://gitlab.com/test/repo.git',
        type: 'gitlab'
      };

      const localTemplate: Template = {
        name: 'local',
        repo: '/path/to/template',
        type: 'local'
      };

      expect(githubTemplate.type).toBe('github');
      expect(gitlabTemplate.type).toBe('gitlab');
      expect(localTemplate.type).toBe('local');
    });
  });

  describe('Config', () => {
    it('should allow creating a config with templates', () => {
      const config: Config = {
        templates: [
          {
            name: 'default',
            repo: 'https://github.com/default/repo.git',
            type: 'github'
          }
        ]
      };

      expect(config.templates).toHaveLength(1);
      expect(config.defaultTemplate).toBeUndefined();
      expect(config.projectDir).toBeUndefined();
    });

    it('should allow creating a config with all fields', () => {
      const config: Config = {
        defaultTemplate: 'default',
        projectDir: '/projects',
        templates: [
          {
            name: 'default',
            repo: 'https://github.com/default/repo.git',
            type: 'github'
          }
        ]
      };

      expect(config.defaultTemplate).toBe('default');
      expect(config.projectDir).toBe('/projects');
    });
  });

  describe('InitOptions', () => {
    it('should allow partial options', () => {
      const options: InitOptions = {
        template: 'react-ts'
      };

      expect(options.template).toBe('react-ts');
      expect(options.name).toBeUndefined();
      expect(options.dir).toBeUndefined();
      expect(options.force).toBeUndefined();
    });

    it('should allow all options', () => {
      const options: InitOptions = {
        template: 'react-ts',
        name: 'my-project',
        dir: '/projects',
        force: true
      };

      expect(options).toEqual({
        template: 'react-ts',
        name: 'my-project',
        dir: '/projects',
        force: true
      });
    });
  });

  describe('AddTemplateOptions', () => {
    it('should require name and repo', () => {
      const options: AddTemplateOptions = {
        name: 'new-template',
        repo: 'https://github.com/test/repo.git'
      };

      expect(options.name).toBe('new-template');
      expect(options.repo).toBe('https://github.com/test/repo.git');
    });

    it('should allow optional fields', () => {
      const options: AddTemplateOptions = {
        name: 'new-template',
        repo: 'https://github.com/test/repo.git',
        branch: 'dev',
        description: 'A new template',
        type: 'gitlab'
      };

      expect(options.branch).toBe('dev');
      expect(options.description).toBe('A new template');
      expect(options.type).toBe('gitlab');
    });
  });
});
