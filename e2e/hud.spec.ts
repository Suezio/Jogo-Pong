import { test, expect } from '@playwright/test'

test.describe('HyperPong 3D HUD', () => {
  test('permite iniciar, pausar, salvar e resetar com persistência de placar', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('heading', { name: 'HyperPong 3D' })).toBeVisible()
    await expect(page.getByText('Rounds: 0')).toBeVisible()

    const startButton = page.getByRole('button', { name: 'Iniciar' })
    await startButton.click()

    await expect(page.getByRole('button', { name: 'Pausar' })).toBeVisible({ timeout: 2000 })

    await page.getByRole('button', { name: 'Pausar' }).click()
    await expect(page.getByRole('button', { name: 'Iniciar' })).toBeVisible()

    await page.getByRole('button', { name: 'Resetar' }).click()
    await expect(page.getByText('Rounds: 0')).toBeVisible()

    await page.getByRole('button', { name: 'Salvar' }).click()
    await expect(page.getByText('Placar salvo com sucesso')).toBeVisible()

    const stored = await page.evaluate(() => window.localStorage.getItem('hyperpong.save.v1'))
    expect(stored).not.toBeNull()
  })
})
