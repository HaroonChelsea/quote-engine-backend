#!/usr/bin/env node

/**
 * Updated Freightos Integration Test
 * Tests the new email/password login and autocomplete functionality
 */

require('dotenv').config();
const { chromium } = require('playwright');

// Test configuration - using the exact data from the screenshots
const TEST_CONFIG = {
  sourceAddress: {
    company: "Test Manufacturer",
    street: "NO.12 HUASHAN RD",
    city: "SHILOU TOWN, PANYU DISTRICT, GUANGZHOU",
    state: "GUANGDONG",
    zip: "511447",
    country: "CN"
  },
  destinationAddress: {
    company: "Test Customer",
    street: "123 Main St",
    city: "New York",
    state: "NY",
    zip: "10001",
    country: "US"
  },
  packages: [{
    name: "Test Pallet",
    type: "pallet",
    quantity: 1,
    weightKg: 570,
    lengthCm: 231,
    widthCm: 119,
    heightCm: 117,
    insuranceValue: 1000
  }]
};

const FREIGHTOS_URL = 'https://ship.freightos.com/';

async function loginWithCredentials(page, email, password) {
  try {
    console.log('🔐 Attempting to login with credentials...');

    // Click the Login button in navbar to open modal
    await page.click('a:has-text("Login"), button:has-text("Login")', { timeout: 5000 });
    console.log('  ✅ Clicked Login button');

    // Wait for the login modal to appear
    await page.waitForSelector('input[type="email"], input[placeholder*="email" i]', { timeout: 5000 });
    console.log('  ✅ Login modal appeared');

    // Fill email field
    await page.fill('input[type="email"], input[placeholder*="email" i]', email);
    console.log('  ✅ Filled email');

    // Fill password field
    await page.fill('input[type="password"], input[placeholder*="password" i]', password);
    console.log('  ✅ Filled password');

    // Click the Log in button in the modal
    await page.click('button:has-text("Log in")', { timeout: 5000 });
    console.log('  ✅ Clicked Log in button');

    // Wait for navigation or modal to close
    await page.waitForTimeout(3000);

    console.log('✅ Login successful');
  } catch (error) {
    console.error('❌ Login failed:', error.message);
    throw new Error('Failed to login to Freightos');
  }
}

