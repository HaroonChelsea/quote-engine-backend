#!/usr/bin/env node

/**
 * Freightos Automation Code Generator
 *
 * This script helps generate Playwright automation code for Freightos.
 * Run this when the Freightos UI changes and the automation breaks.
 *
 * Usage:
 * npm run codegen:freightos
 *
 * This will:
 * 1. Open a browser with the Freightos login page
 * 2. Allow you to record interactions
 * 3. Generate code that can be integrated into the FreightosService
 */

const { chromium } = require('playwright');

async function generateFreightosCode() {
  console.log('🚀 Starting Freightos Code Generation...');
  console.log('📋 Instructions:');
  console.log('   1. Browser will open to Freightos login page');
  console.log('   2. Perform the following actions:');
  console.log('      - Login to your account');
  console.log('      - Navigate to quote creation');
  console.log('      - Fill in sample addresses');
  console.log('      - Add package dimensions');
  console.log('      - Submit quote');
  console.log('      - Wait for results');
  console.log('   3. Copy the generated code to update FreightosService');
  console.log('');

  try {
    const browser = await chromium.launch({
      headless: false,
      args: ['--start-maximized']
    });

    const context = await browser.newContext({
      viewport: null,
      recordVideo: {
        dir: 'videos/',
        size: { width: 1920, height: 1080 }
      }
    });

    const page = await context.newPage();

    // Navigate to Freightos
    await page.goto('https://ship.freightos.com/login');

    console.log('✅ Browser opened. Please perform your actions...');
    console.log('💡 Tip: Use the browser developer tools to inspect elements');
    console.log('⚠️  Remember to note down:');
    console.log('   - Field selectors (name, data-testid, class)');
    console.log('   - Button selectors');
    console.log('   - Result elements');
    console.log('   - Quote URL format');

    // Keep the browser open until manually closed
    await page.waitForEvent('close');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function generateCodegenScript() {
  console.log('🔧 Alternative: Use Playwright Codegen');
  console.log('');
  console.log('Run this command in your terminal:');
  console.log('');
  console.log('npx playwright codegen https://ship.freightos.com/login');
  console.log('');
  console.log('This will:');
  console.log('- Open browser with recording enabled');
  console.log('- Generate code as you interact with the page');
  console.log('- Show the generated code in real-time');
  console.log('');
  console.log('Integration steps:');
  console.log('1. Copy generated selectors to FreightosService');
  console.log('2. Update login() method with new selectors');
  console.log('3. Update createQuote() method with form selectors');
  console.log('4. Update extractQuoteResults() with result selectors');
  console.log('');
}

// Check command line arguments
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'record':
    generateFreightosCode();
    break;
  case 'codegen':
  default:
    generateCodegenScript();
    break;
}