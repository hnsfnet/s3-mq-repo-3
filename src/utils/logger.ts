import chalk from 'chalk';

const CJK_RANGES: Array<[number, number]> = [
  [0x4e00, 0x9fff],
  [0x3400, 0x4dbf],
  [0xf900, 0xfaff],
  [0x2e80, 0x2eff],
  [0x3000, 0x303f],
  [0xff00, 0xffef],
  [0x2f00, 0x2fdf],
  [0x2ff0, 0x2fff],
  [0x3040, 0x309f],
  [0x30a0, 0x30ff],
  [0x31f0, 0x31ff],
  [0x3200, 0x32ff],
  [0x3300, 0x33ff],
  [0xfe30, 0xfe4f],
  [0xac00, 0xd7af],
  [0x1100, 0x11ff]
];

function isCJK(char: string): boolean {
  const code = char.charCodeAt(0);
  return CJK_RANGES.some(([start, end]) => code >= start && code <= end);
}

export function getDisplayWidth(str: string): number {
  let width = 0;
  for (const char of str) {
    if (isCJK(char)) {
      width += 2;
    } else {
      width += 1;
    }
  }
  return width;
}

export function stripAnsi(str: string): string {
  const ansiPattern = /\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g;
  return str.replace(ansiPattern, '');
}

export function padRight(str: string, targetWidth: number): string {
  const stripped = stripAnsi(str);
  const currentWidth = getDisplayWidth(stripped);
  const padding = Math.max(0, targetWidth - currentWidth);
  return str + ' '.repeat(padding);
}

export function padLeft(str: string, targetWidth: number): string {
  const stripped = stripAnsi(str);
  const currentWidth = getDisplayWidth(stripped);
  const padding = Math.max(0, targetWidth - currentWidth);
  return ' '.repeat(padding) + str;
}

export function truncate(str: string, maxWidth: number, suffix: string = '...'): string {
  const stripped = stripAnsi(str);
  if (getDisplayWidth(stripped) <= maxWidth) {
    return str;
  }

  const suffixWidth = getDisplayWidth(suffix);
  let result = '';
  let currentWidth = 0;
  const targetWidth = maxWidth - suffixWidth;

  for (const char of str) {
    const charWidth = isCJK(char) ? 2 : 1;
    if (currentWidth + charWidth > targetWidth) {
      break;
    }
    result += char;
    currentWidth += charWidth;
  }

  return result + suffix;
}

export const logger = {
  success(message: string): void {
    console.log(chalk.green('✓ ' + message));
  },

  error(message: string): void {
    console.error(chalk.red('✗ ' + message));
  },

  warn(message: string): void {
    console.warn(chalk.yellow('⚠ ' + message));
  },

  info(message: string): void {
    console.log(chalk.blue('ℹ ' + message));
  },

  log(message: string): void {
    console.log(message);
  },

  title(message: string): void {
    console.log(chalk.bold.cyan('\n' + message));
    console.log(chalk.cyan('─'.repeat(message.length + 2)));
  },

  empty(): void {
    console.log('');
  }
};

export default logger;
