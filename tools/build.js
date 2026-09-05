// Builds the standalone playable index.html from src/engine.js + src/story.twee + web/template.html.
// Run: node tools/build.js  (or `npm run build`)
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const engineJs = fs.readFileSync(path.join(ROOT, 'src/engine.js'), 'utf8');
const tweeSource = fs.readFileSync(path.join(ROOT, 'src/story.twee'), 'utf8');
let template = fs.readFileSync(path.join(ROOT, 'web/template.html'), 'utf8');

function imageDataUri(relPath) {
  const buf = fs.readFileSync(path.join(ROOT, 'web/assets', relPath));
  return 'data:image/jpeg;base64,' + buf.toString('base64');
}

// Licensed images (see web/assets/CREDITS.md), embedded as data URIs so the
// built index.html stays a single self-contained file with zero runtime
// network dependency — same reasoning as the engine/story tokens below.
const IMAGES = {
  '__IMG_HERO__': imageDataUri('hero.jpg'),
  '__IMG_PORTRAIT_UNMARKED__': imageDataUri('portrait-unmarked.jpg'),
  '__IMG_PORTRAIT_HOODED__': imageDataUri('portrait-hooded.jpg'),
  '__IMG_PORTRAIT_COLLARED__': imageDataUri('portrait-collared.jpg'),
  '__IMG_PORTRAIT_BOUND__': imageDataUri('portrait-bound.jpg')
};

// Use function replacers — a string replacer would special-case "$&", "$'", "$1" etc.
// that can legitimately appear inside engineJs/tweeSource and corrupt the output.
template = template.replace('/*__ENGINE_JS__*/', () => engineJs);
template = template.replace('__TWEE_SOURCE_JSON__', () => JSON.stringify(tweeSource));
for (const [token, dataUri] of Object.entries(IMAGES)) {
  template = template.replace(token, () => dataUri);
}

const outPath = path.join(ROOT, 'index.html');
fs.writeFileSync(outPath, template);
console.log('Built index.html —', (template.length / 1024).toFixed(1), 'KB');
