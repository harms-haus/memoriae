import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  // Add user_id column (nullable initially to handle existing data)
  await knex.schema.alterTable('categories', (table) => {
    table.uuid('user_id').nullable()
  })

  // Try to assign existing categories to users based on seeds that use them
  // Get the user_id from the first seed that uses each category
  await knex.raw(`
    UPDATE categories
    SET user_id = (
      SELECT DISTINCT s.user_id
      FROM seeds s
      INNER JOIN seed_transactions st ON s.id = st.seed_id
      WHERE st.transaction_type = 'set_category'
        AND (st.transaction_data->>'category_id')::uuid = categories.id
      LIMIT 1
    )
  `)

  // Delete categories that couldn't be assigned to any user (orphaned categories)
  await knex('categories').whereNull('user_id').delete()

  // Now make user_id NOT NULL and add foreign key constraint
  await knex.schema.alterTable('categories', (table) => {
    table.uuid('user_id').notNullable().alter()
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE')
    table.index('user_id')
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('categories', (table) => {
    table.dropForeign('user_id')
    table.dropIndex('user_id')
    table.dropColumn('user_id')
  })
}

