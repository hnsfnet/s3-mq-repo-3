import { Command } from 'commander';
import inquirer from 'inquirer';
import logger, { padRight, truncate } from '../utils/logger';
import { OperationError } from '../errors';
import { ServiceContext } from '../services';
import { InitOptions } from '../types';

export function registerInitCommand(program: Command, context: ServiceContext): void {
  program
    .command('init [projectName]')
    .description('Initialize a new project from a template')
    .option('-t, --template <template>', 'Template name to use')
    .option('-V, --version-tag <version>', 'Template version to use')
    .option('-d, --dir <directory>', 'Target directory')
    .option('-f, --force', 'Overwrite existing directory', false)
    .option('--skip-variables', 'Skip template variable replacement', false)
    .action(async (projectName: string | undefined, options: InitOptions) => {
      await handleInit(projectName, options, context);
    });
}

async function handleInit(
  projectName: string | undefined,
  options: InitOptions,
  context: ServiceContext
): Promise<void> {
  const { initService } = context;

  const answers = await promptForMissingParams(projectName, options, context);

  logger.title('Initializing Project');
  logger.info('Template: ' + answers.templateName);
  if (answers.versionTag) {
    logger.info('Version: ' + answers.versionTag);
  }
  logger.info('Target: ' + answers.targetDir + '/' + answers.projectName);
  logger.empty();

  const result = await initService.initialize({
    templateName: answers.templateName,
    projectName: answers.projectName,
    targetDir: answers.targetDir,
    version: answers.versionTag,
    force: options.force,
    skipVariables: options.skipVariables
  });

  logger.empty();
  logger.success('Project created at: ' + result.targetPath);

  if (result.variablesReplaced || result.filesRenamed) {
    logger.info(
      'Variables replaced in ' +
        (result.variablesReplaced || 0) +
        ' file(s), ' +
        (result.filesRenamed || 0) +
        ' file(s) renamed'
    );
  }

  logger.info('Next steps:');
  logger.log('  cd ' + answers.projectName);
  logger.log('  npm install');
  logger.log('  npm run dev');
}

async function promptForMissingParams(
  projectName: string | undefined,
  options: InitOptions,
  context: ServiceContext
): Promise<{
  projectName: string;
  templateName: string;
  targetDir: string;
  versionTag?: string;
}> {
  const { templateService, initService } = context;

  const templates = await templateService.getAll();
  const defaultTemplate = await initService.getDefaultTemplate();
  const defaultTargetDir = await initService.getDefaultTargetDir();

  if (templates.length === 0) {
    throw new OperationError(
      'No templates available. Add a template first with "ctm template add" or search with "ctm search"',
      'NO_TEMPLATES'
    );
  }

  const questions: any[] = [];

  if (!projectName) {
    questions.push({
      type: 'input',
      name: 'projectName',
      message: 'Project name:',
      validate: (input: string) => {
        if (!input.trim()) {
          return 'Project name cannot be empty';
        }
        return true;
      }
    });
  }

  if (!options.template) {
    const templateChoices = templates.map((t) => {
      const versionCount = (t.versions || []).length;
      const versionInfo = versionCount > 0 ? ' (' + versionCount + ' versions)' : '';
      return {
        name: padRight(truncate(t.name + versionInfo + ' - ' + (t.description || t.repo), 60), 60),
        value: t.name
      };
    });

    questions.push({
      type: 'list',
      name: 'templateName',
      message: 'Select a template:',
      choices: templateChoices,
      default: defaultTemplate || templates[0]?.name
    });
  }

  if (!options.dir) {
    questions.push({
      type: 'input',
      name: 'targetDir',
      message: 'Target directory:',
      default: defaultTargetDir
    });
  }

  const answers = await inquirer.prompt(questions);
  const templateName = options.template || answers.templateName;

  let versionTag: string | undefined = options.version;
  if (!options.version && !options.skipVariables) {
    const versions = await templateService.getVersions(templateName);
    if (versions.length > 0) {
      const versionChoices = [
        { name: 'Latest (no specific version)', value: undefined },
        ...versions.map((v) => ({
          name: padRight(truncate(v.tag + (v.description ? ' - ' + v.description : ''), 50), 50),
          value: v.tag
        }))
      ];

      const versionAnswer = await inquirer.prompt([
        {
          type: 'list',
          name: 'versionTag',
          message: 'Select a version:',
          choices: versionChoices,
          default: undefined
        }
      ]);

      versionTag = versionAnswer.versionTag;
    }
  }

  return {
    projectName: projectName || answers.projectName,
    templateName,
    targetDir: options.dir || answers.targetDir,
    versionTag
  };
}
