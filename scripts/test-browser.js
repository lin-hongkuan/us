// 简单的浏览器自动化测试脚本
// 使用 Puppeteer 测试登录流程
// 运行前需: npm install puppeteer
// 运行: node scripts/test-browser.js（需先 npm run dev 启动服务）

import puppeteer from 'puppeteer';

(async () => {
  console.log('启动浏览器测试...');

  const browser = await puppeteer.launch({
    headless: 'new',
    defaultViewport: { width: 1280, height: 800 }
  });

  const page = await browser.newPage();

  // 监听控制台消息
  const consoleMessages = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleMessages.push({ type: msg.type(), text });
    console.log(`[浏览器 ${msg.type()}]:`, text);
  });

  // 监听页面错误
  const errors = [];
  page.on('pageerror', error => {
    errors.push(error.message);
    console.error('[页面错误]:', error.message);
  });

  page.on('requestfailed', request => {
    console.error('[请求失败]:', request.url(), request.failure()?.errorText || 'unknown');
  });

  try {
    console.log('导航到 http://localhost:3000/');
    await page.goto('http://localhost:3000/', {
      waitUntil: 'networkidle2',
      timeout: 15000
    });

    console.log('\n等待页面加载完成...');
    await page.waitForSelector('button', { timeout: 5000 });

    console.log('查找"可爱婷"按钮...');
    const clicked = await page.evaluate(() => {
      const button = Array.from(document.querySelectorAll('button')).find(btn =>
        btn.textContent?.includes('可爱婷')
      );
      if (!button) return false;
      button.click();
      return true;
    });

    if (clicked) {
      console.log('已点击"可爱婷"按钮');
      console.log('\n等待过渡动画...');
      await page.waitForTimeout(3000);
    } else {
      console.error('未找到"可爱婷"按钮!');
      errors.push('未找到"可爱婷"按钮');
    }

    console.log('\n=== 测试报告 ===');
    console.log(`控制台消息数: ${consoleMessages.length}`);
    console.log(`错误数: ${errors.length}`);

    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    const consoleWarnings = consoleMessages.filter(m => m.type === 'warning');

    if (errors.length > 0) {
      console.log('\n发现的页面错误:');
      errors.forEach((err, i) => console.log(`${i + 1}. ${err}`));
    }

    if (consoleErrors.length > 0) {
      console.log('\n控制台错误:');
      consoleErrors.forEach((msg, i) => console.log(`${i + 1}. ${msg.text}`));
    }

    if (consoleWarnings.length > 0) {
      console.log('\n控制台警告:');
      consoleWarnings.forEach((msg, i) => console.log(`${i + 1}. ${msg.text}`));
    }

    await browser.close();

    if (errors.length > 0 || consoleErrors.length > 0) {
      process.exit(1);
    }

    console.log('\n测试通过!');
  } catch (error) {
    console.error('测试过程中出错:', error.message);
    await browser.close();
    process.exit(1);
  }
})();
