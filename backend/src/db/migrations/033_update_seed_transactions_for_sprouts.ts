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

  // Step 3: Drop the old enum type
  await knex.raw(`
    DROP TYPE seed_transaction_type;
  `)

  // Step 4: Create the new enum type with 'add_sprout' instead of 'add_followup'
  await knex.raw(`
    CREATE TYPE seed_transaction_type AS ENUM (
      'create_seed',
      'edit_content',
      'add_tag',
      'remove_tag',
      'set_category',
      'remove_category',
      'add_sprout'
    )
  `)

  // Step 5: Convert the column back to the enum type
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

  // Step 3: Drop the current enum type
  await knex.raw(`
    DROP TYPE seed_transaction_type;
  `)

  // Step 4: Recreate the enum type with 'add_followup' instead of 'add_sprout'
  await knex.raw(`
    CREATE TYPE seed_transaction_type AS ENUM (
      'create_seed',
      'edit_content',
      'add_tag',
      'remove_tag',
      'set_category',
      'remove_category',
      'add_followup'
    )
  `)

  // Step 5: Convert the column back to the enum type
  await knex.raw(`
    ALTER TABLE seed_transactions
    ALTER COLUMN transaction_type TYPE seed_transaction_type
    USING transaction_type::seed_transaction_type;
  `)
}

