import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  // Check if sprouts table exists (should be created by previous migration)
  const hasSproutsTable = await knex.schema.hasTable('sprouts')
  if (!hasSproutsTable) {
    throw new Error('sprouts table must exist before running this migration')
  }

  // Migrate followups to sprouts
  const hasFollowupsTable = await knex.schema.hasTable('followups')
  if (hasFollowupsTable) {
    const followups = await knex('followups').select('*')
    
    for (const followup of followups) {
      // Get creation transaction to extract initial data
      const creationTransaction = await knex('followup_transactions')
        .where({ followup_id: followup.id, transaction_type: 'creation' })
        .orderBy('created_at', 'asc')
        .first()

      if (!creationTransaction) {
        console.warn(`No creation transaction found for followup ${followup.id}, skipping`)
        continue
      }

      const creationData = creationTransaction.transaction_data as {
        trigger: string
        initial_time: string
        initial_message: string
      }

      // Create sprout with followup type
      const sproutId = followup.id // Use same ID to preserve relationships
      await knex('sprouts').insert({
        id: sproutId,
        seed_id: followup.seed_id,
        sprout_type: 'followup',
        sprout_data: knex.raw('?::jsonb', [
          JSON.stringify({
            trigger: creationData.trigger,
            initial_time: creationData.initial_time,
            initial_message: creationData.initial_message,
          }),
        ]),
        created_at: creationTransaction.created_at,
        automation_id: null, // Followups don't have automation_id in old schema
      })

      // Migrate followup transactions to sprout_followup_transactions
      const followupTransactions = await knex('followup_transactions')
        .where({ followup_id: followup.id })
        .orderBy('created_at', 'asc')

      for (const transaction of followupTransactions) {
        await knex('sprout_followup_transactions').insert({
          id: transaction.id, // Use same ID
          sprout_id: sproutId,
          transaction_type: transaction.transaction_type,
          transaction_data: transaction.transaction_data,
          created_at: transaction.created_at,
        })
      }
    }
  }

  // Migrate idea_musings to sprouts
  const hasIdeaMusingsTable = await knex.schema.hasTable('idea_musings')
  if (hasIdeaMusingsTable) {
    const musings = await knex('idea_musings').select('*')

    for (const musing of musings) {
      // Create sprout with musing type
      const sproutId = musing.id // Use same ID to preserve relationships
      await knex('sprouts').insert({
        id: sproutId,
        seed_id: musing.seed_id,
        sprout_type: 'musing',
        sprout_data: knex.raw('?::jsonb', [
          JSON.stringify({
            template_type: musing.template_type,
            content: musing.content,
            dismissed: musing.dismissed,
            dismissed_at: musing.dismissed_at,
            completed: musing.completed ?? false,
            completed_at: musing.completed_at,
          }),
        ]),
        created_at: musing.created_at,
        automation_id: null, // Idea musings don't have automation_id in old schema
      })
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  // This migration is one-way - we don't convert back
  // The old tables will be dropped in a later migration
  console.warn('Migration 032 is one-way. Old followups and musings data has been migrated to sprouts.')
}

