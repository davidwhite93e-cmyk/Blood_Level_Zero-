// Proves every [ending]-tagged passage is actually reachable, by driving the endgame
// deterministically from a state profile a real player could accumulate.
// Run: node tools/endings_check.js  (or `npm run endings`)
const fs = require('fs');
const path = require('path');
const { BLZCreateEngine } = require('../src/engine.js');

const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'story.twee'), 'utf8');

// --- discover every ending in the source, so a new one can't be added untested ---
const declared = [];
const headerRe = /^:: *(.+?) *\[([^\]]*)\] *$/gm;
let m;
while ((m = headerRe.exec(src))) {
  if (m[2].split(/\s+/).includes('ending')) declared.push(m[1].trim());
}
declared.sort();

// --- the routes under test: state profile -> passage -> expected ending ---
// Each `from` passage presents exactly one state-gated link; we assert where it points.
const routes = [
  {
    ending: 'EndingBeast',
    from: 'PathBeast',
    why: 'humanity collapses; the endgame forces this path',
    state: { humanity: 8 }
  },
  {
    ending: 'EndingDestroyed',
    from: 'PathFight',
    why: 'faces the hunt with nothing built up',
    state: { humanity: 50, heat: 70, strengthTier: 0, vigilTier: 0, stepTier: 0, senseTier: 0, voiceTier: 0, kestrelStanding: 0 }
  },
  {
    ending: 'EndingDestroyed',
    from: 'CourtChallenge',
    why: 'challenges the Court without the power to back it',
    state: { humanity: 50, courtStanding: 4, strengthTier: 1, scars: 0 }
  },
  {
    ending: 'EndingOpenRoad',
    from: 'PathFight',
    why: 'faces the hunt prepared but unaligned',
    state: { humanity: 50, heat: 50, strengthTier: 2, scars: 1 }
  },
  {
    ending: 'EndingGhost',
    from: 'PathVanish',
    why: 'mastered Hollow Step and kept notoriety near zero',
    state: { humanity: 60, stepTier: 3, heat: 12, feedsCareful: 9 }
  },
  {
    ending: 'EndingCourtBound',
    from: 'CourtKneel',
    why: 'high standing with the Hollow Court, and kneels',
    state: { humanity: 45, courtStanding: 6, metVoss: true, metIlse: true }
  },
  {
    ending: 'EndingThroneRoom',
    from: 'CourtChallenge',
    why: 'high power plus scars; takes the yard by force',
    state: { humanity: 35, courtStanding: 4, strengthTier: 2, scars: 3, heat: 70 }
  },
  {
    ending: 'EndingKestrelsChilde',
    from: 'CourtRefuseFinal',
    why: 'refuses the Court with Kestrel willing to speak for them',
    state: { humanity: 60, kestrelStanding: 8, metKestrel: true }
  },
  {
    ending: 'EndingAnchor',
    from: 'PathAnchor',
    why: 'high humanity and a real bond with someone from the old life',
    state: { humanity: 72, junieBond: 4, metJunie: true }
  }
];

function makeEngine(overrides) {
  const engine = BLZCreateEngine(src);
  engine.state.past = 'nurse';
  engine.state.pastName = 'ER nurse';
  engine.state.nightsPassed = 6;
  engine.state.visitedHollow = true;
  Object.assign(engine.state, overrides);
  return engine;
}

let failures = 0;
const covered = new Set();

console.log('Endings declared in src/story.twee:', declared.length);
declared.forEach(e => console.log('  -', e));
console.log('\nRouting checks:');

for (const route of routes) {
  const engine = makeEngine(route.state);
  let result;
  try {
    result = engine.goto(route.from);
  } catch (e) {
    failures++;
    console.log(`  FAIL  ${route.from} -> ${route.ending}: threw ${e.message}`);
    continue;
  }

  const targets = result.choices.map(c => c.target);
  if (targets.length !== 1) {
    failures++;
    console.log(`  FAIL  ${route.from} -> ${route.ending}: expected exactly one onward link, got [${targets.join(', ')}]`);
    continue;
  }
  if (targets[0] !== route.ending) {
    failures++;
    console.log(`  FAIL  ${route.from} -> ${route.ending}: routed to "${targets[0]}" instead (${route.why})`);
    continue;
  }

  // Follow the link and confirm the ending itself renders, is tagged, and terminates.
  let end;
  try {
    end = engine.goto(route.ending);
  } catch (e) {
    failures++;
    console.log(`  FAIL  ${route.ending}: threw while rendering: ${e.message}`);
    continue;
  }
  if (!(end.tags || []).includes('ending')) {
    failures++;
    console.log(`  FAIL  ${route.ending}: reached, but not tagged [ending]`);
    continue;
  }
  if (end.choices.length !== 0) {
    failures++;
    console.log(`  FAIL  ${route.ending}: an ending must not offer onward links`);
    continue;
  }
  if (!end.html || end.html.trim().length < 200) {
    failures++;
    console.log(`  FAIL  ${route.ending}: rendered suspiciously little text`);
    continue;
  }

  covered.add(route.ending);
  console.log(`  ok    ${route.from} -> ${route.ending}  (${route.why})`);
}

// Every declared ending must have at least one proven route to it.
const unreachable = declared.filter(e => !covered.has(e));
if (unreachable.length) {
  failures++;
  console.log('\nNO PROVEN ROUTE to:', unreachable.join(', '));
}
const phantom = [...covered].filter(e => !declared.includes(e));
if (phantom.length) {
  failures++;
  console.log('\nRouted to passages that are not tagged endings:', phantom.join(', '));
}

// The last night must actually offer the paths these routes depend on.
const lastNight = makeEngine({ humanity: 60, metJunie: true, metMira: true, visitedHollow: true });
const offered = lastNight.goto('TheLastNight').choices.map(c => c.target);
for (const needed of ['PathFight', 'PathVanish', 'PathCourt', 'PathAnchor']) {
  if (!offered.includes(needed)) {
    failures++;
    console.log(`\nTheLastNight does not offer ${needed} to a qualifying player (offered: ${offered.join(', ')})`);
  }
}
const beastNight = makeEngine({ humanity: 8, metJunie: true, visitedHollow: true });
const beastOffered = beastNight.goto('TheLastNight').choices.map(c => c.target);
if (beastOffered.length !== 1 || beastOffered[0] !== 'PathBeast') {
  failures++;
  console.log(`\nTheLastNight should force PathBeast at humanity <= 15 (offered: ${beastOffered.join(', ')})`);
}

console.log(`\n${covered.size}/${declared.length} endings have a proven route. Failures: ${failures}`);
process.exitCode = failures ? 1 : 0;
