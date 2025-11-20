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

      // Extract transaction_data - handle both string and object cases
      let transactionData = creationTransaction.transaction_data
      if (typeof transactionData === 'string') {
        try {
          transactionData = JSON.parse(transactionData)
        } catch {
          console.warn(`Failed to parse transaction_data for followup ${followup.id}, skipping`)
          continue
        }
      }
      
      const creationData = transactionData as {
        trigger: string
        initial_time: string
        initial_message: string
      }
      
      if (!creationData.trigger || !creationData.initial_time || !creationData.initial_message) {
        console.warn(`Invalid transaction_data for followup ${followup.id}, skipping`)
        continue
      }

      // Create sprout with followup type
      const sproutId = followup.id // Use same ID to preserve relationships
      await knex('sprouts').insert({
        id: sproutId,
        seed_id: followup.seed_id,
        sprout_type: 'followup',
        sprout_data: {
          trigger: creationData.trigger,
          initial_time: creationData.initial_time,
          initial_message: creationData.initial_message,
        },
        created_at: creationTransaction.created_at,
        automation_id: null, // Followups don't have automation_id in old schema
      })

      // Migrate followup transactions to sprout_followup_transactions
      const followupTransactions = await knex('followup_transactions')
        .where({ followup_id: followup.id })
        .orderBy('created_at', 'asc')

      for (const transaction of followupTransactions) {
        // Ensure transaction_data is properly formatted as JSONB
        const transactionData = typeof transaction.transaction_data === 'string'
          ? JSON.parse(transaction.transaction_data)
          : transaction.transaction_data
        
        await knex('sprout_followup_transactions').insert({
          id: transaction.id, // Use same ID
          sprout_id: sproutId,
          transaction_type: transaction.transaction_type,
          transaction_data: transactionData,
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
      // Extract content - handle both string and object cases
      let content = musing.content
      if (typeof content === 'string') {
        try {
          content = JSON.parse(content)
        } catch {
          console.warn(`Failed to parse content for musing ${musing.id}, using as-is`)
        }
      }
      
      // Extract completed - handle case where column might not exist (pre-027 migration)
      const completed = musing.completed ?? false
      
      // Create sprout with musing type
      const sproutId = musing.id // Use same ID to preserve relationships
      await knex('sprouts').insert({
        id: sproutId,
        seed_id: musing.seed_id,
        sprout_type: 'musing',
        sprout_data: {
          template_type: musing.template_type,
          content: content,
          dismissed: musing.dismissed,
          dismissed_at: musing.dismissed_at,
          completed: completed,
          completed_at: musing.completed_at,
        },
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

