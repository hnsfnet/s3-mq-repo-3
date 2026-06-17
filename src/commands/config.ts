import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import logger, { padRight, truncate } from '../utils/logger';
import { ServiceContext, ConfigService } from '../services';

export function registerConfigCommand(program: Command, context: ServiceContext): void {
  const configCmd = program.command('config').description('Manage CTM configuration');

  configCmd
    .command('list')
    .description('List all configuration values')
    .action(async () => {
      await checkAndWarnCorrupted(context.configService);
      await handleList(context.configService);
    });

  configCmd
    .command('get <key>')
    .description('Get a configuration value')
    .action(async (key: string) => {
      await checkAndWarnCorrupted(context.configService);
      await handleGet(key, context.configService);
    });

  configCmd
    .command('set <key> <value>')
    .description('Set a configuration value')
    .action(async (key: string, value: string) => {
      await checkAndWarnCorrupted(context.configService, true);
      await handleSet(key, value, context.configService);
    });

  configCmd
    .command('path')
    .description('Show config file path')
    .action(async () => {
      await handlePath(context.configService);
    });

  configCmd
    .command('repair')
    .description('Repair corrupted config file')
    .action(async () => {
      await handleRepair(context.configService);
    });

  configCmd
    .command('reset')
    .description('Reset config to defaults')
    .option('-f, --force', 'Skip confirmation prompt', false)
    .action(async (options) => {
      await handleReset(options.force, context.configService);
    });
}

async function checkAndWarnCorrupted(
  configService: ConfigService,
  blockWrite = false
): Promise<void> {
  const { corrupted, error } = await configService.loadSafe();

  if (corrupted) {
    logger.warn('⚠ Config file is corrupted! Using default values temporarily.');
    if (error) {
      logger.log('  ' + chalk.gray('Error: ' + error));
    }
    logger.empty();
    logger.info('To repair the config file, run:');
    logger.log('  ' + chalk.cyan('ctm config repair'));
    logger.empty();

    if (blockWrite) {
      throw new Error(
        'Config file is corrupted. Run "ctm config repair" before modifying settings.'
      );
    }
  }
}

async function handleList(configService: ConfigService): Promise<void> {
  logger.title('Configuration');

  const config = await configService.load();

  const KEY_COL = 24;
  const VALUE_COL = 56;

  const headerKey = padRight(chalk.bold.gray('Key'), KEY_COL);
  const headerValue = padRight(chalk.bold.gray('Value'), VALUE_COL);

  logger.log('  ' + headerKey + ' ' + headerValue);
  logger.log('  ' + chalk.gray('─'.repeat(KEY_COL + VALUE_COL + 1)));

  const entries: Array<[string, unknown]> = [
    ['defaultTemplate', config.defaultTemplate || '(not set)'],
    ['projectDir', config.projectDir],
    ['templateMarketOrg', config.templateMarketOrg],
    ['templates', config.templates.length + ' template(s)']
  ];

  for (const [key, value] of entries) {
    const keyStr = padRight(chalk.white(key), KEY_COL);
    const valueStr = padRight(truncate(String(value), VALUE_COL), VALUE_COL);
    logger.log('  ' + keyStr + ' ' + chalk.yellow(valueStr));
  }

  logger.empty();
  const configPath = await configService.getPath();
  logger.info('Config file: ' + configPath);
}

async function handleGet(key: string, configService: ConfigService): Promise<void> {
  logger.title('Get Configuration');

  const value = await configService.getValue(key);
  logger.log('  ' + chalk.bold(key) + ': ' + chalk.yellow(String(value || '(not set)')));
}

async function handleSet(key: string, value: string, configService: ConfigService): Promise<void> {
  logger.title('Set Configuration');

  const success = await configService.setValue(key, value);
  if (success) {
    logger.success('Set "' + key + '" to "' + value + '"');
  } else {
    throw new Error('Failed to set config value');
  }
}

async function handlePath(configService: ConfigService): Promise<void> {
  const configPath = await configService.getPath();
  logger.log(configPath);
}

async function handleRepair(configService: ConfigService): Promise<void> {
  logger.title('Repairing Config File');

  const result = await configService.repair();
  logger.success(result.message);
}

async function handleReset(force: boolean, configService: ConfigService): Promise<void> {
  logger.title('Reset Configuration');

  if (!force) {
    try {
      const confirm = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'reset',
          message: 'Are you sure you want to reset ALL configuration to defaults?',
          default: false
        }
      ]);

      if (!confirm.reset) {
        logger.info('Reset cancelled');
        return;
      }
    } catch (_error) {
      return;
    }
  }

  await configService.reset();
  logger.success('Configuration reset to defaults');
}
