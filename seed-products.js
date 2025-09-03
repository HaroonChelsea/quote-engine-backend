const { Pool } = require('pg');
require('dotenv').config();

const productData = [
  {
    title: '1 Person Booth',
    description: 'Compact single-person workspace',
    basePrice: 2999.0,
    dimensions: [
      {
        name: 'Pallet 1',
        type: 'pallet',
        quantity: 1,
        weightKg: 258,
        lengthCm: 231,
        widthCm: 65,
        heightCm: 113,
      },
      {
        name: 'Box 2',
        type: 'box',
        quantity: 1,
        weightKg: 4.5,
        lengthCm: 66,
        widthCm: 39,
        heightCm: 10,
      },
      {
        name: 'Box 3',
        type: 'box',
        quantity: 1,
        weightKg: 6,
        lengthCm: 48,
        widthCm: 42,
        heightCm: 47,
      },
    ],
  },
  {
    title: 'Zoom Room',
    description: 'Professional meeting space',
    basePrice: 5999.0,
    dimensions: [
      {
        name: 'Pallet 1',
        type: 'pallet',
        quantity: 1,
        weightKg: 390,
        lengthCm: 231,
        widthCm: 116,
        heightCm: 100,
      },
      {
        name: 'Box 2',
        type: 'box',
        quantity: 1,
        weightKg: 18,
        lengthCm: 147,
        widthCm: 57,
        heightCm: 9,
      },
      {
        name: 'Box 3',
        type: 'box',
        quantity: 1,
        weightKg: 10,
        lengthCm: 71,
        widthCm: 62,
        heightCm: 59,
      },
    ],
  },
  {
    title: '6 Person Pod',
    description: 'Collaborative workspace for 6 people',
    basePrice: 8999.0,
    dimensions: [
      {
        name: 'Pallet 1',
        type: 'pallet',
        quantity: 1,
        weightKg: 680,
        lengthCm: 231,
        widthCm: 127,
        heightCm: 115,
      },
      {
        name: 'Box 2',
        type: 'box',
        quantity: 1,
        weightKg: 50,
        lengthCm: 181,
        widthCm: 70,
        heightCm: 15,
      },
      {
        name: 'Box 3-4',
        type: 'box',
        quantity: 2,
        weightKg: 40,
        lengthCm: 196,
        widthCm: 72,
        heightCm: 48,
      },
    ],
  },
  {
    title: 'Backyard Office Pod (XL/7x7)',
    description: 'Large backyard office space',
    basePrice: 12999.0,
    dimensions: [
      {
        name: 'Pallet 1',
        type: 'pallet',
        quantity: 1,
        weightKg: 680,
        lengthCm: 231,
        widthCm: 127,
        heightCm: 115,
      },
      {
        name: 'Box 2',
        type: 'box',
        quantity: 1,
        weightKg: 6,
        lengthCm: 160,
        widthCm: 213,
        heightCm: 15,
      },
      {
        name: 'Box 3',
        type: 'box',
        quantity: 1,
        weightKg: 22,
        lengthCm: 60,
        widthCm: 57,
        heightCm: 30,
      },
      {
        name: 'Box 4',
        type: 'box',
        quantity: 1,
        weightKg: 157,
        lengthCm: 93,
        widthCm: 71,
        heightCm: 25,
      },
    ],
  },
  {
    title: 'Home Pod',
    description: 'Compact home office solution',
    basePrice: 3999.0,
    dimensions: [
      {
        name: 'Pallet 1',
        type: 'pallet',
        quantity: 1,
        weightKg: 299,
        lengthCm: 228,
        widthCm: 70,
        heightCm: 134,
      },
      {
        name: 'Box 2',
        type: 'box',
        quantity: 1,
        weightKg: 30,
        lengthCm: 94,
        widthCm: 60,
        heightCm: 46,
      },
    ],
  },
  {
    title: 'Meeting Room',
    description: 'Professional meeting room setup',
    basePrice: 7999.0,
    dimensions: [
      {
        name: 'Pallet 1',
        type: 'pallet',
        quantity: 1,
        weightKg: 504,
        lengthCm: 224.5,
        widthCm: 105,
        heightCm: 139,
      },
      {
        name: 'Box 2',
        type: 'box',
        quantity: 1,
        weightKg: 30,
        lengthCm: 113,
        widthCm: 59,
        heightCm: 45,
      },
    ],
  },
  {
    title: '2 Person Booth',
    description: 'Dual workspace configuration',
    basePrice: 3999.0,
    dimensions: [
      {
        name: 'Pallet 1',
        type: 'pallet',
        quantity: 1,
        weightKg: 390,
        lengthCm: 231,
        widthCm: 116,
        heightCm: 100,
      },
      {
        name: 'Box 2',
        type: 'box',
        quantity: 1,
        weightKg: 10,
        lengthCm: 139,
        widthCm: 47,
        heightCm: 7,
      },
      {
        name: 'Box 3-4',
        type: 'box',
        quantity: 2,
        weightKg: 12,
        lengthCm: 48,
        widthCm: 42,
        heightCm: 47,
      },
    ],
  },
  {
    title: '4 Person Pod',
    description: 'Medium-sized collaborative space',
    basePrice: 6999.0,
    dimensions: [
      {
        name: 'Pallet 1',
        type: 'pallet',
        quantity: 1,
        weightKg: 570,
        lengthCm: 231,
        widthCm: 119,
        heightCm: 117,
      },
      {
        name: 'Box 2',
        type: 'box',
        quantity: 1,
        weightKg: 28,
        lengthCm: 107,
        widthCm: 75,
        heightCm: 16,
      },
      {
        name: 'Box 3',
        type: 'box',
        quantity: 1,
        weightKg: 6,
        lengthCm: 42,
        widthCm: 25,
        heightCm: 15,
      },
      {
        name: 'Box 4-5',
        type: 'box',
        quantity: 2,
        weightKg: 54,
        lengthCm: 156,
        widthCm: 82,
        heightCm: 34,
      },
    ],
  },
  {
    title: '8 Person Pod',
    description: 'Large collaborative workspace',
    basePrice: 11999.0,
    dimensions: [
      {
        name: 'Pallet 1',
        type: 'pallet',
        quantity: 1,
        weightKg: 1330,
        lengthCm: 291,
        widthCm: 100,
        heightCm: 112,
      },
      {
        name: 'Box 2',
        type: 'box',
        quantity: 1,
        weightKg: 1000,
        lengthCm: 225,
        widthCm: 111,
        heightCm: 125,
      },
      {
        name: 'Box 3+4',
        type: 'box',
        quantity: 1,
        weightKg: 86,
        lengthCm: 260,
        widthCm: 810,
        heightCm: 100,
      },
      {
        name: 'Box 5',
        type: 'box',
        quantity: 1,
        weightKg: 14,
        lengthCm: 280,
        widthCm: 15,
        heightCm: 15,
      },
      {
        name: 'Box 6-13',
        type: 'box',
        quantity: 8,
        weightKg: 10,
        lengthCm: 72,
        widthCm: 60,
        heightCm: 59,
      },
    ],
  },
  {
    title: 'Backyard Office Pod (L/5x7)',
    description: 'Medium backyard office space',
    basePrice: 9999.0,
    dimensions: [
      {
        name: 'Pallet 1',
        type: 'pallet',
        quantity: 1,
        weightKg: 680,
        lengthCm: 231,
        widthCm: 127,
        heightCm: 115,
      },
      {
        name: 'Box 2',
        type: 'box',
        quantity: 1,
        weightKg: 6,
        lengthCm: 160,
        widthCm: 213,
        heightCm: 15,
      },
      {
        name: 'Box 3',
        type: 'box',
        quantity: 1,
        weightKg: 6,
        lengthCm: 42,
        widthCm: 25,
        heightCm: 15,
      },
      {
        name: 'Box 4-5',
        type: 'box',
        quantity: 2,
        weightKg: 54,
        lengthCm: 156,
        widthCm: 82,
        heightCm: 34,
      },
    ],
  },
  {
    title: '8-10 Person Backyard Office Pod',
    description: 'Large backyard office for 8-10 people',
    basePrice: 15999.0,
    dimensions: [
      {
        name: 'Pallet 1',
        type: 'pallet',
        quantity: 1,
        weightKg: 756,
        lengthCm: 312,
        widthCm: 98,
        heightCm: 102,
      },
      {
        name: 'Box 2',
        type: 'box',
        quantity: 1,
        weightKg: 324,
        lengthCm: 230,
        widthCm: 144,
        heightCm: 137,
      },
      {
        name: 'Box 3',
        type: 'box',
        quantity: 1,
        weightKg: 233,
        lengthCm: 430,
        widthCm: 66,
        heightCm: 38.5,
      },
      {
        name: 'Box 4',
        type: 'box',
        quantity: 1,
        weightKg: 80,
        lengthCm: 120,
        widthCm: 100,
        heightCm: 70,
      },
    ],
  },
  {
    title: 'Nursing Pod M',
    description: 'Medium nursing pod for healthcare facilities',
    basePrice: 5999.0,
    dimensions: [
      {
        name: 'Pallet 1',
        type: 'pallet',
        quantity: 1,
        weightKg: 400,
        lengthCm: 200,
        widthCm: 100,
        heightCm: 120,
      },
      {
        name: 'Box 2',
        type: 'box',
        quantity: 1,
        weightKg: 25,
        lengthCm: 100,
        widthCm: 50,
        heightCm: 30,
      },
    ],
  },
  {
    title: 'Nursing Pod L',
    description: 'Large nursing pod for healthcare facilities',
    basePrice: 7999.0,
    dimensions: [
      {
        name: 'Pallet 1',
        type: 'pallet',
        quantity: 1,
        weightKg: 500,
        lengthCm: 220,
        widthCm: 120,
        heightCm: 140,
      },
      {
        name: 'Box 2',
        type: 'box',
        quantity: 1,
        weightKg: 35,
        lengthCm: 120,
        widthCm: 60,
        heightCm: 40,
      },
    ],
  },
  {
    title: 'Nursing Pod XL ADA',
    description: 'Extra large ADA-compliant nursing pod',
    basePrice: 8999.0,
    dimensions: [
      {
        name: 'Pallet 1',
        type: 'pallet',
        quantity: 1,
        weightKg: 600,
        lengthCm: 240,
        widthCm: 140,
        heightCm: 160,
      },
      {
        name: 'Box 2',
        type: 'box',
        quantity: 1,
        weightKg: 45,
        lengthCm: 140,
        widthCm: 70,
        heightCm: 50,
      },
    ],
  },
];

