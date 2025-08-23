const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function seedProductDimensions() {
  try {
    console.log('🌱 Seeding product dimensions...');

    // First, let's find the "1 Person Booth" product
    const productResult = await pool.query(
      'SELECT id FROM products WHERE title = $1',
      ['1 Person Booth'],
    );

    if (productResult.rows.length === 0) {
      console.log(
        '❌ Product "1 Person Booth" not found. Please create the product first.',
      );
      return;
    }

    const productId = productResult.rows[0].id;
    console.log(`📦 Found product ID: ${productId}`);

    // Clear existing dimensions for this product
    await pool.query('DELETE FROM product_dimensions WHERE product_id = $1', [
      productId,
    ]);

    // Insert pallet dimensions
    const palletDimensions = {
      name: 'Pallet 1',
      type: 'pallet',
      quantity: 1,
      weightKg: 258,
      lengthCm: 231,
      widthCm: 65,
      heightCm: 113,
      volumeCbm: (231 * 65 * 113) / 1000000, // Convert cm³ to m³
    };

    await pool.query(
      `
      INSERT INTO product_dimensions
      (product_id, name, type, quantity, weight_kg, length_cm, width_cm, height_cm, volume_cbm)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `,
      [
        productId,
        palletDimensions.name,
        palletDimensions.type,
        palletDimensions.quantity,
        palletDimensions.weightKg,
        palletDimensions.lengthCm,
        palletDimensions.widthCm,
        palletDimensions.heightCm,
        palletDimensions.volumeCbm,
      ],
    );

    console.log('✅ Inserted pallet dimensions');

    // Insert box dimensions
    const boxDimensions = [
      {
        name: 'Box 1',
        type: 'box',
        quantity: 1,
        weightKg: 4.5,
        lengthCm: 66,
        widthCm: 39,
        heightCm: 10,
        volumeCbm: (66 * 39 * 10) / 1000000,
      },
      {
        name: 'Box 2',
        type: 'box',
        quantity: 1,
        weightKg: 6,
        lengthCm: 48,
        widthCm: 42,
        heightCm: 47,
        volumeCbm: (48 * 42 * 47) / 1000000,
      },
    ];

    for (const box of boxDimensions) {
      await pool.query(
        `
        INSERT INTO product_dimensions
        (product_id, name, type, quantity, weight_kg, length_cm, width_cm, height_cm, volume_cbm)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `,
        [
          productId,
          box.name,
          box.type,
          box.quantity,
          box.weightKg,
          box.lengthCm,
          box.widthCm,
          box.heightCm,
          box.volumeCbm,
        ],
      );
    }

    console.log('✅ Inserted box dimensions');

    // Verify the data
    const verifyResult = await pool.query(
      'SELECT * FROM product_dimensions WHERE product_id = $1 ORDER BY type, name',
      [productId],
    );

    console.log('📋 Product dimensions created:');
    verifyResult.rows.forEach((row) => {
      console.log(
        `  - ${row.name}: ${row.type} (${row.length_cm}×${row.width_cm}×${row.height_cm}cm, ${row.weight_kg}kg)`,
      );
    });

    console.log('🎉 Product dimensions seeding completed!');
  } catch (error) {
    console.error('❌ Error seeding product dimensions:', error);
  } finally {
    await pool.end();
  }
}

seedProductDimensions();
