import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  // Add 'add_sprout' to the enum type
  await knex.raw(`
    ALTER TYPE seed_transaction_type ADD VALUE IF NOT EXISTS 'add_sprout'
  `)

  // Migrate existing add_followup transactions to add_sprout
  // Note: We keep add_followup in the enum for backward compatibility during migration
  // The followup_id in transaction_data should map to sprout_id
  await knex('seed_transactions')
    .where({ transaction_type: 'add_followup' })
    .update({
      transaction_type: knex.raw("'add_sprout'::seed_transaction_type"),
      transaction_data: knex.raw(`
        jsonb_build_object(
          'sprout_id', transaction_data->>'followup_id'
        )
      `),
    })
}

export async function down(knex: Knex): Promise<void> {
  // Migrate add_sprout transactions back to add_followup
  // Note: This assumes sprouts were migrated from followups and IDs match
  await knex('seed_transactions')
    .where({ transaction_type: 'add_sprout' })
    .update({
      transaction_type: knex.raw("'add_followup'::seed_transaction_type"),
      transaction_data: knex.raw(`
        jsonb_build_object(
          'followup_id', transaction_data->>'sprout_id'
        )
      `),
    })

  // Note: We cannot remove 'add_sprout' from the enum in PostgreSQL
  // Enum values cannot be removed once added
}

