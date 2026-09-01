const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'story.twee'), 'utf8');

// Split into passages
const parts = src.split(/^:: /m).slice(1);
const passages = {};
for (const p of parts) {
  const nl = p.indexOf('\n');
  let header = p.slice(0, nl).trim();
  const body = p.slice(nl + 1);
  // strip tags like [tag]
  const name = header.replace(/\s*\[[^\]]*\]\s*$/, '').trim();
  passages[name] = body;
}

console.log('Total passages:', Object.keys(passages).length);
console.log(Object.keys(passages).join(', '));

// find all links [[...]]
const linkRe = /\[\[([^\]]+)\]\]/g;
const includeRe = /<<include\s+"([^"]+)"\s*>>/g;
let missing = [];
for (const [name, body] of Object.entries(passages)) {
  if (name === 'StoryData' || name === 'Styles') continue;
  let m;
  while ((m = linkRe.exec(body))) {
    let target = m[1];
    if (target.includes('->')) target = target.split('->')[1];
    else if (target.includes('<-')) target = target.split('<-')[0];
    target = target.trim();
    if (!passages[target]) {
      missing.push(`${name} -> [[${m[1]}]] (target "${target}" not found)`);
    }
  }
  while ((m = includeRe.exec(body))) {
    const target = m[1].trim();
    if (!passages[target]) {
      missing.push(`${name} includes "${target}" (not found)`);
    }
  }
}

if (missing.length) {
  console.log('\nMISSING TARGETS:');
  missing.forEach(x => console.log(' -', x));
  process.exitCode = 1;
} else {
  console.log('\nAll links and includes resolve OK.');
}

// check macro balance for if/endif style
for (const [name, body] of Object.entries(passages)) {
  const opens = (body.match(/<<if\b/g) || []).length;
  const closes = (body.match(/<<\/if>>/g) || []).length;
  if (opens !== closes) {
    console.log(`UNBALANCED IF in ${name}: ${opens} <<if>> vs ${closes} <</if>>`);
  }
}
