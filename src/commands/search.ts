import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import logger, { padRight, truncate } from '../utils/logger';
import { ServiceContext, TemplateService } from '../services';

export function registerSearchCommand(program: Command, context: ServiceContext): void {
  program
    .command('search [query]')
    .description('Search for templates in the template market')
    .option('-o, --org <organization>', 'GitHub organization to search in')
    .option('-l, --limit <number>', 'Maximum number of results', '10')
    .option('--add', 'Interactive add after search', false)
    .action(async (query: string | undefined, options: any) => {
      await handleSearch(query, options, context);
    });
}

async function handleSearch(
  query: string | undefined,
  options: { org?: string; limit?: string; add?: boolean },
  context: ServiceContext
): Promise<void> {
  const { marketService, templateService } = context;

  logger.title('Searching Templates');

  const org = options.org || (await getOrgFromConfig(context));
  const limit = parseInt(options.limit || '10', 10);

  if (query) {
    logger.info('Query: ' + query);
  }
  logger.info('Organization: ' + org);
  logger.info('Limit: ' + limit);
  logger.empty();

  const spinner = ora('Searching templates...').start();

  try {
    const results = await marketService.search({
      query,
      org,
      limit
    });

    spinner.succeed('Found ' + results.length + ' template(s)');

    if (results.length === 0) {
      logger.info('No templates found. Try a different query or organization.');
      return;
    }

    displayResults(results);

    if (options.add) {
      await interactiveAdd(results, templateService);
    } else {
      logger.empty();
      logger.info('To add a template, use:');
      logger.log('  ' + chalk.cyan('ctm search --add'));
      logger.log('  ' + chalk.cyan('ctm template add -n <name> -r <repo>'));
    }
  } catch (error) {
    spinner.fail('Search failed');
    throw error;
  }
}

async function getOrgFromConfig(context: ServiceContext): Promise<string> {
  try {
    const config = await context.configService.load();
    return config.templateMarketOrg || 'ctm-templates';
  } catch (_error) {
    return 'ctm-templates';
  }
}

function displayResults(results: any[]): void {
  const NAME_COL = 30;
  const STARS_COL = 8;
  const DESC_COL = 50;

  const headerName = padRight(chalk.bold.gray('Name'), NAME_COL);
  const headerStars = padRight(chalk.bold.gray('Stars'), STARS_COL);
  const headerDesc = padRight(chalk.bold.gray('Description'), DESC_COL);

  logger.log('  ' + headerName + ' ' + headerStars + ' ' + headerDesc);
  logger.log('  ' + chalk.gray('─'.repeat(NAME_COL + STARS_COL + DESC_COL + 2)));

  results.forEach((result, index) => {
    const num = String(index + 1).padStart(2, '0');
    const prefix = chalk.gray(num + '. ');

    const nameStr = padRight(chalk.bold.cyan(result.fullName || result.name), NAME_COL - 4);
    const starsStr = padRight(chalk.yellow('★ ' + (result.stars || 0)), STARS_COL);
    const descStr = padRight(truncate(result.description || 'No description', DESC_COL), DESC_COL);

    logger.log(prefix + nameStr + ' ' + starsStr + ' ' + descStr);
  });
}

async function interactiveAdd(results: any[], templateService: TemplateService): Promise<void> {
  logger.empty();

  const choices = results.map((result, index) => ({
    name: String(index + 1) + '. ' + (result.fullName || result.name),
    value: result
  }));

  try {
    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'selected',
        message: 'Select a template to add:',
        choices
      }
    ]);

    const selected = answers.selected;

    const confirm = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Template name (leave empty to use repo name):',
        default: selected.name
      },
      {
        type: 'input',
        name: 'branch',
        message: 'Branch name:',
        default: 'main'
      },
      {
        type: 'input',
        name: 'description',
        message: 'Description (leave empty to use repo description):',
        default: selected.description || ''
      }
    ]);

    const added = await templateService.add({
      name: confirm.name || selected.name,
      repo: selected.cloneUrl || selected.url,
      branch: confirm.branch || 'main',
      description: confirm.description || selected.description,
      type: 'github'
    });

    logger.success('Template "' + added.name + '" added successfully!');
  } catch (_error) {}
}
