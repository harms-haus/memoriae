import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  // Add 'wikipedia_reference' to sprout_type enum
  await knex.raw(`
    ALTER TYPE sprout_type ADD VALUE IF NOT EXISTS 'wikipedia_reference'
  `)
}

export async function down(knex: Knex): Promise<void> {
  // Note: PostgreSQL does not support removing enum values
  // This migration cannot be fully reversed
  // If needed, the enum would need to be recreated without this value
  // For now, we'll leave it as a no-op
}

