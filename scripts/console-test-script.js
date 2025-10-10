/**
 * Freightos Form Testing Script
 * Run this in the browser console to manually test the form flow
 * Copy and paste this entire script into the browser console on ship.freightos.com
 */

(async function testFreightosForm() {
  console.log('🚀 Starting Freightos Form Test Script');
  console.log('======================================\n');

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // Test data
  const originAddress = 'SHILOU TOWN';
  const destinationAddress = 'New York';

  try {
    // Step 1: Click Origin Category
    console.log('📍 Step 1: Clicking Origin category...');
    const originCategory = document.querySelector('[data-test-id="CategoryWrapper-origin"]');
    if (originCategory) {
      originCategory.click();
      console.log('✅ Clicked Origin category');
      await sleep(1000);
    } else {
      console.log('❌ Origin category not found');
      return;
    }

    // Step 2: Click Address Select
    console.log('📍 Step 2: Clicking origin address select...');
    const originAddressSelect = document.querySelector('[data-test-id="origin-address-select"]');
    if (originAddressSelect) {
      originAddressSelect.click();
      console.log('✅ Clicked origin address select');
      await sleep(1000);
    } else {
      console.log('❌ Origin address select not found');
      return;
    }

    // Step 3: Find visible search input
    console.log('📍 Step 3: Finding visible search input...');
    const inputs = Array.from(document.querySelectorAll('.ant-select-search__field'));
    const visibleInput = inputs.find(input => {
      const style = window.getComputedStyle(input.parentElement);
      return style.display !== 'none';
    });

    if (visibleInput) {
      console.log('✅ Found visible search input');
      visibleInput.focus();

      // Type the address character by character to trigger API calls
      console.log(`📍 Step 4: Typing address: ${originAddress}`);
      for (let i = 0; i < originAddress.length; i++) {
        visibleInput.value = originAddress.substring(0, i + 1);
        visibleInput.dispatchEvent(new Event('input', { bubbles: true }));
        visibleInput.dispatchEvent(new KeyboardEvent('keydown', { key: originAddress[i], bubbles: true }));
        await sleep(100);
      }
      console.log('✅ Typed address');
      await sleep(2000); // Wait for API response
    } else {
      console.log('❌ Visible search input not found');
      return;
    }

    // Step 5: Wait for dropdown options to load and click first one
    console.log('📍 Step 5: Waiting for dropdown options to load...');
    let options = [];
    let visibleOption = null;

    // Try multiple times to find options (API might be loading)
    for (let attempt = 0; attempt < 10; attempt++) {
      await sleep(500);
      options = Array.from(document.querySelectorAll('.ant-select-dropdown-menu-item'));
      visibleOption = options.find(opt => {
        const rect = opt.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && window.getComputedStyle(opt).display !== 'none';
      });

      if (visibleOption) {
        console.log(`✅ Found ${options.length} dropdown options after ${attempt + 1} attempts`);
        break;
      }
    }

    if (visibleOption) {
      console.log('📍 Step 5: Clicking first dropdown option...');
      console.log('Available options:', options.map(o => o.textContent.trim()));
      visibleOption.click();
      console.log('✅ Clicked dropdown option:', visibleOption.textContent.trim());
      await sleep(1000);
    } else {
      console.log('❌ No visible dropdown option found after waiting');
      console.log('Available options:', options.map(o => o.textContent.trim()));
      return;
    }

    // Step 6: Click Done button
    console.log('📍 Step 6: Clicking done button...');
    const doneButton = document.querySelector('[data-test-id="section-footer-done-btn"]:not([disabled])');
    if (doneButton) {
      doneButton.click();
      console.log('✅ Clicked done button');
      await sleep(1000);
    } else {
      console.log('⚠️ Done button not enabled or not found');
    }

    // Step 7: Click Destination Category
    console.log('\n📍 Step 7: Clicking Destination category...');
    const destCategory = document.querySelector('[data-test-id="CategoryWrapper-destination"]');
    if (destCategory) {
      destCategory.click();
      console.log('✅ Clicked Destination category');
      await sleep(1000);
    } else {
      console.log('❌ Destination category not found');
      return;
    }

    // Step 8: Click Destination Address Select
    console.log('📍 Step 8: Clicking destination address select...');
    const destAddressSelect = document.querySelector('[data-test-id="destination-address-select"]');
    if (destAddressSelect) {
      destAddressSelect.click();
      console.log('✅ Clicked destination address select');
      await sleep(1000);
    } else {
      console.log('❌ Destination address select not found');
      return;
    }

    // Step 9: Find visible search input for destination
    console.log('📍 Step 9: Finding visible search input for destination...');
    const destInputs = Array.from(document.querySelectorAll('.ant-select-search__field'));
    const visibleDestInput = destInputs.find(input => {
      const style = window.getComputedStyle(input.parentElement);
      return style.display !== 'none';
    });

    if (visibleDestInput) {
      console.log('✅ Found visible search input');
      visibleDestInput.focus();

      // Type the destination address character by character
      console.log(`📍 Step 10: Typing destination: ${destinationAddress}`);
      for (let i = 0; i < destinationAddress.length; i++) {
        visibleDestInput.value = destinationAddress.substring(0, i + 1);
        visibleDestInput.dispatchEvent(new Event('input', { bubbles: true }));
        visibleDestInput.dispatchEvent(new KeyboardEvent('keydown', { key: destinationAddress[i], bubbles: true }));
        await sleep(100);
      }
      console.log('✅ Typed destination');
      await sleep(2000); // Wait for API response
    } else {
      console.log('❌ Visible search input not found');
      return;
    }

    // Step 11: Wait for dropdown options to load for destination
    console.log('📍 Step 11: Waiting for destination dropdown options to load...');
    let destOptions = [];
    let visibleDestOption = null;

    // Try multiple times to find options
    for (let attempt = 0; attempt < 10; attempt++) {
      await sleep(500);
      destOptions = Array.from(document.querySelectorAll('.ant-select-dropdown-menu-item'));
      visibleDestOption = destOptions.find(opt => {
        const rect = opt.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && window.getComputedStyle(opt).display !== 'none';
      });

      if (visibleDestOption) {
        console.log(`✅ Found ${destOptions.length} dropdown options after ${attempt + 1} attempts`);
        break;
      }
    }

    if (visibleDestOption) {
      console.log('Available options:', destOptions.map(o => o.textContent.trim()));
      visibleDestOption.click();
      console.log('✅ Clicked dropdown option:', visibleDestOption.textContent.trim());
      await sleep(1000);
    } else {
      console.log('❌ No visible dropdown option found after waiting');
      console.log('Available options:', destOptions.map(o => o.textContent.trim()));
      return;
    }

    // Step 12: Click Done button for destination
    console.log('📍 Step 12: Clicking done button for destination...');
    const destDoneButton = document.querySelector('[data-test-id="section-footer-done-btn"]:not([disabled])');
    if (destDoneButton) {
      destDoneButton.click();
      console.log('✅ Clicked done button');
      await sleep(1000);
    } else {
      console.log('⚠️ Done button not enabled or not found');
    }

    // Step 13: Click Load Category
    console.log('\n📍 Step 13: Clicking Load category...');
    const loadCategory = document.querySelector('[data-test-id="CategoryWrapper-load"]');
    if (loadCategory) {
      loadCategory.click();
      console.log('✅ Clicked Load category');
      await sleep(1000);
    } else {
      console.log('❌ Load category not found');
      return;
    }

    // Step 14: Click Loose Cargo
    console.log('📍 Step 14: Clicking Loose Cargo tab...');
    const looseCargoButton = document.querySelector('button:has-text("Loose Cargo")');
    if (looseCargoButton) {
      looseCargoButton.click();
      console.log('✅ Clicked Loose Cargo');
      await sleep(500);
    } else {
      console.log('⚠️ Loose Cargo button not found, trying alternative...');
    }

    // Step 15: Click Pallets button
    console.log('📍 Step 15: Clicking Pallets button...');
    const palletButtons = document.querySelectorAll('button');
    const palletButton = Array.from(palletButtons).find(btn => btn.textContent.includes('Pallets'));
    if (palletButton) {
      palletButton.click();
      console.log('✅ Clicked Pallets button');
      await sleep(500);
    } else {
      console.log('⚠️ Pallets button not found');
    }

    // Step 16: Fill quantity
    console.log('📍 Step 16: Filling quantity...');
    const numberInputs = document.querySelectorAll('input[type="number"]:not([readonly])');
    if (numberInputs.length > 0) {
      numberInputs[0].value = '1';
      numberInputs[0].dispatchEvent(new Event('input', { bubbles: true }));
      console.log('✅ Filled quantity: 1');
    } else {
      console.log('⚠️ Quantity input not found');
    }

    // Step 17: Fill dimensions
    console.log('📍 Step 17: Filling dimensions...');
    if (numberInputs.length >= 4) {
      numberInputs[1].value = '231';
      numberInputs[1].dispatchEvent(new Event('input', { bubbles: true }));
      numberInputs[2].value = '119';
      numberInputs[2].dispatchEvent(new Event('input', { bubbles: true }));
      numberInputs[3].value = '117';
      numberInputs[3].dispatchEvent(new Event('input', { bubbles: true }));
      console.log('✅ Filled dimensions: 231 x 119 x 117 cm');
    } else {
      console.log('⚠️ Dimension inputs not found');
    }

    // Step 18: Fill weight
    console.log('📍 Step 18: Filling weight...');
    if (numberInputs.length >= 5) {
      numberInputs[numberInputs.length - 1].value = '570';
      numberInputs[numberInputs.length - 1].dispatchEvent(new Event('input', { bubbles: true }));
      console.log('✅ Filled weight: 570 kg');
    } else {
      console.log('⚠️ Weight input not found');
    }

    await sleep(500);

    // Step 19: Click Confirm button
    console.log('📍 Step 19: Clicking Confirm button...');
    const confirmButtons = document.querySelectorAll('button');
    const confirmButton = Array.from(confirmButtons).find(btn => btn.textContent.includes('Confirm'));
    if (confirmButton) {
      confirmButton.click();
      console.log('✅ Clicked Confirm button');
      await sleep(1000);
    } else {
      console.log('⚠️ Confirm button not found');
    }

    // Step 20: Check submit button status
    console.log('\n📍 Step 20: Checking submit button status...');
    const searchButton = document.querySelector('[data-test-id="search-button"]');
    if (searchButton) {
      const isDisabled = searchButton.hasAttribute('disabled');
      console.log(`🔍 Submit button found. Disabled: ${isDisabled}`);

      if (!isDisabled) {
        console.log('✅ Submit button is ENABLED and ready to click!');
        console.log('🎯 You can now click the search button to submit');

        // Optionally click it
        // searchButton.click();
        // console.log('✅ Clicked submit button');
      } else {
        console.log('❌ Submit button is still DISABLED');
        console.log('💡 Check if all required fields are filled');

        // Debug: Check form status
        const origin = document.querySelector('[data-test-id="CategoryWrapper-origin"]');
        const destination = document.querySelector('[data-test-id="CategoryWrapper-destination"]');
        const load = document.querySelector('[data-test-id="CategoryWrapper-load"]');

        console.log('\n🔍 Form Status:');
        console.log('Origin:', origin ? origin.textContent.trim() : 'Not found');
        console.log('Destination:', destination ? destination.textContent.trim() : 'Not found');
        console.log('Load:', load ? load.textContent.trim() : 'Not found');
      }
    } else {
      console.log('❌ Submit button not found');
    }

    console.log('\n✅ Test script completed!');
    console.log('======================================');

  } catch (error) {
    console.error('❌ Error during test:', error);
  }
})();
