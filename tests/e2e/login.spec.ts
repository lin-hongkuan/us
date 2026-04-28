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
