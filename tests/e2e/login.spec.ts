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

test('opens settings from the user button long press', async ({ page }) => {
  await page.goto('/');
  await page.addStyleTag({ content: '*, *::before, *::after { animation: none !important; transition: none !important; }' });

  await page.getByRole('button', { name: /可爱婷/ }).click();
  await expect(page.getByRole('heading', { name: "Ting's Journal" })).toBeVisible({ timeout: 15_000 });

  const userButton = page.getByRole('button', { name: /长按打开设置/ });
  const box = await userButton.boundingBox();
  expect(box).not.toBeNull();

  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(760);
  await page.mouse.up();

  const settingsPanel = page.getByTestId('settings-panel');
  await expect(settingsPanel).toBeVisible();
  await expect(settingsPanel.getByRole('heading', { name: '属于我们的小调整' })).toBeVisible();
  await settingsPanel.getByRole('tab').nth(2).click();
  await expect(settingsPanel.getByRole('button', { name: /导出 JSON 备份/ })).toBeVisible();
  await expect(settingsPanel.getByRole('button', { name: /打开记忆日历/ })).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  await settingsPanel.getByRole('button', { name: /导出 JSON 备份/ }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^us-memories-\d{8}\.json$/);

  await page.keyboard.press('Escape');
  await expect(page.getByTestId('settings-panel')).toBeHidden();

  await userButton.click();
  await expect(page.getByRole('button', { name: /可爱婷/ })).toBeVisible();
});