async function seedProducts() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    for (const productInfo of productData) {
      // Calculate total weight and basic dimensions for the product
      const totalWeight = productInfo.dimensions.reduce(
        (sum, dim) => sum + dim.weightKg * dim.quantity,
        0,
      );
      const maxLength = Math.max(
        ...productInfo.dimensions.map((d) => d.lengthCm),
      );
      const maxWidth = Math.max(
        ...productInfo.dimensions.map((d) => d.widthCm),
      );
      const maxHeight = Math.max(
        ...productInfo.dimensions.map((d) => d.heightCm),
      );

      // Insert product
      const productResult = await pool.query(
        `INSERT INTO products (title, description, base_price, weight_kg, length_cm, width_cm, height_cm, volume_cbm, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id`,
        [
          productInfo.title,
          productInfo.description,
          productInfo.basePrice.toString(),
          totalWeight.toString(),
          maxLength.toString(),
          maxWidth.toString(),
          maxHeight.toString(),
          ((maxLength * maxWidth * maxHeight) / 1000000).toString(),
          'true', // is_active
        ],
      );

      const productId = productResult.rows[0].id;

      // Insert dimensions
      for (const dimension of productInfo.dimensions) {
        await pool.query(
          `INSERT INTO product_dimensions (product_id, name, type, quantity, weight_kg, length_cm, width_cm, height_cm, volume_cbm)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            productId,
            dimension.name,
            dimension.type,
            dimension.quantity,
            dimension.weightKg.toString(),
            dimension.lengthCm.toString(),
            dimension.widthCm.toString(),
            dimension.heightCm.toString(),
            (
              (dimension.lengthCm * dimension.widthCm * dimension.heightCm) /
              1000000
            ).toString(),
          ],
        );
      }

      console.log(`Inserted product: ${productInfo.title}`);
    }

    console.log('Products seeded successfully!');
  } catch (error) {
    console.error('Error seeding products:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run seeder
seedProducts().catch(console.error);
