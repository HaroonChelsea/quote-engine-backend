const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'apple',
  user: 'apple',
  password: 'apple',
});

const customerData = [
  {
    firstName: 'John',
    lastName: 'Doe',
    companyName: 'John Doe Inc.',
    email: 'john.doe@example.com',
    phone: '123-456-7890',
    streetAddress: 'Malibu Road',
    city: 'Malibu',
    state: 'CA',
    zip: '90265',
  },
  {
    firstName: 'Jane',
    lastName: 'Smith',
    companyName: 'Smith Enterprises',
    email: 'jane.smith@example.com',
    phone: '987-654-3210',
    streetAddress: 'Business Blvd',
    city: 'Los Angeles',
    state: 'CA',
    zip: '90210',
  },
];

async function seedCustomers() {
  try {
    await client.connect();
    console.log('Connected to database');

    // Check if customers table exists and has data
    const checkResult = await client.query('SELECT COUNT(*) FROM customers');
    const count = parseInt(checkResult.rows[0].count);

    if (count > 0) {
      console.log(
        `Customers table already has ${count} records. Skipping seed.`,
      );
      return;
    }

    // Insert customers
    for (const customer of customerData) {
      const query = `
        INSERT INTO customers (first_name, last_name, company_name, email, phone, street_address, city, state, zip)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
      `;

      const values = [
        customer.firstName,
        customer.lastName,
        customer.companyName,
        customer.email,
        customer.phone,
        customer.streetAddress,
        customer.city,
        customer.state,
        customer.zip,
      ];

      const result = await client.query(query, values);
      console.log(
        `Created customer: ${customer.firstName} ${customer.lastName} (ID: ${result.rows[0].id})`,
      );
    }

    console.log('Customer seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding customers:', error);
  } finally {
    await client.end();
  }
}

seedCustomers();
