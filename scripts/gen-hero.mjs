import { chromium } from 'playwright'
const BASE = 'http://localhost:5173'
const ADDRESS = 'Galeries Lafayette Haussmann, Paris'
const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext({ viewport: { width: 1500, height: 1000 }, deviceScaleFactor: 2 })
const page = await ctx.newPage()
page.on('console', (m) => { if (m.type() === 'error') console.log('PAGE ERR:', m.text()) })
await page.goto(BASE, { waitUntil: 'load' }); await page.waitForTimeout(2500)
await page.waitForSelector('input:not([disabled])', { timeout: 15000 })
const input = page.locator('input[type="text"]').first()
await input.click(); await input.fill(ADDRESS); await page.waitForTimeout(1500); await input.press('Enter')
await page.waitForSelector('text=Paramètres de votre toit', { timeout: 20000 })
await page.waitForTimeout(2000)
// Pousse la surface au max → tous les panneaux dessinés
const surf = page.locator('input[type="number"]').first()
await surf.fill('99999'); await surf.press('Tab'); await page.waitForTimeout(1500)
await page.waitForTimeout(11000) // flux GeoTIFF
await page.evaluate(() => {
  const sec = [...document.querySelectorAll('section')].find(s => s.textContent.includes('Vue satellite du toit'))
  if (sec) sec.querySelectorAll('.z-10, [class*="top-4"][class*="right-4"]').forEach(el => { el.style.display = 'none' })
})
await page.waitForTimeout(500)
const sec = page.locator('section').filter({ hasText: 'Vue satellite du toit' }).first()
await sec.screenshot({ path: 'public/hero-roof.png' })
console.log('✓ hero-roof.png')
await browser.close(); console.log('done')
