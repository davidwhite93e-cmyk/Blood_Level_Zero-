const fs = require('fs');
const path = require('path');
const { BLZCreateEngine } = require('../src/engine.js');
const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'story.twee'), 'utf8');

const engine = BLZCreateEngine(src);
// force some discipline/relationship state so conditional branches also render without error
engine.state.disciplines = ['Obfuscate', 'Potence', 'Auspex'];
engine.state.metMira = true;
engine.state.metKestrel = true;
engine.state.kestrelStanding = 5;
engine.state.hollowResolved = true;

let errors = 0;
for (const name of engine.passageNames) {
  try {
    const r = engine.goto(name);
    if (!r.html || r.html.trim() === '') {
      console.log(`WARNING: "${name}" rendered empty output`);
    }
  } catch (e) {
    errors++;
    console.log(`ERROR rendering "${name}": ${e.message}`);
  }
}
console.log(`\nRendered ${engine.passageNames.length} passages directly. Errors: ${errors}`);
process.exitCode = errors ? 1 : 0;
