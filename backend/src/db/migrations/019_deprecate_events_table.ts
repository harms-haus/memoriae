import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  // Events table is no longer used - migration kept for reference
  // The table can be dropped in a future migration if needed
}

export async function down(knex: Knex): Promise<void> {
  // No-op
}

