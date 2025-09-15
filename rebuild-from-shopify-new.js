require('dotenv').config();

const rebuildFromShopify = async () => {
  console.log(
    '🔄 Rebuilding Local System from Shopify Catalog (New Product-Specific Options)',
  );
  console.log(
    '================================================================================\n',
  );

  try {
    // Step 1: Get all active Shopify products
    console.log('1️⃣ Fetching all active Shopify products...');
    const shopifyProducts = await getAllShopifyProducts();
    console.log(`   Found ${shopifyProducts.length} active products`);

    // Step 2: Create or update local products with their specific options
    console.log(
      '\n2️⃣ Creating/updating local products with product-specific options...',
    );
    const localProducts = await createLocalProductsWithOptions(shopifyProducts);
    console.log(
      `   Processed ${localProducts.length} local products with their options`,
    );

    // Step 3: Create product mappings
    console.log('\n3️⃣ Creating Shopify product mappings...');
    await createProductMappings(localProducts, shopifyProducts);

    console.log('\n✅ System rebuild complete!');
    console.log('============================');
    console.log(`   Products: ${localProducts.length}`);
    console.log(
      `   All products now have their own specific option groups and options`,
    );
  } catch (error) {
    console.error('❌ Rebuild failed:', error.message);
    console.error(error.stack);
  }
};

const clearLocalData = async () => {
  // Use direct database operations to clear all local data
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('   🗑️  Clearing all local data...');

    // Delete in correct order to respect foreign key constraints
    await pool.query('DELETE FROM quote_shipping_selections');
    console.log('   ✅ Cleared quote shipping selections');

    await pool.query('DELETE FROM quote_options');
    console.log('   ✅ Cleared quote options');

    await pool.query('DELETE FROM quotes');
    console.log('   ✅ Cleared quotes');

    await pool.query('DELETE FROM customers');
    console.log('   ✅ Cleared customers');

    await pool.query('DELETE FROM product_options');
    console.log('   ✅ Cleared product options');

    await pool.query('DELETE FROM product_option_groups');
    console.log('   ✅ Cleared product option groups');

    await pool.query('DELETE FROM product_dimensions');
    console.log('   ✅ Cleared product dimensions');

    await pool.query('DELETE FROM shopify_addon_mappings');
    console.log('   ✅ Cleared Shopify addon mappings');

    await pool.query('DELETE FROM shopify_option_mappings');
    console.log('   ✅ Cleared Shopify option mappings');

    await pool.query('DELETE FROM shopify_variant_mappings');
    console.log('   ✅ Cleared Shopify variant mappings');

    await pool.query('DELETE FROM shopify_product_mappings');
    console.log('   ✅ Cleared Shopify product mappings');

    await pool.query('DELETE FROM products');
    console.log('   ✅ Cleared products');

    console.log('   🎉 All local data cleared successfully!');
  } catch (error) {
    console.log(`   ❌ Error clearing local data: ${error.message}`);
    throw error;
  } finally {
    await pool.end();
  }
};

const getAllShopifyProducts = async () => {
  const products = [];
  let hasNextPage = true;
  let cursor = null;

  while (hasNextPage) {
    const query = `
      query GetProducts($first: Int!, $after: String) {
        products(first: $first, after: $after, query: "status:active") {
          edges {
            cursor
            node {
              id
              title
              handle
              status
              productType
              vendor
              description
              priceRangeV2 {
                minVariantPrice {
                  amount
                  currencyCode
                }
                maxVariantPrice {
                  amount
                  currencyCode
                }
              }
              options {
                id
                name
                position
                values
              }
              variants(first: 100) {
                edges {
                  node {
                    id
                    title
                    price
                    sku
                    availableForSale
                    selectedOptions {
                      name
                      value
                    }
                  }
                }
              }
              metafields(first: 50, namespace: "custom") {
                edges {
                  node {
                    namespace
                    key
                    value
                  }
                }
              }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `;

    const response = await fetch(
      `https://${process.env.SHOPIFY_SHOP_NAME}.myshopify.com/admin/api/2025-07/graphql.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': process.env.SHOPIFY_API_ACCESS_TOKEN,
        },
        body: JSON.stringify({
          query,
          variables: { first: 50, after: cursor },
        }),
      },
    );

    if (!response.ok) {
      throw new Error(
        `Shopify API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();

    if (data.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
    }

    const productEdges = data.data.products.edges;
    products.push(...productEdges.map((edge) => edge.node));

    hasNextPage = data.data.products.pageInfo.hasNextPage;
    cursor = data.data.products.pageInfo.endCursor;

    console.log(`   Fetched ${productEdges.length} products...`);
  }

  return products;
};

const createLocalProductsWithOptions = async (shopifyProducts) => {
  const localProducts = [];

  for (const product of shopifyProducts) {
    console.log(`\n   📦 Processing: ${product.title}`);

    // Step 1: Check if product already exists by Shopify ID
    let existingProduct = null;
    try {
      const existingResponse = await fetch(
        `http://localhost:3001/products?shopifyId=${encodeURIComponent(product.id)}`,
      );
      if (existingResponse.ok) {
        const existingProducts = await existingResponse.json();
        if (existingProducts.length > 0) {
          existingProduct = existingProducts[0];
          console.log(
            `   🔍 Found existing product: ${existingProduct.title} (ID: ${existingProduct.id})`,
          );
        }
      }
    } catch (error) {
      console.log(
        `   ⚠️  Could not check for existing product: ${error.message}`,
      );
    }

    let createdProduct;
    if (existingProduct) {
      // Use existing product
      createdProduct = existingProduct;
      console.log(`   ♻️  Using existing product: ${product.title}`);
    } else {
      // Create new product
      // For POS system: Always set base price to 0, variants contain actual prices
      const actualBasePrice = 0;

      const productData = {
        title: product.title,
        description: product.description || '',
        basePrice: actualBasePrice,
        shopifyId: product.id,
      };

      const productResponse = await fetch('http://localhost:3001/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData),
      });

      if (!productResponse.ok) {
        console.log(`   ❌ Failed to create product: ${product.title}`);
        continue;
      }

      createdProduct = await productResponse.json();
      console.log(`   ✅ Created product: ${product.title}`);
    }

    localProducts.push(createdProduct);

    // Step 2: Create product-specific option groups
    const optionGroups = await createProductOptionGroups(
      createdProduct.id,
      product,
    );

    // Step 3: Create product-specific options for each group
    await createProductOptions(createdProduct.id, product, optionGroups);

    // Step 4: Create addon options if any
    await createProductAddonOptions(createdProduct.id, product);
  }

  return localProducts;
};

