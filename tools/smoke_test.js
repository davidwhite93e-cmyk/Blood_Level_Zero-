// Loads the built index.html in a real headless browser and plays it for real,
// asserting that a full run reaches an ending with zero console/page errors.
// Run: node tools/smoke_test.js   (or `npm run smoke`)
//
// Uses Playwright's own bundled Chromium by default. If your environment ships a
// Chromium that doesn't match the installed Playwright build, point at it with:
//   BLZ_CHROMIUM=/path/to/chrome node tools/smoke_test.js
const { chromium } = require('playwright');
const path = require('path');

const MAX_CLICKS = 300;

(async () => {
  const launchOpts = {};
  if (process.env.BLZ_CHROMIUM) launchOpts.executablePath = process.env.BLZ_CHROMIUM;

  const browser = await chromium.launch(launchOpts);
  const page = await browser.newPage();
  const errors = [];
  const failedRequests = [];

  // The webfonts are the one optional resource: the CSS declares real fallback
  // stacks so the game is fully playable offline. Any *other* failed request is
  // a genuine problem, because nothing else may be fetched at runtime.
  const OPTIONAL_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];
  const isOptional = url => OPTIONAL_HOSTS.some(h => url.includes(h));

  page.on('requestfailed', req => {
    if (!isOptional(req.url())) failedRequests.push(req.url());
  });
  page.on('console', msg => {
    if (msg.type() !== 'error') return;
    // Resource-load console noise is judged by requestfailed above, not by text.
    if (/Failed to load resource/i.test(msg.text())) return;
    errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push('pageerror: ' + err.message));

  const filePath = 'file://' + path.resolve(__dirname, '..', 'index.html');
  await page.goto(filePath);

  console.log('Title:', await page.title());

  // --- start screen / character creation must appear before any story text ---
  const startScreen = await page.waitForSelector('#startScreen:not([hidden])', { timeout: 5000 }).catch(() => null);
  if (!startScreen) errors.push('start screen did not appear on first load');

  const portraitCards = await page.$$('.portrait-card');
  if (portraitCards.length < 2) {
    errors.push(`expected multiple portrait options, found ${portraitCards.length}`);
  } else {
    await portraitCards[1].click();
    // Selecting a card re-renders the whole grid, so the original handle goes
    // stale (detached from the live DOM) — re-query rather than reuse it.
    const selectedClass = await page.$eval('.portrait-card:nth-child(2)', el => el.className);
    if (!/selected/.test(selectedClass || '')) errors.push('clicking a portrait did not mark it selected');
  }

  const titleFont = await page.$eval('.start-title', el => getComputedStyle(el).fontFamily).catch(() => '');
  if (!/Cinzel/i.test(titleFont)) errors.push(`start title font is "${titleFont}", expected Cinzel Decorative`);

  await page.fill('#nameInput', 'Ashgrove Test');
  await page.click('#beginBtn');

  await page.waitForSelector('#passage p', { timeout: 5000 });
  const appVisible = await page.$eval('#app', el => !el.hidden).catch(() => false);
  const startHidden = await page.$eval('#startScreen', el => el.hidden).catch(() => false);
  if (!appVisible || !startHidden) errors.push('beginning a game did not swap start screen for the app view');

  const identityName = await page.textContent('#identityName').catch(() => '');
  if (identityName.trim() !== 'Ashgrove Test') {
    errors.push(`identity chip shows "${identityName.trim()}", expected the entered name`);
  }

  let clicks = 0;
  let endingReached = null;
  let sawSave = false;

  // --- save / resume: play a little, reload the page, and continue the same run ---
  for (let i = 0; i < 12; i++) {
    const links = await page.$$('a.choice-link');
    if (links.length === 0) break;
    await links[i % links.length].click();
    clicks++;
    await page.waitForTimeout(20);
  }
  const before = await page.evaluate(() => {
    try { return JSON.parse(localStorage.getItem('blz-save-v1')); } catch (e) { return null; }
  });
  if (!before) {
    errors.push('no checkpoint written after 12 moves');
  } else {
    await page.reload();
    const panel = await page.waitForSelector('.resume-panel', { timeout: 5000 }).catch(() => null);
    if (!panel) {
      errors.push('reloading with a saved run did not offer to resume');
    } else {
      const resumeLinks = await page.$$('a.choice-link');
      if (resumeLinks.length !== 2) {
        errors.push(`resume prompt offered ${resumeLinks.length} options, expected continue + start over`);
      }
      await resumeLinks[0].click();
      await page.waitForSelector('#passage p', { timeout: 5000 });
      const after = await page.evaluate(() => {
        try { return JSON.parse(localStorage.getItem('blz-save-v1')); } catch (e) { return null; }
      });
      const samePassage = after && after.passage === before.passage;
      const sameNight = after && after.state.nightsPassed === before.state.nightsPassed;
      const sameHumanity = after && after.state.humanity === before.state.humanity;
      console.log('Resumed same passage/night/humanity:', samePassage, sameNight, sameHumanity);
      if (!samePassage || !sameNight || !sameHumanity) {
        errors.push('resuming did not restore the run faithfully');
      }
    }
  }

  for (let i = 0; i < MAX_CLICKS; i++) {
    // An ending is the terminal state: the card renders and the save is cleared.
    const ending = await page.$('.ending-card');
    if (ending) {
      endingReached = (await ending.textContent()).replace(/\s+/g, ' ').trim().slice(0, 80);
      break;
    }

    if (!sawSave) {
      const saved = await page.evaluate(() => {
        try { return localStorage.getItem('blz-save-v1'); } catch (e) { return null; }
      });
      if (saved) sawSave = true;
    }

    const links = await page.$$('a.choice-link');
    if (links.length === 0) {
      const snippet = (await page.textContent('#passage')).replace(/\s+/g, ' ').slice(0, 120);
      console.log(`Step ${i}: no choices left and no ending card. Passage: ${snippet}`);
      break;
    }
    // Rotate through the available options so a run covers varied content.
    await links[i % links.length].click();
    clicks++;
    await page.waitForTimeout(30);
  }

  console.log('Clicks performed:', clicks);
  console.log('Checkpoint written to localStorage during play:', sawSave);

  const gaugeVals = await page.$$eval('.gauge .val', els => els.map(e => e.textContent));
  console.log('Final gauge values:', gaugeVals);
  const powerTags = await page.$$eval('.disciplines-row .tag', els =>
    els.map(e => e.textContent.replace(/\s+/g, ' ').trim()));
  console.log('Powers shown:', powerTags.length ? powerTags : '(none surfaced)');

  if (endingReached) {
    console.log('Ending reached:', endingReached);
    const cleared = await page.evaluate(() => {
      try { return localStorage.getItem('blz-save-v1') === null; } catch (e) { return true; }
    });
    console.log('Save cleared at ending:', cleared);
    if (!cleared) errors.push('save was not cleared when the run ended');
    const againBtn = await page.$('.end-actions a.choice-link');
    if (!againBtn) {
      errors.push('ending offered no way to begin again');
    } else {
      await againBtn.click();
      const backToStart = await page.waitForSelector('#startScreen:not([hidden])', { timeout: 5000 }).catch(() => null);
      if (!backToStart) errors.push('"begin again" from an ending did not return to the start screen');
    }
  } else {
    errors.push(`no ending reached within ${MAX_CLICKS} clicks`);
  }

  if (failedRequests.length) {
    errors.push('non-optional resource(s) failed to load: ' + [...new Set(failedRequests)].join(', '));
  }

  console.log('Console/page errors:', errors.length);
  errors.forEach(e => console.log('  -', e));

  await browser.close();
  process.exitCode = errors.length ? 1 : 0;
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
