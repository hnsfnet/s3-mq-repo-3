import { createProgramSync } from '../src/cli';
import { createTestContext, cleanupTestContext } from './testUtils';
import { ServiceContext } from '../src/services';

describe('CLI v2 - New Features', () => {
  let context: ServiceContext;

  beforeEach(() => {
    context = createTestContext('features-test');
  });

  afterEach(() => {
    cleanupTestContext(context);
  });

  describe('search command', () => {
    it('should register search command', () => {
      const program = createProgramSync(context);
      const searchCmd = program.commands.find((c) => c.name() === 'search');
      expect(searchCmd).toBeDefined();
    });

    it('should have search options', () => {
      const program = createProgramSync(context);
      const searchCmd = program.commands.find((c) => c.name() === 'search');
      expect(searchCmd).toBeDefined();

      const orgOption = searchCmd?.options.find((o) => o.long === '--org');
      const limitOption = searchCmd?.options.find((o) => o.long === '--limit');
      const addOption = searchCmd?.options.find((o) => o.long === '--add');

      expect(orgOption).toBeDefined();
      expect(limitOption).toBeDefined();
      expect(addOption).toBeDefined();
    });
  });

  describe('init command enhancements', () => {
    it('should have version-tag option', () => {
      const program = createProgramSync(context);
      const initCmd = program.commands.find((c) => c.name() === 'init');
      expect(initCmd).toBeDefined();

      const versionOption = initCmd?.options.find((o) => o.long === '--version-tag');
      expect(versionOption).toBeDefined();
    });

    it('should have skip-variables option', () => {
      const program = createProgramSync(context);
      const initCmd = program.commands.find((c) => c.name() === 'init');
      expect(initCmd).toBeDefined();

      const skipVarOption = initCmd?.options.find((o) => o.long === '--skip-variables');
      expect(skipVarOption).toBeDefined();
    });
  });

  describe('template version subcommands', () => {
    it('should have tag subcommand', () => {
      const program = createProgramSync(context);
      const templateCmd = program.commands.find((c) => c.name() === 'template');
      expect(templateCmd).toBeDefined();

      const tagCmd = templateCmd?.commands.find((c) => c.name() === 'tag');
      expect(tagCmd).toBeDefined();
    });

    it('should have list-versions subcommand', () => {
      const program = createProgramSync(context);
      const templateCmd = program.commands.find((c) => c.name() === 'template');
      expect(templateCmd).toBeDefined();

      const listVersionsCmd = templateCmd?.commands.find((c) => c.name() === 'list-versions');
      expect(listVersionsCmd).toBeDefined();
    });

    it('should have remove-version subcommand', () => {
      const program = createProgramSync(context);
      const templateCmd = program.commands.find((c) => c.name() === 'template');
      expect(templateCmd).toBeDefined();

      const removeVersionCmd = templateCmd?.commands.find((c) => c.name() === 'remove-version');
      expect(removeVersionCmd).toBeDefined();
    });
  });

  describe('config templateMarketOrg', () => {
    it('should show version 2.0.0', () => {
      const program = createProgramSync(context);
      expect(program.version()).toBe('2.0.0');
    });
  });
});
