const fs = require('fs');
const path = require('path');
const { BLZCreateEngine } = require('../src/engine.js');

const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'story.twee'), 'utf8');

function pickChoice(choices, strategy, rng) {
  if (choices.length === 0) return null;
  if (strategy === 'careful') {
    const c = choices.find(c => /careful|resist|decline|listen|submit|retreat|talk your way|evade.*talk|hollow step|walk away|truth/i.test(c.text));
    return c || choices[0];
  }
  if (strategy === 'reckless') {
    const c = choices.find(c => /reckless|hard|fight|threaten|run\.$|smuggler|challenge|force/i.test(c.text));
    return c || choices[choices.length - 1];
  }
  return choices[Math.floor(rng() * choices.length)];
}

function mulberry32(a) {
  return function () {
    let t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function runPlaythrough(strategy, seed, steps) {
  const engine = BLZCreateEngine(src);
  const rng = mulberry32(seed);
  let name = engine.startPassage;
  const visited = new Set();
  for (let i = 0; i < steps; i++) {
    const result = engine.goto(name);
    visited.add(result.passage);
    if (result.choices.length === 0) {
      // A passage with no onward links is only legitimate if it is a tagged ending.
      if ((result.tags || []).includes('ending')) {
        return { visited, ok: true, ending: result.passage, steps: i + 1 };
      }
      console.log(`[${strategy}#${seed}] DEAD END at "${result.passage}" (no choices, not an ending) after ${i} steps`);
      return { visited, ok: false, ending: null };
    }
    const choice = pickChoice(result.choices, strategy, rng);
    name = choice.target;
  }
  // Running out of steps without reaching an ending is not a failure on its own —
  // the sandbox is meant to be wanderable — but it is worth surfacing.
  return { visited, ok: true, ending: null };
}

let allVisited = new Set();
let failures = 0;
const endingsReached = new Map();
let reachedAnEnding = 0;
let runs = 0;

const strategies = ['careful', 'reckless', 'random', 'random', 'random', 'random'];
strategies.forEach((strategy, idx) => {
  for (let seed = 1; seed <= 6; seed++) {
    runs++;
    // Vary the seed by strategy *slot* as well as name, otherwise every 'random'
    // entry draws the identical sequence and we only get one distinct random run.
    const seedValue = seed * 7919 + idx * 104729 + strategy.length;
    try {
      const { visited, ok, ending } = runPlaythrough(strategy, seedValue, 400);
      visited.forEach(v => allVisited.add(v));
      if (!ok) failures++;
      if (ending) {
        reachedAnEnding++;
        endingsReached.set(ending, (endingsReached.get(ending) || 0) + 1);
      }
    } catch (e) {
      failures++;
      console.log(`[${strategy}#${seed}] ERROR: ${e.message}`);
    }
  }
});

// Every run must terminate in an ending: the night auto-closes at dawn and the
// endgame fires by night 6, so a run that just wanders forever is a pacing bug.
if (reachedAnEnding !== runs) {
  failures++;
  console.log(`\nONLY ${reachedAnEnding}/${runs} runs reached an ending — some playthrough never converges.`);
}

const engineProbe = BLZCreateEngine(src);
const allPassages = new Set(engineProbe.passageNames);
const unvisited = [...allPassages].filter(p => !allVisited.has(p));

console.log('\nPlaythroughs run:', runs);
console.log('Runs that reached an ending:', reachedAnEnding);
if (endingsReached.size) {
  console.log('Endings reached by simulated play:');
  [...endingsReached.entries()].sort().forEach(([k, v]) => console.log(`  - ${k} (x${v})`));
}
console.log('\nTotal reachable-content passages:', allPassages.size);
console.log('Visited across all playthroughs:', allVisited.size);
if (unvisited.length) {
  console.log('Never visited (may be fine if rare-branch):', unvisited.join(', '));
}
console.log('Failures:', failures);
process.exitCode = failures ? 1 : 0;
