import { expect, test, type Page } from '@playwright/test'

/** Rola a página inteira em passos, como uma pessoa faria. */
async function scrollThrough(page: Page) {
  const height = await page.evaluate(() => document.documentElement.scrollHeight)
  const step = await page.evaluate(() => Math.round(window.innerHeight * 0.5))
  for (let y = 0; y <= height; y += step) {
    await page.evaluate((v) => window.scrollTo(0, v), y)
    await page.waitForTimeout(120)
  }
}

test('a jornada constrói as seis cidades sem erros', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))

  await page.goto('/')
  await expect(page.locator('#cover-title')).toContainText(/Jorge/i)
  await expect(page.locator('.realm-loading')).toHaveClass(/is-done/, { timeout: 30_000 })
  for (const id of ['perfil', 'formacao', 'cursos', 'habilidades', 'projetos', 'contato']) await expect(page.locator(`#${id}`)).toHaveCount(1)

  await scrollThrough(page)
  await expect(page.locator('.built-count')).toHaveText('6/6', { timeout: 20_000 })
  await expect(page.locator('a[href^="mailto:"]').first()).toBeAttached()
  expect(errors).toEqual([])
})

test('sem WebGL a página mostra o conteúdo sem o mapa', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
      if (type.startsWith('webgl')) return null
      return (original as (...a: unknown[]) => unknown).call(this, type, ...rest)
    } as typeof original
  })
  await page.goto('/')
  await expect(page.locator('main')).toHaveClass(/is-flat/, { timeout: 15_000 })
  await expect(page.locator('#habilidades .house-panel')).toBeVisible()
})

test('o regulador de som abre, muda e lembra o volume', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /regulador de som/i }).click()
  const slider = page.getByRole('slider').nth(1)
  await slider.fill('30')
  await expect(slider).toHaveValue('30')
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('jorge-mix') ?? '{}'))
  expect(saved.music).toBeCloseTo(0.3)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('slider')).toHaveCount(0)
})

test('inglês tem endereço próprio e o moodboard abre', async ({ page }) => {
  await page.goto('/')
  await page.locator('.language-toggle').click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page).toHaveURL(/\/en$/)
  await page.goto('/en')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page).toHaveTitle(/Realm of Systems/)
  await expect(page.locator('link[rel=alternate][hreflang=pt-BR]')).toHaveCount(1)
  await page.goto('/moodboard')
  await expect(page.locator('h1')).toBeVisible()
  await expect(page.getByRole('button', { name: /Tema do Reino/i })).toBeVisible()
})

test('endereço desconhecido mostra a página 404 do reino', async ({ page }) => {
  const res = await page.goto('/estrada-perdida')
  expect(res?.status()).toBe(404)
  await expect(page.getByRole('link', { name: /voltar ao reino/i })).toBeVisible()
})

test('modo leitura desliga o 3D, é lembrado e volta ao mapa', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('canvas').first()).toBeAttached({ timeout: 30_000 })
  await page.getByRole('button', { name: /modo leitura/i }).click()
  await expect(page.locator('main')).toHaveClass(/is-flat/)
  await expect(page.locator('.realm-canvas')).toHaveCount(0)
  await expect(page.locator('#projetos .house-panel')).toBeVisible()
  await page.reload()
  await expect(page.locator('main')).toHaveClass(/is-flat/)
  await page.getByRole('button', { name: /voltar ao mapa 3d/i }).click()
  await expect(page.locator('main')).not.toHaveClass(/is-flat/)
  await expect(page.locator('.realm-loading')).toHaveClass(/is-done/, { timeout: 30_000 })
  await expect(page.locator('.realm-canvas canvas')).toBeAttached()
})
