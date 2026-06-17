import { chromium } from 'playwright'

const BASE = 'http://localhost:5173'
const OUT = '/tmp/shots'
const ADDRESS = 'Champ de Mars, 5 Av. Anatole France, 75007 Paris'

const browser = await chromium.launch({ headless: true })

async function shot(page, name, full = true) {
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: full })
  console.log('✓', name)
}

// ---------- Desktop ----------
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
const page = await ctx.newPage()

await page.goto(BASE, { waitUntil: 'load' })
await page.waitForTimeout(2500) // laisse Google Maps + fonts se charger
await shot(page, '01-home-desktop')

try {
  // Attend que le champ soit actif (Maps chargé), tape l'adresse et valide.
  await page.waitForSelector('input:not([disabled])', { timeout: 15000 })
  const input = page.locator('input[type="text"]').first()
  await input.click()
  await input.fill(ADDRESS)
  await page.waitForTimeout(1200)
  await input.press('Enter')
  // Attend la page Analyse du toit.
  await page.waitForSelector('text=Paramètres de votre toit', { timeout: 20000 })
  await page.waitForTimeout(3000) // données Solar + carte
  await shot(page, '02-analyse-desktop')

  // Lance le calcul → tableau de bord.
  await page.locator('text=Calculer mes économies').click()
  await page.waitForSelector('text=Votre potentiel solaire', { timeout: 15000 })
  await page.waitForTimeout(3500) // KPI + graphe + Eurostat
  await shot(page, '03-dashboard-desktop')
} catch (e) {
  console.log('⚠ parcours analyse/dashboard:', e.message)
  await shot(page, '02-analyse-FAILED')
}

// Contexte UE
await page.goto(`${BASE}/#contexte-ue`, { waitUntil: 'load' })
await page.waitForTimeout(3000)
await shot(page, '04-contexte-ue-desktop')

// À propos
await page.goto(`${BASE}/#a-propos`, { waitUntil: 'load' })
await page.waitForTimeout(1200)
await shot(page, '05-about-desktop')

await ctx.close()

// ---------- Mobile ----------
const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true })
const mpage = await mctx.newPage()
await mpage.goto(BASE, { waitUntil: 'load' })
await mpage.waitForTimeout(2500)
await shot(mpage, '06-home-mobile')
try {
  await mpage.locator('button[aria-label="Menu"]').click()
  await mpage.waitForTimeout(600)
  await shot(mpage, '07-menu-mobile', false)
} catch (e) {
  console.log('⚠ menu mobile:', e.message)
}
await mctx.close()

await browser.close()
console.log('Terminé.')
