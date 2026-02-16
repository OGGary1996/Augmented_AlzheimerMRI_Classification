import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Set viewport size
  await page.setViewportSize({ width: 1920, height: 1080 });
  
  // Navigate to the page
  console.log('Navigating to http://localhost:5174/...');
  await page.goto('http://localhost:5174/', { waitUntil: 'networkidle' });
  
  // Wait for the page to fully load
  await page.waitForTimeout(2000);
  
  // Take full page screenshot
  console.log('Taking full page screenshot...');
  await page.screenshot({ path: 'screenshot-fullpage.png', fullPage: true });
  
  // Scroll to the ChromaGrid section
  console.log('Scrolling to ChromaGrid section...');
  await page.evaluate(() => {
    const awarenessSection = document.querySelector('section[class*="py-32"]');
    if (awarenessSection) {
      awarenessSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
  
  // Wait for scroll animation
  await page.waitForTimeout(1500);
  
  // Take screenshot of the visible area
  console.log('Taking viewport screenshot...');
  await page.screenshot({ path: 'screenshot-chromagrid-viewport.png' });
  
  // Find and screenshot just the ChromaGrid component
  const chromaGridExists = await page.locator('div[class*="h-[600px]"]').count();
  
  if (chromaGridExists > 0) {
    console.log('Taking ChromaGrid component screenshot...');
    const chromaGrid = page.locator('div[class*="h-[600px]"]').first();
    await chromaGrid.screenshot({ path: 'screenshot-chromagrid-component.png' });
    console.log('✓ ChromaGrid component screenshot saved!');
  } else {
    console.log('ChromaGrid component not found');
  }
  
  console.log('\nScreenshots saved:');
  console.log('  - screenshot-fullpage.png (full page)');
  console.log('  - screenshot-chromagrid-viewport.png (viewport after scroll)');
  console.log('  - screenshot-chromagrid-component.png (ChromaGrid component only)');
  
  await browser.close();
  console.log('Done!');
})();
