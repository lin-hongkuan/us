import { expect, test } from '@playwright/test';

test('shows login choices and enters the journal', async ({ page }) => {
  await page.goto('/');
  await page.addStyleTag({ content: '*, *::before, *::after { animation: none !important; transition: none !important; }' });

  await expect(page.getByRole('heading', { name: 'Us.' })).toBeVisible();
  await expect(page.getByRole('button', { name: /可爱婷/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /小男奴/ })).toBeVisible();

  await page.getByRole('button', { name: /可爱婷/ }).click();
  await expect(page.getByRole('heading', { name: "Ting's Journal" })).toBeVisible({ timeout: 15_000 });
});

test('opens the memory heatmap and jumps to a memory day', async ({ page }) => {
  await page.goto('/');
  await page.addStyleTag({ content: '*, *::before, *::after { animation: none !important; transition: none !important; }' });

  await page.getByRole('button', { name: /可爱婷/ }).click();
  await expect(page.getByRole('heading', { name: "Ting's Journal" })).toBeVisible({ timeout: 15_000 });

  await page.getByRole('button', { name: '打开记忆日历' }).click();
  await expect(page.getByTestId('memory-heatmap-dialog')).toBeVisible();
  await expect(page.getByRole('button', { name: '全部' })).toBeVisible();
  await page.getByRole('button', { name: '她的' }).click();
  await page.getByRole('button', { name: '他的' }).click();
  await page.getByRole('button', { name: '全部' }).click();

  const activeDay = page.getByTestId('memory-heatmap-active-day').first();
  await expect(activeDay).toBeVisible();
  await activeDay.click();

  await expect(page.getByTestId('memory-heatmap-dialog')).toBeHidden();
  await expect(page.locator('.memory-jump-highlight')).toBeVisible();
});
