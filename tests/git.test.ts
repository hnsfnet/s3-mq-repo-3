import { validateRepoUrl, directoryIsEmpty, isGitInstalled } from '../src/utils/git';

describe('git utils', () => {
  describe('validateRepoUrl', () => {
    it('should accept GitHub HTTPS URLs', () => {
      expect(validateRepoUrl('https://github.com/user/repo.git')).toBe(true);
    });

    it('should accept GitLab HTTPS URLs', () => {
      expect(validateRepoUrl('https://gitlab.com/user/repo.git')).toBe(true);
    });

    it('should accept GitHub SSH URLs', () => {
      expect(validateRepoUrl('git@github.com:user/repo.git')).toBe(true);
    });

    it('should accept GitLab SSH URLs', () => {
      expect(validateRepoUrl('git@gitlab.com:user/repo.git')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(validateRepoUrl('not-a-valid-url')).toBe(false);
    });

    it('should reject URLs without .git suffix', () => {
      expect(validateRepoUrl('https://github.com/user/repo')).toBe(false);
    });

    it('should reject empty strings', () => {
      expect(validateRepoUrl('')).toBe(false);
    });
  });

  describe('directoryIsEmpty', () => {
    it('should return true for non-existent directory', () => {
      expect(directoryIsEmpty('/non/existent/path/12345')).toBe(true);
    });
  });

  describe('isGitInstalled', () => {
    it('should return a boolean', () => {
      const result = isGitInstalled();
      expect(typeof result).toBe('boolean');
    });
  });
});
