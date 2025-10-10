#!/usr/bin/env node

/**
 * Freightos Integration Test Script
 *
 * This script tests the Freightos quote fetching functionality directly
 * without going through the full API stack.
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Test configuration
const TEST_CONFIG = {
  sourceAddress: {
    company: "Test Manufacturer",
    street: "NO.12 HUASHAN RD, SHILOU TOWN, PANYU DISTRICT",
    city: "GUANGZHOU",
    state: "GUANGDONG",
    zip: "511447",
    country: "China"
  },
  destinationAddress: {
    company: "Test Customer",
    street: "123 Main St",
    city: "New York",
    state: "NY",
    zip: "10001",
    country: "United States"
  },
  packages: [{
    name: "Test Pallet",
    type: "pallet",
    quantity: 1,
    weightKg: 100,
    lengthCm: 120,
    widthCm: 80,
    heightCm: 100,
    insuranceValue: 1000
  }]
};

const COOKIE_FILE_PATH = path.join(__dirname, '..', 'src', 'cookie.json');
const FREIGHTOS_URL = 'https://ship.freightos.com/';

async function loadCookies() {
  try {
    const cookieData = fs.readFileSync(COOKIE_FILE_PATH, 'utf-8');
    const cookies = JSON.parse(cookieData);

    return cookies.map(cookie => ({
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
  } catch (error) {
    console.error('❌ Failed to load cookies:', error.message);
    process.exit(1);
  }
}

async function testFreightosQuote(headless = true) {
  let browser = null;
  let page = null;

  try {
    console.log('🚀 Starting Freightos quote test...');

    // Load cookies
    console.log('🍪 Loading session cookies...');
    const cookies = await loadCookies();
    console.log(`✅ Loaded ${cookies.length} cookies`);

    // Launch browser
    console.log('🌐 Launching browser...');
    browser = await chromium.launch({
      headless,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'
    });

    // Add cookies to context
    await context.addCookies(cookies);

    page = await context.newPage();
    await page.setViewportSize({ width: 1920, height: 1080 });

    // Navigate to main Freightos page with longer timeout
    console.log('📍 Navigating to Freightos main page...');
    try {
      await page.goto(FREIGHTOS_URL, {
        timeout: 60000,
        waitUntil: 'domcontentloaded'  // Don't wait for all resources
      });
    } catch (error) {
      console.log('⚠️ Initial navigation timed out, trying with networkidle...');
      await page.goto(FREIGHTOS_URL, {
        timeout: 60000,
        waitUntil: 'networkidle'
      });
    }

    console.log('✅ Page loaded successfully');
    await page.waitForTimeout(3000); // Give dynamic content time to load

    // Take screenshot for debugging
    await page.screenshot({ path: 'freightos-page.png', fullPage: true });
    console.log('📸 Screenshot saved as freightos-page.png');

    // Check if we're logged in (optional - can proceed without login)
    console.log('🔐 Checking login status...');
    const loginIndicators = [
      '.user-menu',
      '[data-testid="user-menu"]',
      '.navbar .dropdown',
      '.header-user',
      'button:has-text("Profile")',
      'a:has-text("Dashboard")'
    ];

    let isLoggedIn = false;
    for (const selector of loginIndicators) {
      try {
        await page.waitForSelector(selector, { timeout: 2000 });
        console.log(`✅ User is logged in (${selector})`);
        isLoggedIn = true;
        break;
      } catch {
        continue;
      }
    }

    if (!isLoggedIn) {
      console.log('⚠️ User may not be logged in - proceeding with guest quote');
      console.log('📋 Current page URL:', page.url());
      console.log('📋 Current page title:', await page.title());
    }

    // Look for quote form elements on the landing page
    console.log('📝 Looking for quote form elements...');
    const formSelectors = [
      'input[placeholder*="From"]',
      'input[placeholder*="To"]',
      'input[placeholder*="Origin"]',
      'input[placeholder*="Destination"]',
      'form',
      '.quote-form',
      '[data-testid="quote-form"]'
    ];

    let formFound = false;
    for (const selector of formSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 5000 });
        console.log(`✅ Quote form element found: ${selector}`);
        formFound = true;
        break;
      } catch {
        continue;
      }
    }

    if (!formFound) {
      console.log('❌ Could not find quote form elements on page');
      console.log('📋 Page content preview:');
      const bodyText = await page.textContent('body');
      console.log(bodyText.substring(0, 500) + '...');
      return { success: false, error: 'Quote form not found' };
    }

    // Try to fill addresses
    console.log('📍 Attempting to fill addresses...');

    // Source address
    const sourceAddressSelectors = [
      'input[placeholder*="From"]',
      'input[placeholder*="Origin"]',
      'input[name*="origin"]',
      'input[name*="from"]'
    ];

    let sourceAddressFilled = false;
    for (const selector of sourceAddressSelectors) {
      try {
        const elements = await page.$$(selector);
        if (elements.length > 0) {
          const sourceAddress = `${TEST_CONFIG.sourceAddress.street}, ${TEST_CONFIG.sourceAddress.city}, ${TEST_CONFIG.sourceAddress.state} ${TEST_CONFIG.sourceAddress.zip}, ${TEST_CONFIG.sourceAddress.country}`;
          await elements[0].fill(sourceAddress);
          console.log(`✅ Source address filled: ${selector}`);
          sourceAddressFilled = true;
          break;
        }
      } catch (error) {
        continue;
      }
    }

    // Destination address
    const destAddressSelectors = [
      'input[placeholder*="To"]',
      'input[placeholder*="Destination"]',
      'input[name*="destination"]',
      'input[name*="to"]'
    ];

    let destAddressFilled = false;
    for (const selector of destAddressSelectors) {
      try {
        const elements = await page.$$(selector);
        if (elements.length > 0) {
          const destAddress = `${TEST_CONFIG.destinationAddress.street}, ${TEST_CONFIG.destinationAddress.city}, ${TEST_CONFIG.destinationAddress.state} ${TEST_CONFIG.destinationAddress.zip}, ${TEST_CONFIG.destinationAddress.country}`;
          await elements[0].fill(destAddress);
          console.log(`✅ Destination address filled: ${selector}`);
          destAddressFilled = true;
          break;
        }
      } catch (error) {
        continue;
      }
    }

    // Wait for autocomplete
    if (sourceAddressFilled || destAddressFilled) {
      console.log('⏳ Waiting for address autocomplete...');
      await page.waitForTimeout(3000);
    }

    // Try to fill package details
    console.log('📦 Attempting to fill package details...');
    const pkg = TEST_CONFIG.packages[0];

    const packageFields = {
      quantity: ['input[name*="quantity"]', 'input[placeholder*="Quantity"]'],
      weight: ['input[name*="weight"]', 'input[placeholder*="Weight"]'],
      length: ['input[name*="length"]', 'input[placeholder*="Length"]'],
      width: ['input[name*="width"]', 'input[placeholder*="Width"]'],
      height: ['input[name*="height"]', 'input[placeholder*="Height"]']
    };

    const packageData = {
      quantity: pkg.quantity.toString(),
      weight: pkg.weightKg.toString(),
      length: pkg.lengthCm.toString(),
      width: pkg.widthCm.toString(),
      height: pkg.heightCm.toString()
    };

    for (const [field, selectors] of Object.entries(packageFields)) {
      let fieldFilled = false;
      for (const selector of selectors) {
        try {
          const elements = await page.$$(selector);
          if (elements.length > 0) {
            await elements[0].fill(packageData[field]);
            console.log(`✅ ${field} filled: ${packageData[field]}`);
            fieldFilled = true;
            break;
          }
        } catch (error) {
          continue;
        }
      }

      if (!fieldFilled) {
        console.log(`⚠️ Could not fill ${field}`);
      }
    }

    // Try to submit the form
    console.log('🚀 Attempting to submit quote request...');
    const submitSelectors = [
      'button:has-text("Get quotes")',
      'button:has-text("Get Quote")',
      'button:has-text("Search")',
      'button:has-text("Find rates")',
      'button[type="submit"]'
    ];

    let submitted = false;
    for (const selector of submitSelectors) {
      try {
        await page.click(selector, { timeout: 3000 });
        console.log(`✅ Submit button clicked: ${selector}`);
        submitted = true;
        break;
      } catch (error) {
        continue;
      }
    }

    if (!submitted) {
      console.log('⚠️ Could not find or click submit button');
      console.log('📋 Available buttons:');
      const buttons = await page.$$eval('button', buttons =>
        buttons.map(btn => btn.textContent?.trim()).filter(text => text)
      );
      console.log(buttons.slice(0, 10));
    }

    // Wait for results
    if (submitted) {
      console.log('⏳ Waiting for quote results...');
      await page.waitForLoadState('networkidle', { timeout: 30000 });
      await page.waitForTimeout(5000);

      // Take results screenshot
      await page.screenshot({ path: 'freightos-results.png', fullPage: true });
      console.log('📸 Results screenshot saved as freightos-results.png');

      // Extract current URL (should be results page)
      const currentUrl = page.url();
      console.log('📋 Current URL:', currentUrl);

      // Try to extract quotes
      console.log('💰 Attempting to extract quotes...');
      const quotes = await page.evaluate(() => {
        const quoteElements = document.querySelectorAll('.quote-option, .shipping-option, .carrier-option, .rate-card, .quote-card');
        const results = [];

        quoteElements.forEach((element, index) => {
          try {
            const carrier = element.querySelector('.carrier-name, .provider-name, .company-name')?.textContent?.trim() || `Carrier ${index + 1}`;
            const service = element.querySelector('.service-name, .service-type, .shipping-method')?.textContent?.trim() || 'Standard';
            const priceElement = element.querySelector('.price, .cost, .rate, .amount');
            const priceText = priceElement?.textContent?.trim() || '0';
            const price = parseFloat(priceText.replace(/[^0-9.]/g, ''));
            const transitDays = element.querySelector('.transit-time, .delivery-time, .days')?.textContent?.trim() || 'N/A';

            if (!isNaN(price) && price > 0) {
              results.push({
                carrier,
                service,
                price,
                transitDays,
                element: element.className
              });
            }
          } catch (err) {
            console.warn('Error parsing quote element:', err);
          }
        });

        return results;
      });

      console.log(`📊 Extracted ${quotes.length} quotes:`);
      quotes.forEach((quote, index) => {
        console.log(`  ${index + 1}. ${quote.carrier} - ${quote.service}: $${quote.price} (${quote.transitDays})`);
      });

      return {
        success: true,
        quoteUrl: currentUrl,
        quotes: quotes,
        timestamp: new Date()
      };
    }

    return { success: false, error: 'Could not submit quote form' };

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return { success: false, error: error.message };
  } finally {
    if (page) await page.close();
    if (browser) await browser.close();
  }
}

// Run the test
const args = process.argv.slice(2);
const headless = !args.includes('--visual');

console.log('🧪 Freightos Integration Test');
console.log('=============================');
console.log(`Headless mode: ${headless}`);
console.log('');

testFreightosQuote(headless)
  .then(result => {
    console.log('');
    console.log('📋 Test Result:');
    console.log('================');
    console.log(JSON.stringify(result, null, 2));

    if (result.success) {
      console.log('');
      console.log('🎉 Test completed successfully!');
      console.log('✅ Freightos integration is working');
    } else {
      console.log('');
      console.log('❌ Test failed');
      console.log('🔧 Check the screenshots and logs for debugging');
    }
  })
  .catch(error => {
    console.error('💥 Test crashed:', error);
    process.exit(1);
  });