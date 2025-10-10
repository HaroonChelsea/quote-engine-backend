import { Injectable, Logger } from '@nestjs/common';
import { chromium, Browser, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

export interface FreightosQuoteInput {
  // Source address (fixed - manufacturer's address)
  sourceAddress: {
    company?: string;
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };

  // Destination address (customer's address)
  destinationAddress: {
    company?: string;
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };

  // Package dimensions and details
  packages: Array<{
    name: string;
    type: 'pallet' | 'box';
    quantity: number;
    weightKg: number;
    lengthCm: number;
    widthCm: number;
    heightCm: number;
    insuranceValue?: number; // USD
  }>;

  // Additional options
  insuranceRequired?: boolean;
  expedited?: boolean;
}

export interface FreightosQuoteResult {
  success: boolean;
  quoteUrl?: string; // The permanent URL that can be used to book the quote
  quotes?: Array<{
    carrier: string;
    service: string;
    price: number;
    transitDays: string;
    details: string;
  }>;
  error?: string;
  timestamp: Date;
}

interface FreightosCookie {
  domain: string;
  expirationDate?: number;
  hostOnly: boolean;
  httpOnly: boolean;
  name: string;
  path: string;
  sameSite?: string | null;
  secure: boolean;
  session: boolean;
  storeId?: string | null;
  value: string;
}

@Injectable()
export class FreightosService {
  private readonly logger = new Logger(FreightosService.name);
  private readonly FREIGHTOS_URL = 'https://ship.freightos.com/';
  private readonly COOKIE_FILE_PATH = path.join(__dirname, '..', 'cookie.json');
  private readonly FREIGHTOS_EMAIL = process.env.FREIGHTOS_EMAIL;
  private readonly FREIGHTOS_PASSWORD = process.env.FREIGHTOS_PASSWORD;

  constructor() {}

  /**
   * Main method to get quote from Freightos
   */
  async getFreightosQuote(input: FreightosQuoteInput): Promise<FreightosQuoteResult> {
    let browser: Browser | null = null;
    let page: Page | null = null;

    try {
      this.logger.log('Starting Freightos quote process');

      // Launch browser
      const headless = process.env.FREIGHTOS_HEADLESS !== 'false';
      browser = await chromium.launch({
        headless,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'
      });

      page = await context.newPage();

      // Set viewport
      await page.setViewportSize({ width: 1920, height: 1080 });

      // Navigate to main Freightos page
      await page.goto(this.FREIGHTOS_URL);
      await page.waitForLoadState('domcontentloaded');

      // Try to login with email/password if provided
      if (this.FREIGHTOS_EMAIL && this.FREIGHTOS_PASSWORD) {
        await this.loginWithCredentials(page);
      } else {
        // Fallback to cookies if no credentials provided
        try {
          const cookies = await this.loadCookies();
          await context.addCookies(cookies);
          await page.reload();
          await page.waitForLoadState('domcontentloaded');
        } catch (error) {
          this.logger.warn('No credentials or cookies available, proceeding as guest');
        }
      }

      // Fill form and get quote
      const quoteResult = await this.createQuote(page, input);

      return {
        success: true,
        ...quoteResult,
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error('Error getting Freightos quote:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date()
      };
    } finally {
      if (page) await page.close();
      if (browser) await browser.close();
    }
  }

  /**
   * Login with email and password using the modal on homepage
   */
  private async loginWithCredentials(page: Page): Promise<void> {
    try {
      this.logger.log('Attempting to login with credentials');

      if (!this.FREIGHTOS_EMAIL || !this.FREIGHTOS_PASSWORD) {
        throw new Error('FREIGHTOS_EMAIL and FREIGHTOS_PASSWORD must be set in environment variables');
      }

      // Click the Login button in navbar to open modal
      await page.click('a:has-text("Login"), button:has-text("Login")', { timeout: 5000 });

      // Wait for the login modal to appear
      await page.waitForSelector('input[type="email"], input[placeholder*="email" i]', { timeout: 5000 });

      // Fill email field
      await page.fill('input[type="email"], input[placeholder*="email" i]', this.FREIGHTOS_EMAIL);

      // Fill password field
      await page.fill('input[type="password"], input[placeholder*="password" i]', this.FREIGHTOS_PASSWORD);

      // Click the Log in button in the modal
      await page.click('button:has-text("Log in")', { timeout: 5000 });

      // Wait for navigation or modal to close
      await page.waitForTimeout(3000);

      this.logger.log('Login successful');
    } catch (error) {
      this.logger.error('Login failed:', error.message);
      throw new Error('Failed to login to Freightos');
    }
  }

  /**
   * Load cookies from the cookie.json file
   */
  private async loadCookies(): Promise<Array<{
    name: string;
    value: string;
    domain: string;
    path: string;
    httpOnly: boolean;
    secure: boolean;
    sameSite?: 'Strict' | 'Lax' | 'None';
    expires?: number;
  }>> {
    try {
      const cookieData = await fs.promises.readFile(this.COOKIE_FILE_PATH, 'utf-8');
      const cookies: FreightosCookie[] = JSON.parse(cookieData);

      // Convert to Playwright cookie format
      const playwrightCookies = cookies.map(cookie => ({
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path,
        httpOnly: cookie.httpOnly,
        secure: cookie.secure,
        sameSite: cookie.sameSite === 'lax' ? 'Lax' as const :
                 cookie.sameSite === 'strict' ? 'Strict' as const :
                 cookie.sameSite === 'no_restriction' ? 'None' as const :
                 undefined,
        expires: cookie.expirationDate ? Math.floor(cookie.expirationDate) : undefined
      }));

      this.logger.log(`Loaded ${playwrightCookies.length} cookies from ${this.COOKIE_FILE_PATH}`);
      return playwrightCookies;
    } catch (error) {
      this.logger.error('Failed to load cookies:', error.message);
      throw new Error('Could not load Freightos session cookies. Please ensure cookie.json file exists and is valid.');
    }
  }

  /**
   * Verify that we're logged in by checking for user session
   */
  private async verifyLogin(page: Page): Promise<boolean> {
    try {
      // Check for elements that indicate logged-in state
      const loginIndicators = [
        '.user-menu',
        '[data-testid="user-menu"]',
        '.navbar .dropdown',
        '.header-user',
        'button:has-text("Profile")',
        'a:has-text("Dashboard")'
      ];

      for (const selector of loginIndicators) {
        try {
          await page.waitForSelector(selector, { timeout: 2000 });
          this.logger.log('Login verification successful');
          return true;
        } catch {
          continue;
        }
      }

      // If no login indicators found, might need to refresh cookies
      this.logger.warn('Could not verify login status - cookies may be expired');
      return false;
    } catch (error) {
      this.logger.error('Login verification failed:', error.message);
      return false;
    }
  }

  /**
   * Create a quote on Freightos
   */
  private async createQuote(page: Page, input: FreightosQuoteInput): Promise<Partial<FreightosQuoteResult>> {
    this.logger.log('Creating quote on Freightos');

    // Navigate to main Freightos page (the landing page with the form)
    await page.goto(this.FREIGHTOS_URL);

    // Wait for page to load
    await page.waitForLoadState('domcontentloaded');

    // Wait a bit for dynamic content to load
    await page.waitForTimeout(2000);

    // Verify login status (optional - we can proceed even if not logged in for basic quotes)
    const isLoggedIn = await this.verifyLogin(page);
    if (isLoggedIn) {
      this.logger.log('User is logged in to Freightos');
    } else {
      this.logger.warn('User may not be logged in - proceeding with guest quote');
    }

    // Fill source address
    await this.fillAddress(page, 'source', input.sourceAddress);

    // Fill destination address
    await this.fillAddress(page, 'destination', input.destinationAddress);

    // Add packages
    for (let i = 0; i < input.packages.length; i++) {
      await this.addPackage(page, input.packages[i], i);
    }

    // Click "Confirm" button after filling load information
    try {
      await page.click('button:has-text("Confirm")', { timeout: 3000 });
      await page.waitForTimeout(1000);
      this.logger.log('Clicked Confirm button');
    } catch (error) {
      this.logger.warn('Could not find Confirm button, continuing...');
    }

    // Fill Goods section
    await this.fillGoodsSection(page, input.packages);

    // Submit quote request
    await this.submitQuote(page);

    // Wait for recommended services page and confirm
    await this.confirmServices(page);

    // Handle popup modal if it appears
    await this.closePopupModal(page);

    // Apply seller filters
    await this.applySellersFilter(page);

    // Wait for results and extract quote information
    const quoteData = await this.extractQuoteResults(page);

    return quoteData;
  }

  /**
   * Fill address fields (source or destination)
   */
  private async fillAddress(page: Page, type: 'source' | 'destination', address: any): Promise<void> {
    try {
      // Determine search term based on address - just use simple city/location name
      let searchTerm = '';

      if (type === 'source' && address.city && address.city.includes('GUANGZHOU')) {
        searchTerm = 'SHILOU TOWN';
      } else if (type === 'destination' && address.city && address.city.toLowerCase().includes('new york')) {
        searchTerm = 'New York';
      } else {
        searchTerm = address.city || address.state || address.zip;
      }

      this.logger.log(`Filling ${type} with: ${searchTerm}`);

      // Click on the category to open the form
      const categoryId = type === 'source' ? 'origin' : 'destination';
      try {
        await page.click(`[data-test-id="CategoryWrapper-${categoryId}"]`, { timeout: 3000 });
        await page.waitForTimeout(1000);
        this.logger.log(`Clicked ${categoryId} category`);
      } catch (error) {
        this.logger.warn(`Could not click ${categoryId} category: ${error.message}`);
      }

      // Wait for the address select to appear and click it
      try {
        const addressSelector = `[data-test-id="${categoryId}-address-select"]`;
        await page.waitForSelector(addressSelector, { timeout: 5000 });

        // Click on the address select to open dropdown and reveal the search input
        await page.click(addressSelector);
        await page.waitForTimeout(1000);
        this.logger.log(`Clicked address select`);

        // Find and focus the visible search input field within the active dropdown
        const inputFocused = await page.evaluate(() => {
          const inputs = Array.from(document.querySelectorAll('.ant-select-search__field')) as HTMLInputElement[];
          const visibleInput = inputs.find(input => {
            const parent = input.parentElement;
            if (!parent) return false;
            const style = window.getComputedStyle(parent);
            return style.display !== 'none';
          });
          if (visibleInput) {
            visibleInput.focus();
            return true;
          }
          return false;
        });

        if (inputFocused) {
          await page.waitForTimeout(300);

          // Type character by character to trigger API
          await page.keyboard.type(searchTerm, { delay: 150 });
          await page.waitForTimeout(2500); // Wait for API response
          this.logger.log(`Typed address: ${searchTerm}`);

          // Wait for dropdown options and select first one
          let optionClicked = false;
          for (let attempt = 0; attempt < 10; attempt++) {
            await page.waitForTimeout(500);

            optionClicked = await page.evaluate(() => {
              const options = Array.from(document.querySelectorAll('.ant-select-dropdown-menu-item')) as HTMLElement[];
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
              this.logger.log(`Selected from dropdown (attempt ${attempt + 1})`);
              break;
            }
          }

          if (!optionClicked) {
            this.logger.warn('Could not find visible dropdown option after waiting');
          }
        } else {
          this.logger.warn('Could not find visible search input');
        }

        // Wait for the done button to be enabled and click it
        await page.waitForTimeout(1500);

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
          this.logger.log(`Clicked done button`);
          await page.waitForTimeout(1000);
        } catch (error) {
          this.logger.warn('Done button not enabled, trying force click');
          try {
            await page.click('[data-test-id="section-footer-done-btn"]', { force: true, timeout: 2000 });
            this.logger.log('Force clicked done button');
            await page.waitForTimeout(1000);
          } catch (e) {
            this.logger.warn('Could not click done button at all');
          }
        }

      } catch (error) {
        this.logger.warn(`Could not fill address field: ${error.message}`);
      }
    } catch (error) {
      this.logger.error(`Error filling ${type} address: ${error.message}`);
    }
  }

  /**
   * Add a package to the quote
   */
  private async addPackage(page: Page, pkg: any, index: number): Promise<void> {
    try {
      this.logger.log(`Adding package ${index + 1}: ${pkg.name}`);

      // Click on the Load category to open the form
      if (index === 0) {
        try {
          await page.click('[data-test-id="CategoryWrapper-load"]', { timeout: 3000 });
          await page.waitForTimeout(1000);
          this.logger.log('Clicked Load category');
        } catch (error) {
          this.logger.warn('Could not click Load category:', error.message);
        }
      }

      // Click "Loose Cargo" tab if it's a pallet
      if (pkg.type === 'pallet') {
        try {
          await page.click('button:has-text("Loose Cargo"), div:has-text("Loose Cargo")', { timeout: 3000 });
          await page.waitForTimeout(500);
          this.logger.log('Selected Loose Cargo');
        } catch {
          this.logger.warn('Could not find Loose Cargo tab, continuing...');
        }
      }

      // Select "Pallets" package type
      try {
        const palletButton = await page.locator('button:has-text("Pallets")').first();
        if (await palletButton.isVisible()) {
          await palletButton.click();
          await page.waitForTimeout(500);
          this.logger.log('Selected Pallets');
        }
      } catch {
        this.logger.warn('Could not select Pallets, trying alternative selectors');
      }

      // Fill quantity (# of units)
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
            this.logger.log(`Filled quantity: ${pkg.quantity}`);
            break;
          }
        } catch {
          continue;
        }
      }

      // Fill dimensions L x W x H (in cm)
      const dimensionInputs = await page.$$('input[type="number"]:not([readonly])');

      if (dimensionInputs.length >= 3) {
        // Length
        await dimensionInputs[1].fill(pkg.lengthCm.toString());
        // Width
        await dimensionInputs[2].fill(pkg.widthCm.toString());
        // Height
        await dimensionInputs[3].fill(pkg.heightCm.toString());

        this.logger.log(`Filled dimensions: ${pkg.lengthCm} x ${pkg.widthCm} x ${pkg.heightCm} cm`);
      }

      // Fill weight (in KG)
      const weightInputs = await page.$$('input[type="number"]:not([readonly])');
      if (weightInputs.length >= 4) {
        await weightInputs[weightInputs.length - 1].fill(pkg.weightKg.toString());
        this.logger.log(`Filled weight: ${pkg.weightKg} kg`);
      }

      this.logger.log(`Successfully added package ${index + 1}`);

    } catch (error) {
      this.logger.warn(`Could not add package ${index}:`, error.message);
    }
  }

  /**
   * Fill the Goods section (required for quote submission)
   */
  private async fillGoodsSection(page: Page, packages: any[]): Promise<void> {
    try {
      this.logger.log('Filling Goods section');

      // Click Goods category
      await page.click('[data-test-id="CategoryWrapper-goods"]', { timeout: 3000 });
      await page.waitForTimeout(1000);
      this.logger.log('Clicked Goods category');

      // Fill goods value (default: sum of insurance values or 8000)
      const totalValue = packages.reduce((sum, pkg) => sum + (pkg.insuranceValue || 0), 0) || 8000;
      try {
        const goodsValueInput = await page.$('[data-test-id="goods-section-value"]');
        if (goodsValueInput) {
          await goodsValueInput.fill(totalValue.toString());
          this.logger.log(`Filled goods value: $${totalValue}`);
          await page.waitForTimeout(500);
        }
      } catch (error) {
        this.logger.warn('Could not fill goods value:', error.message);
      }

      // Select timeframe - "Yes, my goods are ready"
      try {
        await page.click('[data-test-id="goods-section-timeframe"]', { timeout: 3000 });
        await page.waitForTimeout(1000);
        this.logger.log('Clicked timeframe dropdown');

        await page.click('[data-test-id="goods-section-timeframe-ready-now"]', { timeout: 3000 });
        this.logger.log('Selected "Yes, my goods are ready"');
        await page.waitForTimeout(500);
      } catch (error) {
        this.logger.warn('Could not select timeframe:', error.message);
      }

      // Click Done button
      try {
        await page.waitForFunction(
          () => {
            const btn = document.querySelector('[data-test-id="section-footer-done-btn"]');
            return btn && !btn.hasAttribute('disabled');
          },
          { timeout: 5000 }
        );

        await page.click('[data-test-id="section-footer-done-btn"]');
        this.logger.log('Clicked Goods confirm button');
        await page.waitForTimeout(1000);
      } catch (error) {
        this.logger.warn('Could not click goods confirm button:', error.message);
      }
    } catch (error) {
      this.logger.warn('Could not fill Goods section:', error.message);
    }
  }

  /**
   * Submit the quote request
   */
  private async submitQuote(page: Page): Promise<void> {
    this.logger.log('Submitting quote request');

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
        const button = await page.$(selector);
        if (button) {
          const isDisabled = await button.evaluate(el => el.hasAttribute('disabled'));
          if (!isDisabled) {
            await button.click();
            this.logger.log(`Clicked submit button: ${selector}`);
            submitted = true;
            break;
          } else {
            this.logger.warn(`Submit button found but disabled: ${selector}`);
          }
        }
      } catch {
        continue;
      }
    }

    if (!submitted) {
      this.logger.warn('Could not find enabled submit button');
    }

    await page.waitForTimeout(3000);
  }

  /**
   * Confirm services on the recommended services page
   */
  private async confirmServices(page: Page): Promise<void> {
    try {
      this.logger.log('Waiting for recommended services page');

      const confirmServicesButton = await page.$('button:has-text("Confirm Services & Get Results")');
      if (confirmServicesButton) {
        await confirmServicesButton.click();
        this.logger.log('Clicked "Confirm Services & Get Results" button');
        await page.waitForTimeout(5000);
      }
    } catch (error) {
      this.logger.warn('Could not find Confirm Services button:', error.message);
    }
  }

  /**
   * Close popup modal if it appears on results page
   */
  private async closePopupModal(page: Page): Promise<void> {
    try {
      await page.waitForTimeout(3000);
      const closeButton = await page.$('.ant-modal-close');
      if (closeButton) {
        await closeButton.click();
        this.logger.log('Closed popup modal');
        await page.waitForTimeout(1000);
      }
    } catch (error) {
      this.logger.log('No popup modal to close');
    }
  }

  /**
   * Apply seller filters to show only specific sellers
   */
  private async applySellersFilter(page: Page): Promise<void> {
    try {
      this.logger.log('Waiting for seller filters to load');
      await page.waitForTimeout(5000);

      const sellersToFilter = [
        'Seabay International Freight Forwarding Ltd',
        'UniPower Logistics Co., Ltd.'
      ];

      this.logger.log('Filtering by sellers');
      for (const seller of sellersToFilter) {
        let checkboxFound = false;

        for (let attempt = 0; attempt < 5; attempt++) {
          checkboxFound = await page.evaluate((sellerName) => {
            const labels = Array.from(document.querySelectorAll('.ant-checkbox-wrapper')) as HTMLElement[];
            const sellerLabel = labels.find(label => {
              const filterName = label.querySelector('.filter-name span');
              return filterName && filterName.textContent.trim() === sellerName;
            });

            if (sellerLabel) {
              const checkbox = sellerLabel.querySelector('input[type="checkbox"]') as HTMLInputElement;
              if (checkbox && !checkbox.checked) {
                sellerLabel.click();
                return true;
              }
            }
            return false;
          }, seller);

          if (checkboxFound) {
            this.logger.log(`Selected seller: ${seller}`);
            await page.waitForTimeout(2000);
            break;
          }

          if (attempt < 4) {
            await page.waitForTimeout(1000);
          }
        }

        if (!checkboxFound) {
          this.logger.warn(`Could not find seller: ${seller}`);
        }
      }

      await page.waitForTimeout(2000);
    } catch (error) {
      this.logger.warn('Could not apply seller filters:', error.message);
    }
  }

  /**
   * Extract quote results from the page
   */
  private async extractQuoteResults(page: Page): Promise<Partial<FreightosQuoteResult>> {
    try {
      this.logger.log('Extracting quote information');

      // Get the current URL (quote URL)
      const currentUrl = page.url();
      const quoteUrl = this.extractQuoteUrlFromPage(currentUrl);

      // Extract quote information using the same selectors as the test script
      const quotes: Array<{
        carrier: string;
        service: string;
        price: number;
        transitDays: string;
        details: string;
      }> = await page.evaluate(() => {
        const quoteElements = document.querySelectorAll('[data-quote-id]');
        const results: Array<{
          carrier: string;
          service: string;
          price: number;
          transitDays: string;
          details: string;
        }> = [];

        quoteElements.forEach(element => {
          try {
            const quoteId = element.getAttribute('data-quote-id');

            // Extract transit time
            const transitTimeEl = element.querySelector('[data-test-id="transit-time"]');
            const transitTime = transitTimeEl ? transitTimeEl.textContent.trim() : 'N/A';

            // Extract price
            const priceEl = element.querySelector('[data-test-id="price"] .price');
            let price = 0;
            if (priceEl) {
              // First try to get the full price from title attribute (e.g., "1,460.22")
              const titlePrice = priceEl.getAttribute('title');
              if (titlePrice) {
                // Remove commas and parse (e.g., "1,460.22" -> 1460.22)
                price = parseFloat(titlePrice.replace(/,/g, ''));
              } else {
                // Fallback: combine text content with decimals element
                const decimalsEl = element.querySelector('[data-test-id="price"] .decimals');
                if (decimalsEl) {
                  const priceValue = priceEl.textContent.replace(/,/g, '');
                  const decimalsValue = decimalsEl.textContent;
                  price = parseFloat(`${priceValue}.${decimalsValue}`);
                }
              }
            }

            // Extract vendor
            const vendorEl = element.querySelector('[data-test-id="vendor-label"]');
            const vendor = vendorEl ? vendorEl.textContent.trim() : 'Unknown';

            // Extract arrival/departure dates for details
            const arrivalEl = element.querySelector('[data-test-id="est-arrival"]');
            const departureEl = element.querySelector('[data-test-id="est-departure"]');
            const arrival = arrivalEl ? arrivalEl.textContent.trim() : '';
            const departure = departureEl ? departureEl.textContent.trim() : '';
            const details = `${departure} - ${arrival}`.trim();

            if (!isNaN(price) && price > 0) {
              results.push({
                carrier: vendor,
                service: 'Ocean Freight', // Default service type
                price,
                transitDays: transitTime,
                details
              });
            }
          } catch (err) {
            console.warn('Error parsing quote element:', err);
          }
        });

        return results;
      });

      this.logger.log(`Extracted ${quotes.length} quotes from Freightos`);
      quotes.forEach((quote, index) => {
        this.logger.log(`Quote ${index + 1}: ${quote.carrier} - $${quote.price} - ${quote.transitDays}`);
      });

      return {
        quoteUrl,
        quotes: quotes.length > 0 ? quotes : undefined
      };

    } catch (error) {
      this.logger.error('Error extracting quote results:', error);
      return {
        error: 'Could not extract quote results from page'
      };
    }
  }

  /**
   * Extract the permanent quote URL that can be used for booking
   */
  private extractQuoteUrlFromPage(currentUrl: string): string | undefined {
    try {
      // Look for URLs that match the pattern mentioned by client
      // https://ship.freightos.com/results/agpzfnRyYWRlb3Mxch0LEhBjb21tZXJjZURvY3MvUkZRGICA6onshaQIDA
      const urlMatch = currentUrl.match(/https:\/\/ship\.freightos\.com\/results\/[a-zA-Z0-9]+/);
      return urlMatch ? urlMatch[0] : currentUrl;
    } catch (error) {
      this.logger.warn('Could not extract quote URL:', error);
      return currentUrl;
    }
  }

  /**
   * Generate a code using Playwright codegen for future reference
   * This is a utility method that can be called to generate automation code
   */
  async generateCodegenScript(url: string = 'https://ship.freightos.com'): Promise<string> {
    return `
# To generate new automation code, run this command:
npx playwright codegen ${url}

# This will open a browser where you can:
# 1. Record interactions with the Freightos website
# 2. Generate code that can be integrated into this service
# 3. Handle any UI changes that break the current automation

# The generated code should be integrated into the appropriate methods above.
    `;
  }
}