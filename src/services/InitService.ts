import * as path from 'path';
import * as fs from 'fs';
import ora from 'ora';
import { TemplateService } from './TemplateService';
import { ConfigService } from './ConfigService';
import { TemplateVersion, VariableReplacement, TemplateVariable } from '../types';
import {
  GitNotInstalledError,
  CloneError,
  DirectoryConflictError,
  VariableNotFoundError
} from '../errors';
import logger from '../utils/logger';
import {
  cloneTemplate,
  isGitInstalled,
  directoryIsEmpty,
  ensureDir,
  isIncompleteClone,
  cleanupDir
} from '../utils/git';
import { scanDirectoryForVariables, replaceVariablesInDirectory } from '../utils/variables';

export interface InitOptions {
  templateName: string;
  projectName: string;
  targetDir: string;
  version?: string;
  force?: boolean;
  skipVariables?: boolean;
}

export interface InitResult {
  success: boolean;
  targetPath: string;
  variablesReplaced?: number;
  filesRenamed?: number;
  error?: string;
}

export class InitService {
  private templateService: TemplateService;
  private configService: ConfigService;
  private interruptHandlerInstalled = false;
  private activeInitPath: string | null = null;

  constructor(templateService: TemplateService, configService: ConfigService) {
    this.templateService = templateService;
    this.configService = configService;
  }

  private setupInterruptHandler(): void {
    if (this.interruptHandlerInstalled) {
      return;
    }

    const handler = () => {
      if (this.activeInitPath) {
        process.stdout.write('\n');
        logger.warn('Init interrupted. Cleaning up incomplete project...');
        if (isIncompleteClone(this.activeInitPath)) {
          const cleaned = cleanupDir(this.activeInitPath);
          if (cleaned) {
            logger.info('Cleaned up incomplete directory: ' + this.activeInitPath);
          } else {
            logger.warn('Could not fully clean up directory: ' + this.activeInitPath);
            logger.info('You may need to manually remove it.');
          }
        }
      }
      process.exit(1);
    };

    process.on('SIGINT', handler);
    process.on('SIGHUP', handler);
    process.on('SIGTERM', handler);

    this.interruptHandlerInstalled = true;
  }

  async initialize(options: InitOptions): Promise<InitResult> {
    const { templateName, projectName, targetDir, version, force, skipVariables } = options;

    this.setupInterruptHandler();

    if (!isGitInstalled()) {
      throw new GitNotInstalledError();
    }

    const template = await this.templateService.getByName(templateName);

    let selectedVersion: TemplateVersion | undefined;
    if (version) {
      selectedVersion = await this.templateService.getVersion(templateName, version);
    }

    const targetPath = path.resolve(targetDir, projectName);
    this.activeInitPath = targetPath;

    if (fs.existsSync(targetPath) && !directoryIsEmpty(targetPath)) {
      if (isIncompleteClone(targetPath)) {
        logger.warn('Found incomplete template directory at: ' + targetPath);
        logger.info('This appears to be a previously interrupted clone. Cleaning up...');
        const cleaned = cleanupDir(targetPath);
        if (!cleaned) {
          throw new DirectoryConflictError(
            targetPath,
            'Failed to clean up incomplete directory. Please remove it manually.'
          );
        }
        logger.success('Cleaned up incomplete directory');
      } else if (!force) {
        throw new DirectoryConflictError(
          targetPath,
          'Directory already exists and is not empty. Use --force to overwrite.'
        );
      }
    }

    if (fs.existsSync(targetPath) && directoryIsEmpty(targetPath)) {
      try {
        cleanupDir(targetPath);
      } catch (error) {}
    }

    ensureDir(path.dirname(targetPath));

    const spinner = ora('Cloning template...').start();

    try {
      const result = cloneTemplate(template, targetPath, selectedVersion);

      if (!result.success) {
        spinner.fail('Failed to initialize project');
        throw new CloneError(template.repo, result.error || 'Unknown error');
      }

      spinner.text = 'Scanning for template variables...';
      spinner.render();

      let varResult = { processedFiles: 0, renamedFiles: 0 };
      if (!skipVariables) {
        const variables = scanDirectoryForVariables(targetPath);
        if (variables.length > 0) {
          spinner.stop();
          logger.success('Template cloned successfully');
          logger.empty();

          const replacements = await this.promptForVariables(variables, projectName);
          spinner.start('Replacing template variables...');
          varResult = replaceVariablesInDirectory(targetPath, replacements);
        }
      }

      this.activeInitPath = null;
      spinner.succeed('Project initialized successfully!');

      return {
        success: true,
        targetPath,
        variablesReplaced: varResult.processedFiles,
        filesRenamed: varResult.renamedFiles
      };
    } catch (error) {
      spinner.fail('Failed to initialize project');

      if (this.activeInitPath && isIncompleteClone(this.activeInitPath)) {
        logger.info('Cleaning up incomplete project...');
        cleanupDir(this.activeInitPath);
      }

      this.activeInitPath = null;
      throw error;
    }
  }

  private async promptForVariables(
    variables: TemplateVariable[],
    projectName: string
  ): Promise<VariableReplacement[]> {
    const inquirer = await import('inquirer');

    logger.title('Template Variables');
    logger.info(
      'Found ' + variables.length + ' variable(s) in the template. Please fill in the values:'
    );
    logger.empty();

    const questions = variables.map((variable) => ({
      type: 'input' as const,
      name: variable.name,
      message: variable.description || variable.name + ':',
      default: variable.defaultValue || (variable.name === 'projectName' ? projectName : undefined),
      validate: (input: string) => {
        if (variable.required !== false && !input.trim()) {
          throw new VariableNotFoundError(variable.name);
        }
        return true;
      }
    }));

    try {
      const answers = await inquirer.default.prompt(questions);
      return variables.map((v) => ({
        name: v.name,
        value: String(answers[v.name] || '')
      }));
    } catch (error) {
      return [];
    }
  }

  async getDefaultTargetDir(): Promise<string> {
    const config = await this.configService.load();
    return config.projectDir || process.cwd();
  }

  async getDefaultTemplate(): Promise<string | undefined> {
    const config = await this.configService.load();
    return config.defaultTemplate;
  }
}
