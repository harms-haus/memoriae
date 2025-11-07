import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  // First, we need to temporarily allow the column to accept text values
  // Then update the data, then recreate the enum
  
  // Step 1: Convert the enum column to text temporarily
  await knex.raw(`
    ALTER TABLE seed_transactions
    ALTER COLUMN transaction_type TYPE text;
  `)

  // Step 2: Update any existing 'add_category' values to 'set_category'
  await knex('seed_transactions')
    .where('transaction_type', 'add_category')
    .update('transaction_type', 'set_category')

  // Step 3: Drop the old enum type
  await knex.raw(`
    DROP TYPE seed_transaction_type;
  `)

  // Step 4: Create the new enum type with 'set_category' instead of 'add_category'
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

export async function down(knex: Knex): Promise<void> {
  // Step 1: Convert the enum column to text temporarily
  await knex.raw(`
    ALTER TABLE seed_transactions
    ALTER COLUMN transaction_type TYPE text;
  `)

  // Step 2: Update any existing 'set_category' values back to 'add_category'
  await knex('seed_transactions')
    .where('transaction_type', 'set_category')
    .update('transaction_type', 'add_category')

  // Step 3: Drop the current enum type
  await knex.raw(`
    DROP TYPE seed_transaction_type;
  `)

  // Step 4: Recreate the enum type with 'add_category'
  await knex.raw(`
    CREATE TYPE seed_transaction_type AS ENUM (
      'create_seed',
      'edit_content',
      'add_tag',
      'remove_tag',
      'add_category',
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

