import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import * as userSchema from '../users/users.schema';

async function resetAdminPassword() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/quote-engine',
  });

  const db = drizzle(pool, { schema: userSchema });

  const password = '12345678';
  const hashedPassword = await bcrypt.hash(password, 10);

  await db
    .update(userSchema.users)
    .set({ password: hashedPassword })
    .where(eq(userSchema.users.email, 'admin@gmail.com'));

  console.log('Admin password reset to: 12345678');
  console.log('Hashed password:', hashedPassword);

  await pool.end();
}

resetAdminPassword();
