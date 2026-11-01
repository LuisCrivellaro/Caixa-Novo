// Integridade dos arquivos vendorizados. Não instala, atualiza ou executa skills.
const { readFileSync, readdirSync, existsSync } = require('node:fs');
const { createHash } = require('node:crypto');
const { resolve, sep } = require('node:path');
const assert = require('node:assert/strict');
const root = resolve(__dirname, '..');
const manifest = JSON.parse(readFileSync(resolve(root, 'docs/skills/installed.json'), 'utf8'));
const names = manifest.skills.map(skill => skill.name);
assert.equal(new Set(names).size, names.length, 'Nomes de skill duplicados');
const actual = readdirSync(resolve(root, '.claude/skills'), { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => entry.name).sort();
assert.deepEqual(actual, [...names].sort(), 'O catálogo instalado difere do manifesto');
const checkFile = (file, expected, binary = false) => {
  const path = resolve(root, file);
  assert.ok(path.startsWith(root + sep), `Caminho fora do projeto: ${file}`);
  const bytes = readFileSync(path);
  const hash = createHash('sha256').update(binary ? bytes : bytes.toString('utf8').replace(/\r\n/g, '\n')).digest('hex');
  assert.equal(hash, expected, `Arquivo alterado: ${file}`);
};
let count = 0;
for (const skill of manifest.skills) {
  const source = readFileSync(resolve(root, skill.path, 'SKILL.md'), 'utf8');
  const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  assert.ok(frontmatter, `${skill.name}: frontmatter ausente`);
  const name = frontmatter[1].match(/^name:\s*([^\r\n]+)$/m)?.[1].replace(/^['"]|['"]$/g, '').trim();
  assert.equal(name, skill.name, `${skill.name}: nome inconsistente`);
  assert.match(frontmatter[1], /^description:\s*\S/m, `${skill.name}: descrição ausente`);
  for (const [file, hash] of Object.entries(skill.files)) { checkFile(file, hash); count++; }
}
for (const [file, hash] of Object.entries(manifest.supportingFiles)) { checkFile(file, hash); count++; }
for (const artifact of manifest.optionalLocalArtifacts) if (existsSync(resolve(root, artifact.path))) checkFile(artifact.path, artifact.sha256, true);
console.log(`${names.length} skills locais, ${count} arquivos e referências com integridade válida.`);
