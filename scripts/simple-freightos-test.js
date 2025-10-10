#!/usr/bin/env node

/**
 * Simple Freightos Connection Test
 * Just loads the page with cookies and takes a screenshot
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const COOKIE_FILE_PATH = path.join(__dirname, '..', 'src', 'cookie.json');

async function simpleTest() {
  let browser = null;
  let page = null;

  try {
    console.log('🧪 Simple Freightos Connection Test');
    console.log('===================================');

    // Load cookies
    console.log('🍪 Loading cookies...');
    const cookieData = fs.readFileSync(COOKIE_FILE_PATH, 'utf-8');
    const cookies = JSON.parse(cookieData);

    const playwrightCookies = cookies.map(cookie => ({
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path,
      httpOnly: cookie.httpOnly,
      secure: cookie.secure,
      sameSite: cookie.sameSite === 'lax' ? 'Lax' :
               cookie.sameSite === 'strict' ? 'Strict' :
               cookie.sameSite === 'no_restriction' ? 'None' :
               undefined,
      expires: cookie.expirationDate ? Math.floor(cookie.expirationDate) : undefined
    }));

    console.log(`✅ Loaded ${playwrightCookies.length} cookies`);

    // Launch browser
    console.log('🌐 Launching browser...');
    browser = await chromium.launch({
      headless: false, // Always visual for this test
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'
    });

    await context.addCookies(playwrightCookies);
    page = await context.newPage();

    // Test the correct Freightos URL
    const urlsToTry = [
      'https://ship.freightos.com/'
    ];

    for (const url of urlsToTry) {
      try {
        console.log(`🔍 Trying URL: ${url}`);
        await page.goto(url, {
          timeout: 30000,
          waitUntil: 'domcontentloaded'
        });

        await page.waitForTimeout(3000);

        const currentUrl = page.url();
        const title = await page.title();

        console.log(`✅ SUCCESS: ${url}`);
        console.log(`   → Current URL: ${currentUrl}`);
        console.log(`   → Page Title: ${title}`);

        // Take screenshot
        const filename = `freightos-${url.replace(/https?:\/\//, '').replace(/[\/\?]/g, '-')}.png`;
        await page.screenshot({ path: filename, fullPage: true });
        console.log(`   → Screenshot: ${filename}`);

        // Try to click "Find a Quote" button to reveal the form
        try {
          const findQuoteButton = await page.$('button:has-text("Find a Quote")');
          if (findQuoteButton) {
            console.log(`   → Clicking "Find a Quote" button...`);
            await findQuoteButton.click();
            await page.waitForTimeout(3000); // Wait for form to appear

            // Take another screenshot after clicking
            const afterClickFilename = `freightos-after-click-${url.replace(/https?:\/\//, '').replace(/[\/\?]/g, '-')}.png`;
            await page.screenshot({ path: afterClickFilename, fullPage: true });
            console.log(`   → Screenshot after click: ${afterClickFilename}`);
          }
        } catch (error) {
          console.log(`   → Could not click Find a Quote button: ${error.message}`);
        }

        // Check what form elements are available (after potential form reveal)
        const formElements = await page.evaluate(() => {
          const inputs = Array.from(document.querySelectorAll('input, textarea'));
          return inputs.map(input => ({
            type: input.type,
            name: input.name,
            placeholder: input.placeholder,
            id: input.id,
            className: input.className,
            visible: input.offsetParent !== null // Check if actually visible
          })).filter(input =>
            input.visible && (
              input.placeholder ||
              input.name?.toLowerCase().includes('address') ||
              input.name?.toLowerCase().includes('from') ||
              input.name?.toLowerCase().includes('to') ||
              input.name?.toLowerCase().includes('origin') ||
              input.name?.toLowerCase().includes('destination') ||
              input.placeholder?.toLowerCase().includes('from') ||
              input.placeholder?.toLowerCase().includes('to') ||
              input.placeholder?.toLowerCase().includes('origin') ||
              input.placeholder?.toLowerCase().includes('destination') ||
              input.placeholder?.toLowerCase().includes('address') ||
              input.placeholder?.toLowerCase().includes('city') ||
              input.placeholder?.toLowerCase().includes('port')
            )
          );
        });

        console.log(`   → Found ${formElements.length} visible form elements:`);
        if (formElements.length > 0) {
          formElements.forEach(el => {
            console.log(`     - ${el.type}: "${el.placeholder}" (name: ${el.name}, id: ${el.id})`);
          });
        } else {
          console.log(`     - No relevant visible form elements found`);

          // Let's also check for any inputs at all
          const allInputs = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('input, textarea, select')).map(input => ({
              type: input.type || input.tagName.toLowerCase(),
              name: input.name,
              placeholder: input.placeholder,
              id: input.id,
              visible: input.offsetParent !== null
            })).filter(input => input.visible);
          });

          console.log(`     - Found ${allInputs.length} total visible inputs:`);
          allInputs.slice(0, 10).forEach(el => {
            console.log(`       * ${el.type}: "${el.placeholder}" (${el.name})`);
          });
        }

        // Check for buttons
        const buttons = await page.evaluate(() => {
          return Array.from(document.querySelectorAll('button')).map(btn =>
            btn.textContent?.trim()
          ).filter(text => text && text.length < 50);
        });

        if (buttons.length > 0) {
          console.log(`   → Found buttons: ${buttons.slice(0, 10).join(', ')}`);
        }

        console.log('');

        // If this is the main page and has form elements, we found what we need
        if (url.includes('ship.freightos.com/') && formElements.length > 0) {
          console.log('🎉 Found the quote form on the main page!');
          break;
        }

      } catch (error) {
        console.log(`❌ FAILED: ${url} - ${error.message}`);
        console.log('');
      }
    }

    // Keep browser open for manual inspection
    console.log('🔍 Browser will stay open for 60 seconds for manual inspection...');
    console.log('   Check the page and form elements manually');
    await page.waitForTimeout(60000);

  } catch (error) {
    console.error('💥 Test failed:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

simpleTest();