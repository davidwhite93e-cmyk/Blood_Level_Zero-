// Builds the standalone playable index.html from src/engine.js + src/story.twee + web/template.html.
// Run: node tools/build.js  (or `npm run build`)
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const engineJs = fs.readFileSync(path.join(ROOT, 'src/engine.js'), 'utf8');
const tweeSource = fs.readFileSync(path.join(ROOT, 'src/story.twee'), 'utf8');
let template = fs.readFileSync(path.join(ROOT, 'web/template.html'), 'utf8');

// Use function replacers — a string replacer would special-case "$&", "$'", "$1" etc.
// that can legitimately appear inside engineJs/tweeSource and corrupt the output.
template = template.replace('/*__ENGINE_JS__*/', () => engineJs);
template = template.replace('__TWEE_SOURCE_JSON__', () => JSON.stringify(tweeSource));

const outPath = path.join(ROOT, 'index.html');
fs.writeFileSync(outPath, template);
console.log('Built index.html —', (template.length / 1024).toFixed(1), 'KB');
