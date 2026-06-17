import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import logger, { padRight, truncate } from '../utils/logger';
import { ServiceContext, TemplateService } from '../services';
import { validateVersionTag } from '../utils/variables';
import { validateRepoUrl } from '../utils/git';

export function registerTemplateCommand(program: Command, context: ServiceContext): void {
  const templateCmd = program.command('template').description('Manage project templates');

  templateCmd
    .command('list')
    .description('List all available templates')
    .action(async () => {
      await handleList(context.templateService);
    });

  templateCmd
    .command('add')
    .description('Add a new template')
    .option('-n, --name <name>', 'Template name')
    .option('-r, --repo <repo>', 'Template repository URL')
    .option('-b, --branch <branch>', 'Branch name', 'main')
    .option('-d, --description <description>', 'Template description')
    .option('-t, --type <type>', 'Template type (github/gitlab/local)', 'github')
    .action(async (options) => {
      await handleAdd(options, context.templateService);
    });

  templateCmd
    .command('remove <name>')
    .description('Remove a template')
    .action(async (name: string) => {
      await handleRemove(name, context.templateService);
    });

  templateCmd
    .command('tag <template> <version>')
    .description('Tag a template with a version')
    .option('-d, --description <description>', 'Version description')
    .option('-c, --commit <commit>', 'Commit hash (optional)')
    .action(async (template: string, version: string, options: any) => {
      await handleTag(template, version, options, context.templateService);
    });

  templateCmd
    .command('list-versions <template>')
    .description('List all versions of a template')
    .action(async (template: string) => {
      await handleListVersions(template, context.templateService);
    });

  templateCmd
    .command('remove-version <template> <version>')
    .description('Remove a version from a template')
    .action(async (template: string, version: string) => {
      await handleRemoveVersion(template, version, context.templateService);
    });
}

async function handleList(templateService: TemplateService): Promise<void> {
  const templates = await templateService.getAll();

  logger.title('Available Templates');

  if (templates.length === 0) {
    logger.warn('No templates found');
    logger.info('Use "ctm template add" to add a template');
    return;
  }

  const NAME_COL = 20;
  const TYPE_COL = 8;
  const BRANCH_COL = 10;
  const DESC_COL = 40;

  const headerName = padRight(chalk.bold.gray('Name'), NAME_COL);
  const headerType = padRight(chalk.bold.gray('Type'), TYPE_COL);
  const headerBranch = padRight(chalk.bold.gray('Branch'), BRANCH_COL);
  const headerDesc = padRight(chalk.bold.gray('Description'), DESC_COL);
  const headerVersions = chalk.bold.gray('Versions');

  logger.log(
    '  ' +
      headerName +
      ' ' +
      headerType +
      ' ' +
      headerBranch +
      ' ' +
      headerDesc +
      ' ' +
      headerVersions
  );
  logger.log('  ' + chalk.gray('─'.repeat(NAME_COL + TYPE_COL + BRANCH_COL + DESC_COL + 10)));

  for (let i = 0; i < templates.length; i++) {
    const template = templates[i];
    const isDefault = i === 0;
    const prefix = isDefault ? chalk.yellow('★ ') : '  ';

    const nameStr = padRight(chalk.bold(template.name), NAME_COL);
    const typeStr = padRight(chalk.cyan(template.type), TYPE_COL);
    const branchStr = padRight(chalk.white(template.branch || '-'), BRANCH_COL);
    const descRaw = template.description || '-';
    const descStr = padRight(truncate(descRaw, DESC_COL), DESC_COL);
    const versionCount = (template.versions || []).length;
    const versionStr =
      versionCount > 0 ? chalk.green(versionCount + ' version(s)') : chalk.gray('none');

    logger.log(
      prefix + nameStr + ' ' + typeStr + ' ' + branchStr + ' ' + descStr + ' ' + versionStr
    );
  }

  logger.empty();
  logger.info('Total: ' + templates.length + ' template(s)');
}

