import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    cli: 'src/cli.ts'
  },
  format: ['cjs', 'esm'],
  target: 'node18',
  platform: 'node',
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  shims: true,
  cjsInterop: true,
  outExtension({ format }) {
    return {
      js: format === 'cjs' ? '.cjs' : '.mjs',
      dts: format === 'cjs' ? '.d.ts' : '.d.mts'
    };
  },
  onSuccess: async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const distDir = path.resolve(process.cwd(), 'dist');
    const banner = '#!/usr/bin/env node\n';

    ['index.cjs', 'index.mjs'].forEach((file) => {
      const filePath = path.join(distDir, file);
      if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf-8');
        if (!content.startsWith('#!')) {
          content = banner + content;
          fs.writeFileSync(filePath, content);
          try {
            fs.chmodSync(filePath, 0o755);
          } catch {}
        }
      }
    });
  }
});
