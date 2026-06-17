import { Command } from 'commander';
import chalk from 'chalk';
import { registerInitCommand } from './commands/init';
import { registerTemplateCommand } from './commands/template';
import { registerConfigCommand } from './commands/config';
import { registerSearchCommand } from './commands/search';
import { initializeContext, ServiceContext } from './services';
import { CtmError } from './errors';
import logger from './utils/logger';

export async function createProgram(context?: ServiceContext): Promise<Command> {
  if (!context) {
    context = await initializeContext();
  }

  return createProgramSync(context);
}

export function createProgramSync(context: ServiceContext): Command {
  const program = new Command();

  program
    .name('ctm')
    .description('CLI Template Manager - Manage and initialize project templates')
    .version('2.0.0', '-v, --version', 'Output the current version')
    .helpOption('-h, --help', 'Display help for command');

  registerInitCommand(program, context);
  registerTemplateCommand(program, context);
  registerConfigCommand(program, context);
  registerSearchCommand(program, context);

  program.configureOutput({
    writeErr: (str: string) => {
      process.stderr.write(str);
    },
    outputError: (str: string, write: (str: string) => void) => {
      if (str && str.trim()) {
        write(chalk.red(str));
      }
    }
  });

  program.exitOverride((err: { code: string; message: string }) => {
    if (
      err.code === 'commander.helpDisplayed' ||
      err.code === 'commander.version' ||
      err.code === 'commander.help'
    ) {
      process.exit(0);
    }
    throw err;
  });

  return program;
}

export async function runCli(argv: string[] = process.argv): Promise<void> {
  try {
    const context = await initializeContext();
    const program = await createProgram(context);

    await program.parseAsync(argv);
  } catch (error) {
    handleGlobalError(error);
  }
}

function handleGlobalError(error: unknown): void {
  if (error instanceof CtmError) {
    logger.empty();
    logger.error(chalk.red('Error: ') + error.message);

    if (error.code) {
      logger.log('  ' + chalk.gray('Code: ') + error.code);
    }

    if (error.details && Object.keys(error.details).length > 0) {
      logger.log('  ' + chalk.gray('Details: ') + JSON.stringify(error.details, null, 2));
    }

    logger.empty();
    logger.info('For more help, use:');
    logger.log('  ' + chalk.cyan('ctm --help'));
    logger.log('  ' + chalk.cyan('ctm <command> --help'));

    process.exit(1);
  }

  if (error && typeof error === 'object' && 'code' in error) {
    const err = error as { code: string; message?: string };

    if (err.code.startsWith('commander.')) {
      logger.empty();
      if (err.message) {
        logger.error(err.message);
      }
      logger.empty();
      logger.info('For more help, use:');
      logger.log('  ' + chalk.cyan('ctm --help'));
      process.exit(1);
    }
  }

  logger.empty();
  logger.error(chalk.red('An unexpected error occurred:'));

  if (error instanceof Error) {
    logger.log('  ' + error.message);
    if (error.stack && process.env.DEBUG) {
      logger.empty();
      logger.log(chalk.gray(error.stack));
    }
  } else {
    logger.log('  ' + String(error));
  }

  logger.empty();
  logger.info('If this problem persists, please report an issue.');
  process.exit(1);
}

export default runCli;
