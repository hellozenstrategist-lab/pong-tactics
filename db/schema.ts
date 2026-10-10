import {sqliteTable,text,integer} from 'drizzle-orm/sqlite-core';
export const familiarConnections=sqliteTable('familiar_connections',{
 userId:text('user_id').primaryKey(),
 ciphertext:text('ciphertext').notNull(),
 model:text('model').notNull(),
 expiresAt:integer('expires_at').notNull(),
 lastUsed:integer('last_used').notNull().default(0),
 calls:integer('calls').notNull().default(0),
});
