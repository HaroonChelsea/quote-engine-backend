import { timestamp, serial, text, integer } from 'drizzle-orm/pg-core';
import { pgTable } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const roles = pgTable('roles', {
  id: serial('id').primaryKey(),
  name: text('name').unique().notNull(),
});

export const rolesRelations = relations(roles, ({ many }) => ({
  users: many(users),
}));

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').unique().notNull(),
  password: text('password').notNull(),
  timestamp: timestamp('created_at').defaultNow(),
  roleId: integer('role_id').references(() => roles.id),
});

export const usersRelations = relations(users, ({ one }) => ({
  role: one(roles, {
    fields: [users.roleId],
    references: [roles.id],
  }),
}));
