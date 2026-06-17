import { createProgramSync } from '../src/cli';
import { createTestContext, cleanupTestContext } from './testUtils';
import { ServiceContext } from '../src/services';

describe('CLI', () => {
  let context: ServiceContext;

  beforeEach(() => {
    context = createTestContext('cli-test');
  });

  afterEach(() => {
    cleanupTestContext(context);
  });

  describe('createProgram', () => {
    it('should create a program instance', () => {
      const program = createProgramSync(context);
      expect(program).toBeDefined();
      expect(program.name()).toBe('ctm');
    });

    it('should have version command', () => {
      const program = createProgramSync(context);
      const versionOption = program.options.find((o) => o.long === '--version');
      expect(versionOption).toBeDefined();
    });

    it('should have help functionality', () => {
      const program = createProgramSync(context);
      expect(typeof program.helpInformation).toBe('function');
      expect(program.helpInformation()).toContain('Usage: ctm');
    });

    it('should register init command', () => {
      const program = createProgramSync(context);
      const initCmd = program.commands.find((c) => c.name() === 'init');
      expect(initCmd).toBeDefined();
    });

    it('should register template command', () => {
      const program = createProgramSync(context);
      const templateCmd = program.commands.find((c) => c.name() === 'template');
      expect(templateCmd).toBeDefined();
    });

    it('should register config command', () => {
      const program = createProgramSync(context);
      const configCmd = program.commands.find((c) => c.name() === 'config');
      expect(configCmd).toBeDefined();
    });
  });

  describe('template subcommands', () => {
    it('should have list subcommand', () => {
      const program = createProgramSync(context);
      const templateCmd = program.commands.find((c) => c.name() === 'template');
      const listCmd = templateCmd?.commands.find((c) => c.name() === 'list');
      expect(listCmd).toBeDefined();
    });

    it('should have add subcommand', () => {
      const program = createProgramSync(context);
      const templateCmd = program.commands.find((c) => c.name() === 'template');
      const addCmd = templateCmd?.commands.find((c) => c.name() === 'add');
      expect(addCmd).toBeDefined();
    });

    it('should have remove subcommand', () => {
      const program = createProgramSync(context);
      const templateCmd = program.commands.find((c) => c.name() === 'template');
      const removeCmd = templateCmd?.commands.find((c) => c.name() === 'remove');
      expect(removeCmd).toBeDefined();
    });
  });

  describe('config subcommands', () => {
    it('should have list subcommand', () => {
      const program = createProgramSync(context);
      const configCmd = program.commands.find((c) => c.name() === 'config');
      const listCmd = configCmd?.commands.find((c) => c.name() === 'list');
      expect(listCmd).toBeDefined();
    });

    it('should have get subcommand', () => {
      const program = createProgramSync(context);
      const configCmd = program.commands.find((c) => c.name() === 'config');
      const getCmd = configCmd?.commands.find((c) => c.name() === 'get');
      expect(getCmd).toBeDefined();
    });

    it('should have set subcommand', () => {
      const program = createProgramSync(context);
      const configCmd = program.commands.find((c) => c.name() === 'config');
      const setCmd = configCmd?.commands.find((c) => c.name() === 'set');
      expect(setCmd).toBeDefined();
    });

    it('should have path subcommand', () => {
      const program = createProgramSync(context);
      const configCmd = program.commands.find((c) => c.name() === 'config');
      const pathCmd = configCmd?.commands.find((c) => c.name() === 'path');
      expect(pathCmd).toBeDefined();
    });
  });
});
