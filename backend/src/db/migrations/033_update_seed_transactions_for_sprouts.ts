import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  // Step 1: Convert the enum column to text temporarily
  // This allows us to update values without enum type constraints
  await knex.raw(`
    ALTER TABLE seed_transactions
    ALTER COLUMN transaction_type TYPE text;
  `)

  // Step 2: Migrate existing add_followup transactions to add_sprout
  // Update using text values (no enum casting needed)
  // The followup_id in transaction_data should map to sprout_id
  await knex('seed_transactions')
    .where('transaction_type', 'add_followup')
    .update({
      transaction_type: 'add_sprout',
      transaction_data: knex.raw(`
        jsonb_build_object(
          'sprout_id', transaction_data->>'followup_id'
        )
      `),
    })

  // Step 3: Add 'add_sprout' to the enum type
  await knex.raw(`
    ALTER TYPE seed_transaction_type ADD VALUE IF NOT EXISTS 'add_sprout'
  `)

  // Step 4: Convert the column back to the enum type
  await knex.raw(`
    ALTER TABLE seed_transactions
    ALTER COLUMN transaction_type TYPE seed_transaction_type
    USING transaction_type::seed_transaction_type;
  `)
}

export async function down(knex: Knex): Promise<void> {
  // Step 1: Convert the enum column to text temporarily
  await knex.raw(`
    ALTER TABLE seed_transactions
    ALTER COLUMN transaction_type TYPE text;
  `)

  // Step 2: Migrate add_sprout transactions back to add_followup
  // Note: This assumes sprouts were migrated from followups and IDs match
  await knex('seed_transactions')
    .where('transaction_type', 'add_sprout')
    .update({
      transaction_type: 'add_followup',
      transaction_data: knex.raw(`
        jsonb_build_object(
          'followup_id', transaction_data->>'sprout_id'
        )
      `),
    })

  // Step 3: Convert the column back to the enum type
  await knex.raw(`
    ALTER TABLE seed_transactions
    ALTER COLUMN transaction_type TYPE seed_transaction_type
    USING transaction_type::seed_transaction_type;
  `)

  // Note: We cannot remove 'add_sprout' from the enum in PostgreSQL
  // Enum values cannot be removed once added
}

