import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { Template, TemplateVersion } from '../types';

export function isGitInstalled(): boolean {
  try {
    execSync('git --version', { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

export function cloneTemplate(
  template: Template,
  targetDir: string,
  version?: TemplateVersion
): { success: boolean; error?: string } {
  const dirExistedBefore = fs.existsSync(targetDir);

  try {
    if (fs.existsSync(targetDir)) {
      const files = fs.readdirSync(targetDir);
      if (files.length > 0) {
        return { success: false, error: 'Target directory already exists and is not empty' };
      }
    } else {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    let branchOrTag = template.branch;
    if (version) {
      branchOrTag = version.tag || version.version;
    }

    const branchArg = branchOrTag ? `--branch ${branchOrTag}` : '';
    const depthArg = version && version.commitHash ? '' : '--depth 1';
    const command = `git clone ${branchArg} ${depthArg} "${template.repo}" "${targetDir}"`;

    execSync(command, { stdio: 'pipe' });

    if (version && version.commitHash) {
      try {
        execSync(`git checkout ${version.commitHash}`, {
          cwd: targetDir,
          stdio: 'pipe'
        });
      } catch (err) {}
    }

    const gitDir = path.join(targetDir, '.git');
    if (fs.existsSync(gitDir)) {
      removeDir(gitDir);
    }

    return { success: true };
  } catch (error: any) {
    if (!dirExistedBefore) {
      try {
        removeDir(targetDir);
      } catch (cleanupErr) {}
    } else {
      try {
        const files = fs.readdirSync(targetDir);
        const hasGitDir = files.includes('.git');
        if (hasGitDir || files.length <= 2) {
          removeDir(targetDir);
        }
      } catch (cleanupErr) {}
    }

    return { success: false, error: error.message || 'Failed to clone template' };
  }
}

export function getCurrentCommitHash(repoPath: string): string | undefined {
  try {
    const hash = execSync('git rev-parse HEAD', {
      cwd: repoPath,
      stdio: 'pipe',
      encoding: 'utf-8'
    });
    return hash.trim().substring(0, 7);
  } catch (error) {
    return undefined;
  }
}

export function validateRepoUrl(url: string): boolean {
  const patterns = [
    /^https?:\/\/github\.com\/[\w-]+\/[\w-]+\.git$/,
    /^https?:\/\/gitlab\.com\/[\w-]+\/[\w-]+\.git$/,
    /^git@github\.com:[\w-]+\/[\w-]+\.git$/,
    /^git@gitlab\.com:[\w-]+\/[\w-]+\.git$/,
    /^https?:\/\/[\w.-]+\/[\w-]+\/[\w-]+\.git$/
  ];

  return patterns.some((pattern) => pattern.test(url));
}

function removeDir(dirPath: string): void {
  if (fs.existsSync(dirPath)) {
    const files = fs.readdirSync(dirPath);
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        removeDir(filePath);
      } else {
        fs.unlinkSync(filePath);
      }
    }
    fs.rmdirSync(dirPath);
  }
}

export function cleanupDir(dirPath: string): boolean {
  try {
    removeDir(dirPath);
    return true;
  } catch (error) {
    return false;
  }
}

export function isIncompleteClone(dirPath: string): boolean {
  if (!fs.existsSync(dirPath)) {
    return false;
  }
  try {
    const files = fs.readdirSync(dirPath);
    if (files.length === 0) {
      return true;
    }
    if (files.includes('.git')) {
      return true;
    }
    return false;
  } catch (error) {
    return false;
  }
}

export function directoryIsEmpty(dirPath: string): boolean {
  if (!fs.existsSync(dirPath)) {
    return true;
  }
  const files = fs.readdirSync(dirPath);
  return files.length === 0;
}

export function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}
