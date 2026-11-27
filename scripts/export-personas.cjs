/**
 * Exports the 30 outbound personas (src/agents/personas.ts) to
 * netlify/functions/_agents/personas.json so serverless functions can load the full set.
 * Usage: node scripts/export-personas.cjs          (writes the file)
 *        node scripts/export-personas.cjs --check  (exit 1 if the JSON is stale)
 */
const ts = require('typescript');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const out = path.join(root, 'netlify/functions/_agents/personas.json');

const source = fs.readFileSync(path.join(root, 'src/agents/personas.ts'), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const mod = { exports: {} };
new Function('module', 'exports', js)(mod, mod.exports);
const personas = mod.exports.OUTBOUND_PERSONAS.map(({ id, name, label, shortTag, description, idealUseCases, defaultTone, systemPrompt }) => ({
  id, name, label, shortTag, description, idealUseCases, defaultTone, systemPrompt: systemPrompt.trim(),
}));
const json = JSON.stringify(personas, null, 2) + '\n';

if (process.argv.includes('--check')) {
  const current = fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : '';
  if (current !== json) {
    console.error('personas.json is stale. Run: node scripts/export-personas.cjs');
    process.exit(1);
  }
  console.log(`personas.json up to date (${personas.length} personas)`);
} else {
  fs.writeFileSync(out, json);
  console.log(`wrote ${personas.length} personas -> ${path.relative(root, out)}`);
}