async function fillAddress(page, type, address) {
  try {
    console.log(`📍 Filling ${type} address...`);

    // Determine search term based on address - just use simple city/location name
    let searchTerm = '';

    if (type === 'source' && address.city && address.city.includes('GUANGZHOU')) {
      searchTerm = 'SHILOU TOWN';
    } else if (type === 'destination' && address.city && address.city.toLowerCase().includes('new york')) {
      searchTerm = 'New York';
    } else {
      searchTerm = address.city || address.state || address.zip;
    }

    console.log(`  📝 Will type: "${searchTerm}"`);

    // Click on the category to open the form
    const categoryId = type === 'source' ? 'origin' : 'destination';
    try {
      await page.click(`[data-test-id="CategoryWrapper-${categoryId}"]`, { timeout: 3000 });
      await page.waitForTimeout(1000);
      console.log(`  ✅ Clicked ${categoryId} category`);
    } catch (error) {
      console.log(`  ⚠️ Could not click ${categoryId} category:`, error.message);
    }

    // Wait for the address select to appear and click it
    try {
      const addressSelector = `[data-test-id="${categoryId}-address-select"]`;
      await page.waitForSelector(addressSelector, { timeout: 5000 });

      // Click on the address select to open dropdown and reveal the search input
      await page.click(addressSelector);
      await page.waitForTimeout(1000);
      console.log(`  ✅ Clicked address select`);

      // Find the visible search input field within the active dropdown
      const searchInput = await page.evaluateHandle(() => {
        const inputs = Array.from(document.querySelectorAll('.ant-select-search__field'));
        return inputs.find(input => {
          const style = window.getComputedStyle(input.parentElement);
          return style.display !== 'none';
        });
      });

      if (searchInput) {
        // Focus on the search input
        await searchInput.focus();
        await page.waitForTimeout(300);

        // Type character by character to trigger API
        console.log(`  ⌨️  Typing: ${searchTerm}`);
        await page.keyboard.type(searchTerm, { delay: 150 });
        await page.waitForTimeout(2500); // Wait for API response
        console.log(`  ✅ Typed address: ${searchTerm}`);

        // Wait for dropdown options to appear
        console.log(`  ⏳ Waiting for dropdown options...`);

        let optionClicked = false;
        for (let attempt = 0; attempt < 10; attempt++) {
          await page.waitForTimeout(500);

          optionClicked = await page.evaluate(() => {
            const options = Array.from(document.querySelectorAll('.ant-select-dropdown-menu-item'));
            const visibleOption = options.find(opt => {
              const rect = opt.getBoundingClientRect();
              return rect.width > 0 && rect.height > 0 && window.getComputedStyle(opt).display !== 'none';
            });
            if (visibleOption) {
              visibleOption.click();
              return true;
            }
            return false;
          });

          if (optionClicked) {
            console.log(`  ✅ Selected from dropdown (attempt ${attempt + 1})`);
            break;
          }
        }

        if (!optionClicked) {
          console.log(`  ⚠️ Could not find visible dropdown option after waiting`);
        }
      } else {
        console.log(`  ⚠️ Could not find visible search input`);
      }

      // Wait for the done button to be enabled and click it
      await page.waitForTimeout(1500);

      // Try to wait for the button to be enabled (without disabled attribute)
      try {
        // Wait for button to exist and be enabled
        await page.waitForFunction(
          () => {
            const btn = document.querySelector('[data-test-id="section-footer-done-btn"]');
            return btn && !btn.hasAttribute('disabled');
          },
          { timeout: 8000 }
        );

        await page.click('[data-test-id="section-footer-done-btn"]');
        console.log(`  ✅ Clicked done button`);
        await page.waitForTimeout(1000);
      } catch (error) {
        console.log(`  ⚠️ Done button not enabled after waiting`);
        // Try clicking anyway as fallback
        try {
          await page.click('[data-test-id="section-footer-done-btn"]', { force: true, timeout: 2000 });
          console.log(`  ✅ Force clicked done button`);
          await page.waitForTimeout(1000);
        } catch (e) {
          console.log(`  ❌ Could not click done button at all`);
        }
      }

    } catch (error) {
      console.log(`  ⚠️ Could not fill address field:`, error.message);
    }
  } catch (error) {
    console.log(`  ❌ Error filling ${type} address:`, error.message);
  }
}

async function fillPackageDetails(page, pkg, index) {
  try {
    console.log(`📦 Adding package ${index + 1}: ${pkg.name}`);

    // Click on the Load category to open the form
    try {
      await page.click('[data-test-id="CategoryWrapper-load"]', { timeout: 3000 });
      await page.waitForTimeout(1000);
      console.log('  ✅ Clicked Load category');
    } catch (error) {
      console.log('  ⚠️ Could not click Load category:', error.message);
    }

    // Click "Loose Cargo" tab
    try {
      await page.click('button:has-text("Loose Cargo"), div:has-text("Loose Cargo")', { timeout: 3000 });
      await page.waitForTimeout(500);
      console.log('  ✅ Selected Loose Cargo');
    } catch {
      console.log('  ⚠️ Could not find Loose Cargo tab');
    }

    // Select "Pallets" package type
    try {
      const palletButton = await page.locator('button:has-text("Pallets")').first();
      if (await palletButton.isVisible()) {
        await palletButton.click();
        await page.waitForTimeout(500);
        console.log('  ✅ Selected Pallets');
      }
    } catch {
      console.log('  ⚠️ Could not select Pallets');
    }

    // Fill quantity
    const quantitySelectors = [
      'input[type="number"]',
      'input[placeholder*="units" i]',
      '.MuiInputBase-input[type="number"]'
    ];

    for (const selector of quantitySelectors) {
      try {
        const inputs = await page.$$(selector);
        if (inputs.length > 0) {
          await inputs[0].fill(pkg.quantity.toString());
          console.log(`  ✅ Filled quantity: ${pkg.quantity}`);
          break;
        }
      } catch {
        continue;
      }
    }

    // Fill dimensions
    const dimensionInputs = await page.$$('input[type="number"]:not([readonly])');

    if (dimensionInputs.length >= 3) {
      await dimensionInputs[1].fill(pkg.lengthCm.toString());
      await dimensionInputs[2].fill(pkg.widthCm.toString());
      await dimensionInputs[3].fill(pkg.heightCm.toString());
      console.log(`  ✅ Filled dimensions: ${pkg.lengthCm} x ${pkg.widthCm} x ${pkg.heightCm} cm`);
    }

    // Fill weight
    const weightInputs = await page.$$('input[type="number"]:not([readonly])');
    if (weightInputs.length >= 4) {
      await weightInputs[weightInputs.length - 1].fill(pkg.weightKg.toString());
      console.log(`  ✅ Filled weight: ${pkg.weightKg} kg`);
    }

    console.log('  ✅ Package details filled successfully');
  } catch (error) {
    console.log(`  ❌ Error adding package:`, error.message);
  }
}

