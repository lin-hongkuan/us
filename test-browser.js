// 简单的浏览器自动化测试脚本
// 使用 Puppeteer 来测试应用

const puppeteer = require('puppeteer');

(async () => {
  console.log('启动浏览器测试...');
  
  const browser = await puppeteer.launch({
    headless: false, // 显示浏览器窗口
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
    console.error('[请求失败]:', request.url(), request.failure().errorText);
  });
  
  try {
    console.log('导航到 http://localhost:3000/');
    await page.goto('http://localhost:3000/', { 
      waitUntil: 'networkidle2',
      timeout: 10000 
    });
    
    console.log('\n等待页面加载完成...');
    await page.waitForTimeout(2000);
    
    console.log('查找"可爱婷"按钮...');
    const herButton = await page.waitForSelector('button:has-text("可爱婷")', {
      timeout: 5000
    }).catch(() => {
      // 如果选择器不工作,尝试其他方式
      return page.evaluateHandle(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.find(btn => btn.textContent.includes('可爱婷'));
      });
    });
    
    if (herButton) {
      console.log('找到"可爱婷"按钮,准备点击...');
      await herButton.click();
      console.log('已点击"可爱婷"按钮');
      
      console.log('\n等待过渡动画...');
      await page.waitForTimeout(3000);
      
      console.log('检查是否进入主页面...');
      await page.waitForTimeout(2000);
    } else {
      console.error('未找到"可爱婷"按钮!');
    }
    
    console.log('\n=== 测试报告 ===');
    console.log(`控制台消息数: ${consoleMessages.length}`);
    console.log(`错误数: ${errors.length}`);
    
    if (errors.length > 0) {
      console.log('\n发现的错误:');
      errors.forEach((err, i) => {
        console.log(`${i + 1}. ${err}`);
      });
    }
    
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    const consoleWarnings = consoleMessages.filter(m => m.type === 'warning');
    
    if (consoleErrors.length > 0) {
      console.log('\n控制台错误:');
      consoleErrors.forEach((msg, i) => {
        console.log(`${i + 1}. ${msg.text}`);
      });
    }
    
    if (consoleWarnings.length > 0) {
      console.log('\n控制台警告:');
      consoleWarnings.forEach((msg, i) => {
        console.log(`${i + 1}. ${msg.text}`);
      });
    }
    
    console.log('\n测试完成!浏览器将保持打开状态以供检查...');
    console.log('按 Ctrl+C 退出');
    
    // 保持浏览器打开
    await new Promise(() => {});
    
  } catch (error) {
    console.error('测试过程中出错:', error.message);
    await browser.close();
    process.exit(1);
  }
})();
