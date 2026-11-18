'use strict';
// Renders assets/logo/*.svg to the PNGs Electron and electron-builder use.
// Needs Playwright with Chromium (dev-time only): node scripts/make-icon.js
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const assets = path.join(__dirname, '..', 'assets');
const jobs = [
  ['logo/icon.svg', 'icon.png', 512],
  ['logo/tray.svg', 'tray.png', 32],
  ['logo/tray.svg', 'tray@2x.png', 64],
];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const [src, out, size] of jobs) {
    const svg = fs.readFileSync(path.join(assets, src), 'utf8');
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`<style>html,body{margin:0;background:transparent}</style>
      <img src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}" width="${size}" height="${size}" style="display:block">`);
    await page.locator('img').screenshot({ path: path.join(assets, out), omitBackground: true });
    console.log('wrote', out);
  }
  await browser.close();
})();
