// Ilhas React: navegação e seletor de período. Telas e cálculos seguem estáticos.
const { buildSync } = require('esbuild');
const { resolve } = require('node:path');
const { readFileSync } = require('node:fs');

buildSync({
  entryPoints: [resolve(__dirname, '../assets/components/index.jsx')],
  bundle: true,
  outfile: resolve(__dirname, '../assets/generated/branched-menu.js'),
  format: 'iife',
  jsx: 'automatic',
  minify: true,
  target: ['es2020'],
  define: { 'process.env.NODE_ENV': '"production"' },
  banner: { js: '/*! React Bits / BranchedMenu + RubberSegment\n' + readFileSync(resolve(__dirname, '../docs/licenses/react-bits.md'), 'utf8') + '\n*/' },
  legalComments: 'inline',
  write: !process.argv.includes('--check'),
  logLevel: 'info'
});