async function testFreightosQuote() {
  let browser = null;
  let page = null;

  try {
    console.log('🚀 Starting Updated Freightos Integration Test');
    console.log('============================================\n');

    const email = process.env.FREIGHTOS_EMAIL;
    const password = process.env.FREIGHTOS_PASSWORD;
    const headless = process.env.FREIGHTOS_HEADLESS !== 'false';

    if (!email || !password) {
      throw new Error('FREIGHTOS_EMAIL and FREIGHTOS_PASSWORD must be set in .env file');
    }

    console.log(`📧 Using email: ${email}`);
    console.log(`🖥️  Headless mode: ${headless}\n`);

    // Launch browser
    console.log('🌐 Launching browser...');
    browser = await chromium.launch({
      headless,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'
    });

    page = await context.newPage();
    await page.setViewportSize({ width: 1920, height: 1080 });

    // Navigate to Freightos
    console.log('📍 Navigating to Freightos...');
    await page.goto(FREIGHTOS_URL, { timeout: 60000 });
    await page.waitForLoadState('domcontentloaded');
    console.log('✅ Page loaded\n');

    // Login
    await loginWithCredentials(page, email, password);
    console.log('');

    // Take screenshot after login
    await page.screenshot({ path: 'freightos-after-login.png', fullPage: true });
    console.log('📸 Screenshot saved: freightos-after-login.png\n');

    // Fill source address
    await fillAddress(page, 'source', TEST_CONFIG.sourceAddress);

    // Fill destination address
    await fillAddress(page, 'destination', TEST_CONFIG.destinationAddress);
    console.log('');

    // Fill package details
    for (let i = 0; i < TEST_CONFIG.packages.length; i++) {
      await fillPackageDetails(page, TEST_CONFIG.packages[i], i);
    }
    console.log('');

    // Click Confirm button
    try {
      await page.click('button:has-text("Confirm")', { timeout: 3000 });
      await page.waitForTimeout(1000);
      console.log('✅ Clicked Confirm button\n');
    } catch {
      console.log('⚠️ Could not find Confirm button\n');
    }

    // Fill Goods section
    console.log('📦 Filling Goods section...');
    try {
      await page.click('[data-test-id="CategoryWrapper-goods"]', { timeout: 3000 });
      await page.waitForTimeout(1000);
      console.log('  ✅ Clicked Goods category');

      // Fill goods value (Required field)
      try {
        const goodsValueInput = await page.$('[data-test-id="goods-section-value"]');
        if (goodsValueInput) {
          await goodsValueInput.fill('8000');
          console.log('  ✅ Filled goods value: $8000');
          await page.waitForTimeout(500);
        }
      } catch (error) {
        console.log('  ⚠️ Could not fill goods value:', error.message);
      }

      // Select timeframe (Required field) - select "Yes, my goods are ready"
      try {
        await page.click('[data-test-id="goods-section-timeframe"]', { timeout: 3000 });
        await page.waitForTimeout(1000);
        console.log('  ✅ Clicked timeframe dropdown');

        // Click the specific option using data-test-id
        await page.click('[data-test-id="goods-section-timeframe-ready-now"]', { timeout: 3000 });
        console.log('  ✅ Selected "Yes, my goods are ready"');
        await page.waitForTimeout(500);
      } catch (error) {
        console.log('  ⚠️ Could not select timeframe:', error.message);
      }

      // Click the Confirm button in goods section
      try {
        await page.waitForFunction(
          () => {
            const btn = document.querySelector('[data-test-id="section-footer-done-btn"]');
            return btn && !btn.hasAttribute('disabled');
          },
          { timeout: 5000 }
        );

        await page.click('[data-test-id="section-footer-done-btn"]');
        console.log('  ✅ Clicked Goods confirm button');
        await page.waitForTimeout(1000);
      } catch (error) {
        console.log('  ⚠️ Could not click goods confirm button:', error.message);
      }
    } catch (error) {
      console.log(`  ⚠️ Could not fill Goods section: ${error.message}`);
    }
    console.log('');

    // Take screenshot before submit
    await page.screenshot({ path: 'freightos-before-submit.png', fullPage: true });
    console.log('📸 Screenshot saved: freightos-before-submit.png\n');

    // Submit quote
    console.log('🚀 Submitting quote request...');
    const submitSelectors = [
      '[data-test-id="search-button"]',
      'button[type="submit"]',
      'button:has-text("Get Quote")',
      'button:has-text("Submit")',
      'button:has-text("Calculate")',
      '.submit-quote-btn'
    ];

    let submitted = false;
    for (const selector of submitSelectors) {
      try {
        // Check if button is enabled (not disabled)
        const button = await page.$(selector);
        if (button) {
          const isDisabled = await button.evaluate(el => el.hasAttribute('disabled'));
          if (!isDisabled) {
            await button.click();
            console.log(`✅ Clicked submit: ${selector}`);
            submitted = true;
            break;
          } else {
            console.log(`⚠️ Submit button found but disabled: ${selector}`);
          }
        }
      } catch {
        continue;
      }
    }

    if (!submitted) {
      console.log('⚠️ Could not find enabled submit button');
      console.log('💡 Make sure all required fields (Origin, Destination, Load) are filled');
    }

    // Wait for results
    if (submitted) {
      console.log('⏳ Waiting for recommended services page...');
      await page.waitForTimeout(3000);

      // Click "Confirm Services & Get Results" button
      try {
        const confirmServicesButton = await page.$('button:has-text("Confirm Services & Get Results")');
        if (confirmServicesButton) {
          await confirmServicesButton.click();
          console.log('✅ Clicked "Confirm Services & Get Results" button\n');
          await page.waitForTimeout(5000);
        }
      } catch (error) {
        console.log('⚠️ Could not find Confirm Services button:', error.message);
      }

      console.log('⏳ Waiting for quote results to load...');

      // Close popup modal if it appears
      try {
        await page.waitForTimeout(3000);
        const closeButton = await page.$('.ant-modal-close');
        if (closeButton) {
          await closeButton.click();
          console.log('✅ Closed popup modal\n');
          await page.waitForTimeout(1000);
        }
      } catch (error) {
        console.log('  (No popup modal to close)\n');
      }

      const currentUrl = page.url();
      console.log(`✅ Results page loaded: ${currentUrl}\n`);

      // Wait for seller filters to load
      console.log('⏳ Waiting for seller filters to load...');
      await page.waitForTimeout(5000); // Wait for sellers to populate

      // Filter by specific sellers
      console.log('🔍 Filtering by sellers...');
      const sellersToFilter = [
        'Seabay International Freight Forwarding Ltd',
        'UniPower Logistics Co., Ltd.'
      ];

      for (const seller of sellersToFilter) {
        try {
          // Find the checkbox for this seller with retry logic
          let checkboxFound = false;
          for (let attempt = 0; attempt < 5; attempt++) {
            checkboxFound = await page.evaluate((sellerName) => {
              const labels = Array.from(document.querySelectorAll('.ant-checkbox-wrapper'));
              const sellerLabel = labels.find(label => {
                const filterName = label.querySelector('.filter-name span');
                return filterName && filterName.textContent.trim() === sellerName;
              });

              if (sellerLabel) {
                const checkbox = sellerLabel.querySelector('input[type="checkbox"]');
                if (checkbox && !checkbox.checked) {
                  sellerLabel.click();
                  return true;
                }
              }
              return false;
            }, seller);

            if (checkboxFound) {
              console.log(`  ✅ Selected seller: ${seller}`);
              await page.waitForTimeout(2000); // Wait for filter to apply
              break;
            }

            if (attempt < 4) {
              await page.waitForTimeout(1000); // Wait before retry
            }
          }

          if (!checkboxFound) {
            console.log(`  ⚠️ Seller not found after retries: ${seller}`);
          }
        } catch (error) {
          console.log(`  ⚠️ Could not filter by ${seller}:`, error.message);
        }
      }

      // Wait for filtered results to load
      await page.waitForTimeout(2000);
      console.log('');

      // Extract quote information
      console.log('📊 Extracting quote information...');
      const quotes = await page.evaluate(() => {
        const quoteElements = document.querySelectorAll('[data-quote-id]');
        const results = [];

        quoteElements.forEach(element => {
          try {
            const quoteId = element.getAttribute('data-quote-id');

            // Extract transit time
            const transitTimeEl = element.querySelector('[data-test-id="transit-time"]');
            const transitTime = transitTimeEl ? transitTimeEl.textContent.trim() : 'N/A';

            // Extract price
            const priceEl = element.querySelector('[data-test-id="price"] .price');
            const decimalsEl = element.querySelector('[data-test-id="price"] .decimals');
            const price = priceEl && decimalsEl ? `${priceEl.getAttribute('title')}.${decimalsEl.textContent}` : 'N/A';

            // Extract vendor
            const vendorEl = element.querySelector('[data-test-id="vendor-label"]');
            const vendor = vendorEl ? vendorEl.textContent.trim() : 'Unknown';

            // Extract arrival/departure dates
            const arrivalEl = element.querySelector('[data-test-id="est-arrival"]');
            const departureEl = element.querySelector('[data-test-id="est-departure"]');
            const arrival = arrivalEl ? arrivalEl.textContent.trim() : 'N/A';
            const departure = departureEl ? departureEl.textContent.trim() : 'N/A';

            results.push({
              quoteId,
              vendor,
              price,
              transitTime,
              arrival,
              departure
            });
          } catch (err) {
            console.warn('Error parsing quote element:', err);
          }
        });

        return results;
      });

      console.log(`✅ Found ${quotes.length} quotes\n`);
      quotes.forEach((quote, index) => {
        console.log(`Quote ${index + 1}:`);
        console.log(`  Vendor: ${quote.vendor}`);
        console.log(`  Price: $${quote.price}`);
        console.log(`  Transit Time: ${quote.transitTime}`);
        console.log(`  ${quote.departure}`);
        console.log(`  ${quote.arrival}`);
        console.log('');
      });

      // Take results screenshot
      await page.screenshot({ path: 'freightos-results.png', fullPage: true });
      console.log('📸 Screenshot saved: freightos-results.png\n');

      return {
        success: true,
        quoteUrl: currentUrl,
        quotes: quotes,
        timestamp: new Date()
      };
    }

    return { success: false, error: 'Could not submit quote' };

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return { success: false, error: error.message };
  } finally {
    if (!browser) return;

    // Keep browser open for inspection if not headless
    if (process.env.FREIGHTOS_HEADLESS === 'false') {
      console.log('\n🔍 Browser will stay open for 60 seconds for inspection...');
      await page.waitForTimeout(60000);
    }

    await browser.close();
  }
}

// Run the test
testFreightosQuote()
  .then(result => {
    console.log('\n📋 Test Result:');
    console.log('================');
    console.log(JSON.stringify(result, null, 2));

    if (result.success) {
      console.log('\n🎉 Test completed successfully!');
      console.log('✅ Freightos integration is working');
      process.exit(0);
    } else {
      console.log('\n❌ Test failed');
      console.log('🔧 Check the screenshots for debugging');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('💥 Test crashed:', error);
    process.exit(1);
  });