async function handleAdd(
  options: { name?: string; repo?: string; branch?: string; description?: string; type?: string },
  templateService: TemplateService
): Promise<void> {
  let templateData = { ...options };

  if (!templateData.name || !templateData.repo) {
    try {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'name',
          message: 'Template name:',
          when: () => !templateData.name,
          validate: async (input: string) => {
            if (!input.trim()) {
              return 'Template name cannot be empty';
            }
            if (await templateService.exists(input.trim())) {
              return 'Template name already exists';
            }
            return true;
          }
        },
        {
          type: 'input',
          name: 'repo',
          message: 'Repository URL:',
          when: () => !templateData.repo,
          validate: (input: string) => {
            if (!input.trim()) {
              return 'Repository URL cannot be empty';
            }
            if (!validateRepoUrl(input.trim())) {
              return 'Invalid repository URL format';
            }
            return true;
          }
        },
        {
          type: 'input',
          name: 'branch',
          message: 'Branch name:',
          default: 'main',
          when: () => !templateData.branch
        },
        {
          type: 'input',
          name: 'description',
          message: 'Description (optional):',
          when: () => !templateData.description
        },
        {
          type: 'list',
          name: 'type',
          message: 'Template type:',
          choices: ['github', 'gitlab', 'local'],
          default: 'github',
          when: () => !templateData.type
        }
      ]);

      templateData = { ...templateData, ...answers };
    } catch (_error) {
      return;
    }
  }

  logger.title('Adding Template');

  const template = await templateService.add({
    name: templateData.name!,
    repo: templateData.repo!,
    branch: templateData.branch || 'main',
    description: templateData.description,
    type: (templateData.type as any) || 'github'
  });

  logger.success('Template "' + template.name + '" added successfully');
}

async function handleRemove(name: string, templateService: TemplateService): Promise<void> {
  logger.title('Removing Template');
  await templateService.remove(name);
  logger.success('Template "' + name + '" removed successfully');
}

async function handleTag(
  templateName: string,
  version: string,
  options: { description?: string; commit?: string },
  templateService: TemplateService
): Promise<void> {
  logger.title('Tagging Template Version');

  if (!validateVersionTag(version)) {
    throw new Error('Invalid version format. Use semver format (e.g., v1.0.0 or 1.0.0)');
  }

  let description = options.description;
  if (!description) {
    try {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'description',
          message: 'Version description (optional):'
        }
      ]);
      description = answers.description;
    } catch (_error) {
      return;
    }
  }

  const versionData = await templateService.addVersion(templateName, {
    version,
    tag: version.startsWith('v') ? version : 'v' + version,
    commitHash: options.commit,
    description
  });

  logger.success('Version ' + versionData.tag + ' tagged for template "' + templateName + '"');
}

async function handleListVersions(
  templateName: string,
  templateService: TemplateService
): Promise<void> {
  logger.title('Template Versions: ' + templateName);

  const versions = await templateService.getVersions(templateName);

  if (versions.length === 0) {
    logger.warn('No versions found');
    logger.info('Use "ctm template tag" to create a version tag');
    return;
  }

  const TAG_COL = 12;
  const COMMIT_COL = 10;
  const DESC_COL = 40;
  const DATE_COL = 22;

  const headerTag = padRight(chalk.bold.gray('Tag'), TAG_COL);
  const headerCommit = padRight(chalk.bold.gray('Commit'), COMMIT_COL);
  const headerDesc = padRight(chalk.bold.gray('Description'), DESC_COL);
  const headerDate = padRight(chalk.bold.gray('Created'), DATE_COL);

  logger.log('  ' + headerTag + ' ' + headerCommit + ' ' + headerDesc + ' ' + headerDate);
  logger.log('  ' + chalk.gray('─'.repeat(TAG_COL + COMMIT_COL + DESC_COL + DATE_COL + 3)));

  for (let i = 0; i < versions.length; i++) {
    const version = versions[i];
    const isLatest = i === 0;
    const prefix = isLatest ? chalk.green('★ ') : '  ';
    const date = new Date(version.createdAt).toLocaleString();

    const tagStr = padRight(chalk.bold(isLatest ? version.tag + ' *' : version.tag), TAG_COL);
    const commitStr = padRight(chalk.gray(version.commitHash || '-'), COMMIT_COL);
    const descRaw = version.description || '-';
    const descStr = padRight(truncate(descRaw, DESC_COL), DESC_COL);
    const dateStr = padRight(chalk.gray(date), DATE_COL);

    logger.log(prefix + tagStr + ' ' + commitStr + ' ' + descStr + ' ' + dateStr);
  }

  logger.empty();
  logger.info('Total: ' + versions.length + ' version(s)');
}

async function handleRemoveVersion(
  templateName: string,
  version: string,
  templateService: TemplateService
): Promise<void> {
  logger.title('Removing Template Version');
  await templateService.removeVersion(templateName, version);
  logger.success('Version "' + version + '" removed from template "' + templateName + '"');
}
