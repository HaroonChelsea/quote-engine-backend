const { Pool } = require('pg');
require('dotenv').config();

const shippingOptionsData = [
  // Shipping Method Group
  {
    groupName: 'Shipping Method',
    type: 'SINGLE_SELECT',
    options: [
      { title: 'Ocean Freight', price: '0.00' }, // Base price, will be calculated dynamically
      { title: 'Air Freight', price: '0.00' },
      { title: 'Express Air', price: '0.00' },
    ],
  },
  // Package Type Group
  {
    groupName: 'Package Type',
    type: 'SINGLE_SELECT',
    options: [
      { title: 'Pallet Only', price: '0.00' },
      { title: 'Box Only', price: '0.00' },
      { title: 'Mixed (Pallets + Boxes)', price: '0.00' },
    ],
  },
  // Service Level Group
  {
    groupName: 'Service Level',
    type: 'SINGLE_SELECT',
    options: [
      { title: 'Standard', price: '0.00' },
      { title: 'Premium', price: '50.00' },
      { title: 'Express', price: '150.00' },
    ],
  },
];

// Shipping pricing rules based on volume and weight
const shippingPricingRules = {
  'Ocean Freight': {
    basePrice: 50.0,
    volumeMultiplier: 150.0, // per cubic meter
    weightMultiplier: 0.5, // per kg
    transitTime: { min: 25, max: 35 },
  },
  'Air Freight': {
    basePrice: 100.0,
    volumeMultiplier: 800.0, // per cubic meter
    weightMultiplier: 2.0, // per kg
    transitTime: { min: 3, max: 7 },
  },
  'Express Air': {
    basePrice: 200.0,
    volumeMultiplier: 1200.0, // per cubic meter
    weightMultiplier: 3.0, // per kg
    transitTime: { min: 1, max: 3 },
  },
};

async function seedShippingOptions() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🌊 Seeding shipping options...');

    for (const groupData of shippingOptionsData) {
      // Create option group
      const groupResult = await pool.query(
        `INSERT INTO option_groups (name, type) VALUES ($1, $2) RETURNING id`,
        [groupData.groupName, groupData.type],
      );

      const groupId = groupResult.rows[0].id;
      console.log(`✅ Created option group: ${groupData.groupName}`);

      // Create options for this group
      for (const option of groupData.options) {
        await pool.query(
          `INSERT INTO options (group_id, title, price) VALUES ($1, $2, $3)`,
          [groupId, option.title, option.price],
        );
        console.log(`  - Added option: ${option.title}`);
      }
    }

    console.log('🎉 Shipping options seeding completed!');
    console.log('\n📋 Available shipping options:');
    console.log(
      '   • Shipping Method: Ocean Freight, Air Freight, Express Air',
    );
    console.log('   • Package Type: Pallet Only, Box Only, Mixed');
    console.log('   • Service Level: Standard, Premium, Express');
    console.log('\n💰 Pricing is calculated dynamically based on:');
    console.log('   • Volume (cubic meters)');
    console.log('   • Weight (kg)');
    console.log('   • Selected shipping method');
    console.log('   • Service level premium');
  } catch (error) {
    console.error('❌ Error seeding shipping options:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run seeder
seedShippingOptions().catch(console.error);

