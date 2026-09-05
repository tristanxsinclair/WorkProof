import { sqliteTable, text, index } from 'drizzle-orm/sqlite-core';
export const experiences=sqliteTable('experiences',{
 id:text('id').primaryKey(),owner:text('owner').notNull(),record:text('record').notNull(),createdAt:text('created_at').notNull(),
},table=>[index('experiences_owner').on(table.owner)]);

export const verificationRequests = sqliteTable('verification_requests', {
 id: text('id').primaryKey(),
 experienceId: text('experience_id').notNull().references(() => experiences.id),
 ownerId: text('owner_id').notNull(),
 workerName: text('worker_name').notNull(),
 recipientEmail: text('recipient_email').notNull(),
 version: text('version').notNull(),
 snapshot: text('snapshot').notNull(),
 status: text('status').notNull().default('pending'),
 createdAt: text('created_at').notNull(),
 expiresAt: text('expires_at').notNull(),
 response: text('response'),
}, table => [index('verification_owner_created').on(table.ownerId, table.createdAt)]);
