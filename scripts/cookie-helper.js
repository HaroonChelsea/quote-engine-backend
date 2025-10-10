#!/usr/bin/env node

/**
 * Freightos Cookie Helper
 *
 * This script helps manage Freightos session cookies for the automation system.
 */

const fs = require('fs');
const path = require('path');

const COOKIE_FILE = path.join(__dirname, '..', 'src', 'cookie.json');

function validateCookies() {
  console.log('🔍 Validating Freightos cookies...');

  try {
    if (!fs.existsSync(COOKIE_FILE)) {
      console.log('❌ Cookie file not found at:', COOKIE_FILE);
      console.log('');
      console.log('📋 To create the cookie file:');
      console.log('1. Open your browser and login to Freightos');
      console.log('2. Use a browser extension to export cookies (Cookie-Editor, EditThisCookie)');
      console.log('3. Save the exported cookies as:', COOKIE_FILE);
      return false;
    }

    const cookieData = fs.readFileSync(COOKIE_FILE, 'utf-8');
    const cookies = JSON.parse(cookieData);

    if (!Array.isArray(cookies)) {
      console.log('❌ Cookie file should contain an array of cookies');
      return false;
    }

    console.log(`✅ Found ${cookies.length} cookies`);

    // Check for essential cookies
    const essentialCookies = ['session', 'JSESSIONID'];
    const foundEssential = essentialCookies.filter(name =>
      cookies.some(cookie => cookie.name === name)
    );

    console.log(`✅ Essential cookies found: ${foundEssential.join(', ')}`);

    // Check for expired cookies
    const now = Date.now() / 1000;
    const expiredCookies = cookies.filter(cookie =>
      cookie.expirationDate && cookie.expirationDate < now
    );

    if (expiredCookies.length > 0) {
      console.log(`⚠️  Warning: ${expiredCookies.length} cookies have expired`);
      expiredCookies.forEach(cookie => {
        const expiredDate = new Date(cookie.expirationDate * 1000);
        console.log(`   - ${cookie.name}: expired on ${expiredDate.toLocaleDateString()}`);
      });
    }

    // Check session cookie specifically
    const sessionCookie = cookies.find(cookie => cookie.name === 'session');
    if (sessionCookie) {
      if (sessionCookie.session) {
        console.log('✅ Session cookie is valid (session-based)');
      } else if (sessionCookie.expirationDate) {
        const expiryDate = new Date(sessionCookie.expirationDate * 1000);
        const isExpired = sessionCookie.expirationDate < now;
        console.log(`${isExpired ? '❌' : '✅'} Session cookie expires: ${expiryDate.toLocaleString()}`);
      }
    }

    return true;

  } catch (error) {
    console.log('❌ Error reading cookie file:', error.message);
    return false;
  }
}

function showCookieInfo() {
  console.log('📊 Freightos Cookie Information');
  console.log('================================');

  try {
    const cookieData = fs.readFileSync(COOKIE_FILE, 'utf-8');
    const cookies = JSON.parse(cookieData);

    // Group cookies by domain
    const domains = {};
    cookies.forEach(cookie => {
      if (!domains[cookie.domain]) {
        domains[cookie.domain] = [];
      }
      domains[cookie.domain].push(cookie);
    });

    Object.entries(domains).forEach(([domain, domainCookies]) => {
      console.log(`\n${domain}:`);
      domainCookies.forEach(cookie => {
        const expiry = cookie.expirationDate ?
          new Date(cookie.expirationDate * 1000).toLocaleDateString() :
          'Session';
        const status = cookie.expirationDate && cookie.expirationDate < Date.now() / 1000 ?
          '(EXPIRED)' : '';
        console.log(`  - ${cookie.name}: ${expiry} ${status}`);
      });
    });

  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

function refreshInstructions() {
  console.log('🔄 How to Refresh Freightos Cookies');
  console.log('====================================');
  console.log('');
  console.log('When cookies expire, follow these steps:');
  console.log('');
  console.log('1. Open your browser and navigate to https://ship.freightos.com');
  console.log('2. Log in to your Freightos account');
  console.log('3. Install a cookie management extension:');
  console.log('   - Cookie-Editor (Chrome/Firefox)');
  console.log('   - EditThisCookie (Chrome)');
  console.log('   - Export Cookies (Firefox)');
  console.log('4. Export cookies for freightos.com domain');
  console.log('5. Save the exported JSON to:', COOKIE_FILE);
  console.log('6. Run this script again to validate: npm run cookie:validate');
  console.log('7. Restart your backend service');
  console.log('');
  console.log('💡 Tip: Set up a calendar reminder to refresh cookies monthly');
}

// Main script logic
const command = process.argv[2] || 'validate';

switch (command) {
  case 'validate':
    validateCookies();
    break;
  case 'info':
    showCookieInfo();
    break;
  case 'refresh':
    refreshInstructions();
    break;
  default:
    console.log('Usage: node cookie-helper.js [validate|info|refresh]');
    console.log('');
    console.log('Commands:');
    console.log('  validate  - Check if cookies are valid and not expired');
    console.log('  info      - Show detailed cookie information');
    console.log('  refresh   - Show instructions for refreshing cookies');
}