const fs = require('fs');
const path = require('path');
const { BLZCreateEngine } = require('../src/engine.js');

const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'story.twee'), 'utf8');

function pickChoice(choices, strategy, rng) {
  if (choices.length === 0) return null;
  if (strategy === 'careful') {
    const c = choices.find(c => /careful|resist|decline|listen|submit|retreat|talk your way|evade.*talk|obfuscate/i.test(c.text));
    return c || choices[0];
  }
  if (strategy === 'reckless') {
    const c = choices.find(c => /reckless|hard|fight|threaten|run\.$|smuggler/i.test(c.text));
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
      // dead end with no links - only acceptable if it's clearly a terminal (shouldn't happen in this game)
      console.log(`[${strategy}#${seed}] DEAD END at "${result.passage}" (no choices) after ${i} steps`);
      return { visited, ok: false };
    }
    const choice = pickChoice(result.choices, strategy, rng);
    name = choice.target;
  }
  return { visited, ok: true };
}

let allVisited = new Set();
let failures = 0;

for (const strategy of ['careful', 'reckless', 'random', 'random', 'random', 'random']) {
  for (let seed = 1; seed <= 3; seed++) {
    try {
      const { visited, ok } = runPlaythrough(strategy, seed * 17 + strategy.length, 200);
      visited.forEach(v => allVisited.add(v));
      if (!ok) failures++;
    } catch (e) {
      failures++;
      console.log(`[${strategy}#${seed}] ERROR: ${e.message}`);
    }
  }
}

const engineProbe = BLZCreateEngine(src);
const allPassages = new Set(engineProbe.passageNames);
const unvisited = [...allPassages].filter(p => !allVisited.has(p));

console.log('\nTotal reachable-content passages:', allPassages.size);
console.log('Visited across all playthroughs:', allVisited.size);
if (unvisited.length) {
  console.log('Never visited (may be fine if rare-branch):', unvisited.join(', '));
}
console.log('Failures:', failures);
process.exitCode = failures ? 1 : 0;
