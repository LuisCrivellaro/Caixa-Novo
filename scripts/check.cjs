const { readdirSync } = require('node:fs');
const { spawnSync } = require('node:child_process');
const { join } = require('node:path');
let failed = false;
for (const name of readdirSync(join(__dirname, '../assets/js')).filter(n => n.endsWith('.js'))) {
  const result = spawnSync(process.execPath, ['--check', join(__dirname, '../assets/js', name)], { stdio: 'inherit' });
  if (result.status !== 0) failed = true;
}
const menu = spawnSync(process.execPath, [join(__dirname, 'build-menu.cjs'), '--check'], { stdio: 'inherit' });
if (menu.status !== 0) failed = true;
if (failed) process.exitCode = 1;
else console.log('Sintaxe JavaScript válida em todos os módulos.');
