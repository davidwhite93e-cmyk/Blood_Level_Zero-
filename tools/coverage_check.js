const fs = require('fs');
const path = require('path');
const { BLZCreateEngine } = require('../src/engine.js');
const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'story.twee'), 'utf8');

const engine = BLZCreateEngine(src);
// Force power/relationship/faction state on so conditional branches also render without error.
engine.state.disciplines = ['Hollow Step', 'Grave Strength', 'Wake-Sense', 'Still Voice', 'Blood Memory', 'Cold Vigil'];
engine.state.stepTier = 3;
engine.state.strengthTier = 3;
engine.state.senseTier = 2;
engine.state.voiceTier = 2;
engine.state.memoryTier = 2;
engine.state.vigilTier = 2;
engine.state.past = 'nurse';
engine.state.pastName = 'ER nurse';
engine.state.metMira = true;
engine.state.metKestrel = true;
engine.state.metSable = true;
engine.state.metJunie = true;
engine.state.metVoss = true;
engine.state.metIlse = true;
engine.state.miraTrust = 6;
engine.state.kestrelStanding = 8;
engine.state.courtStanding = 6;
engine.state.junieBond = 3;
engine.state.sableStanding = 4;
engine.state.okaforAwareness = 4;
engine.state.okaforMet = true;
engine.state.scars = 4;
engine.state.talkedDown = 4;
engine.state.feedsCareful = 9;
engine.state.midtownClaim = 2;
engine.state.nightsPassed = 5;
engine.state.hollowResolved = true;
engine.state.courtSummoned = true;
engine.state.courtTaskDone = true;

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

// Render a second pass with the opposite flag profile so the "not yet met / low standing"
// branches get exercised too, not just the fully-unlocked ones.
const lean = BLZCreateEngine(src);
lean.state.past = 'guard';
lean.state.pastName = 'night security';
for (const name of lean.passageNames) {
  try {
    lean.goto(name);
  } catch (e) {
    errors++;
    console.log(`ERROR rendering "${name}" (default state): ${e.message}`);
  }
}

console.log(`\nRendered ${engine.passageNames.length} passages directly, in both unlocked and default state. Errors: ${errors}`);
process.exitCode = errors ? 1 : 0;