const createProductOptionGroups = async (productId, shopifyProduct) => {
  const optionGroups = [];

  for (const option of shopifyProduct.options) {
    // Determine option group type based on name
    let type = 'CUSTOM';
    const optionName = option.name.toLowerCase();

    if (optionName.includes('color') || optionName.includes('colour')) {
      type = 'COLOR';
    } else if (optionName.includes('size')) {
      type = 'SIZE';
    } else if (optionName.includes('material')) {
      type = 'MATERIAL';
    }

    const groupData = {
      name: option.name,
      type: type,
      isRequired: true, // Most Shopify options are required
      isMultiSelect: false, // Most Shopify options are single select
      displayOrder: option.position,
      description: `${option.name} options for ${shopifyProduct.title}`,
    };

    const response = await fetch(
      `http://localhost:3001/products/${productId}/option-groups`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(groupData),
      },
    );

    if (response.ok) {
      const createdGroup = await response.json();
      optionGroups.push({
        ...createdGroup,
        originalOption: option, // Store original Shopify option data
      });
      console.log(`   ✅ Created option group: ${option.name} (${type})`);
    } else {
      console.log(`   ❌ Failed to create option group: ${option.name}`);
    }
  }

  return optionGroups;
};

const createProductOptions = async (
  productId,
  shopifyProduct,
  optionGroups,
) => {
  // Get the product base price
  const productBasePrice = parseFloat(
    shopifyProduct.priceRangeV2.minVariantPrice.amount,
  );

  for (const group of optionGroups) {
    const option = group.originalOption;

    for (const value of option.values) {
      // Find the corresponding variant to get pricing
      // Since variants don't have selectedOptions in this API response,
      // we'll match by variant title (which contains the color name)
      const variant = shopifyProduct.variants.edges.find(
        (edge) => edge.node.title === value,
      );

      let optionPrice = '0';
      if (variant) {
        const variantPrice = parseFloat(variant.node.price);
        console.log(
          `   🔍 Found variant for ${value}: ${variant.node.title} = $${variantPrice}`,
        );

        // For POS system: Always use variant price as option price
        // (since base price is always 0, variants contain the actual product prices)
        optionPrice = variantPrice.toString();
        console.log(
          `   💰 Calculated option price: $${optionPrice} (base: $${productBasePrice})`,
        );
      } else {
        console.log(`   ❌ No variant found for option value: ${value}`);
        console.log(
          `   📋 Available variants: ${shopifyProduct.variants.edges.map((e) => e.node.title).join(', ')}`,
        );
      }

      const optionData = {
        name: value,
        price: optionPrice,
        description: `${value} option for ${option.name}`,
        shopifyVariantId: variant ? variant.node.id : null,
        shopifySku: variant ? variant.node.sku : null,
        isAvailable: variant ? variant.node.availableForSale : true,
        displayOrder: option.values.indexOf(value),
      };

      const response = await fetch(
        `http://localhost:3001/products/${productId}/option-groups/${group.id}/options`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(optionData),
        },
      );

      if (response.ok) {
        console.log(`   ✅ Created option: ${value} ($${optionData.price})`);
      } else {
        console.log(`   ❌ Failed to create option: ${value}`);
      }
    }
  }
};

