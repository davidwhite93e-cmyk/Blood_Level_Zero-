const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push('pageerror: ' + err.message));

  const filePath = 'file://' + path.resolve(__dirname, '..', 'index.html');
  await page.goto(filePath);
  await page.waitForSelector('#passage p', { timeout: 5000 });

  const title = await page.title();
  console.log('Title:', title);

  let clicks = 0;
  for (let i = 0; i < 40; i++) {
    const passageText = await page.textContent('#passage');
    const hungerVal = await page.textContent('.gauge.hunger .val').catch(() => 'n/a');
    const links = await page.$$('a.choice-link');
    if (links.length === 0) {
      console.log(`Step ${i}: no choices left. passage snippet: ${passageText.slice(0,80)}`);
      break;
    }
    // prefer variety: alternate index
    const idx = i % links.length;
    const text = await links[idx].textContent();
    await links[idx].click();
    clicks++;
    await page.waitForTimeout(60);
  }

  console.log('Clicks performed:', clicks);
  console.log('Console/page errors:', errors.length);
  errors.forEach(e => console.log(' -', e));

  // check gauges rendered with numeric values
  const gaugeVals = await page.$$eval('.gauge .val', els => els.map(e => e.textContent));
  console.log('Final gauge values:', gaugeVals);

  const discTags = await page.$$eval('.disciplines-row .tag', els => els.map(e => e.textContent));
  console.log('Disciplines shown:', discTags);

  await browser.close();
  process.exitCode = errors.length ? 1 : 0;
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