const createProductAddonOptions = async (productId, shopifyProduct) => {
  // Check for addon products in metafields
  const addonProductIds = [];

  for (const metafield of shopifyProduct.metafields.edges) {
    if (metafield.node.key === 'addons_product') {
      try {
        const addonIds = JSON.parse(metafield.node.value);
        addonProductIds.push(...addonIds);
      } catch (error) {
        console.log(
          `   ⚠️  Could not parse addons for product ${shopifyProduct.title}`,
        );
      }
    }
  }

  if (addonProductIds.length === 0) {
    return;
  }

  // Create addon option group
  const addonGroupData = {
    name: 'Addons',
    type: 'ADDON',
    isRequired: false,
    isMultiSelect: true,
    displayOrder: 999,
    description: 'Optional addon products',
  };

  const groupResponse = await fetch(
    `http://localhost:3001/products/${productId}/option-groups`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(addonGroupData),
    },
  );

  if (!groupResponse.ok) {
    console.log(
      `   ❌ Failed to create addon option group for ${shopifyProduct.title}`,
    );
    return;
  }

  const addonGroup = await groupResponse.json();
  console.log(`   ✅ Created addon option group for ${shopifyProduct.title}`);

  // Fetch addon product details and create options
  for (const addonId of addonProductIds) {
    try {
      const addonProduct = await fetch(
        `https://${process.env.SHOPIFY_SHOP_NAME}.myshopify.com/admin/api/2025-07/graphql.json`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': process.env.SHOPIFY_API_ACCESS_TOKEN,
          },
          body: JSON.stringify({
            query: `
            query GetProduct($id: ID!) {
              product(id: $id) {
                id
                title
                priceRangeV2 {
                  minVariantPrice {
                    amount
                    currencyCode
                  }
                }
              }
            }
          `,
            variables: { id: addonId },
          }),
        },
      );

      if (addonProduct.ok) {
        const addonData = await addonProduct.json();
        if (addonData.data?.product) {
          const product = addonData.data.product;

          const optionData = {
            name: product.title,
            price: product.priceRangeV2.minVariantPrice.amount,
            description: `Addon: ${product.title}`,
            shopifyProductId: product.id,
            isAvailable: true,
            displayOrder: 0,
          };

          const optionResponse = await fetch(
            `http://localhost:3001/products/${productId}/option-groups/${addonGroup.id}/options`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(optionData),
            },
          );

          if (optionResponse.ok) {
            console.log(`   ✅ Created addon option: ${product.title}`);
          }
        }
      }
    } catch (error) {
      console.log(`   ⚠️  Could not fetch addon product ${addonId}`);
    }
  }
};

const createProductMappings = async (localProducts, shopifyProducts) => {
  // First, clean up any existing duplicates
  console.log('   🧹 Cleaning up existing duplicate mappings...');
  try {
    const cleanupResponse = await fetch(
      'http://localhost:3001/shopify/mappings/cleanup-duplicates',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
    );

    if (cleanupResponse.ok) {
      const cleanupResult = await cleanupResponse.json();
      console.log(`   ✅ ${cleanupResult.message}`);
    }
  } catch (error) {
    console.log(`   ⚠️  Cleanup failed: ${error.message}`);
  }

  // Create a map to track which Shopify products we've already mapped
  const mappedShopifyProducts = new Set();
  let createdMappings = 0;
  let updatedMappings = 0;

  for (let i = 0; i < localProducts.length; i++) {
    const localProduct = localProducts[i];
    const shopifyProduct = shopifyProducts[i];

    // Skip if we've already mapped this Shopify product
    if (mappedShopifyProducts.has(shopifyProduct.id)) {
      console.log(
        `   ⚠️  Skipping duplicate mapping for ${localProduct.title} (Shopify ID: ${shopifyProduct.id})`,
      );
      continue;
    }

    const mappingData = {
      localProductId: localProduct.id,
      shopifyProductId: shopifyProduct.id,
      shopifyData: shopifyProduct,
    };

    const response = await fetch('http://localhost:3001/shopify/mappings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mappingData),
    });

    if (response.ok) {
      const result = await response.json();
      if (
        result.message &&
        result.message.includes('Updated existing mapping')
      ) {
        console.log(`   🔄 Updated mapping for ${localProduct.title}`);
        updatedMappings++;
      } else {
        console.log(`   ✅ Created mapping for ${localProduct.title}`);
        createdMappings++;
      }
      mappedShopifyProducts.add(shopifyProduct.id);
    } else {
      const errorResult = await response.json();
      if (errorResult.error && errorResult.error.includes('already mapped')) {
        console.log(
          `   ⚠️  ${localProduct.title} already mapped to different product`,
        );
      } else {
        console.log(
          `   ❌ Failed to create mapping for ${localProduct.title}: ${errorResult.error || 'Unknown error'}`,
        );
      }
    }
  }

  console.log(
    `   📊 Created ${createdMappings} new mappings, updated ${updatedMappings} existing mappings`,
  );
};

rebuildFromShopify();
