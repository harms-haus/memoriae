// Followup service for managing follow-ups and their transactions
import { v4 as uuidv4 } from 'uuid'
import db from '../db/connection'
import type {
  Followup,
  FollowupRow,
  FollowupTransaction,
  FollowupTransactionRow,
  CreateFollowupDto,
  EditFollowupDto,
  CreationTransactionData,
  EditTransactionData,
  DismissalTransactionData,
  SnoozeTransactionData,
  DueFollowup,
  FollowupTrigger,
  DismissalType,
  SnoozeMethod,
} from '../types/followups'

/**
 * Compute followup state from transactions
 * Rebuilds the current state by processing transactions chronologically
 */
function computeFollowupState(
  followupRow: FollowupRow,
  transactions: FollowupTransaction[]
): Followup {
  // Sort transactions by created_at (oldest first)
  const sortedTransactions = [...transactions].sort(
    (a, b) => a.created_at.getTime() - b.created_at.getTime()
  )

  // Find creation transaction (must be first)
  const creationTransaction = sortedTransactions.find(
    (t) => t.transaction_type === 'creation'
  )

  if (!creationTransaction) {
    throw new Error('Followup must have a creation transaction')
  }

  const creationData = creationTransaction.transaction_data as CreationTransactionData

  // Start with initial state from creation
  let dueTime = new Date(creationData.initial_time)
  let message = creationData.initial_message
  let dismissed = false
  let dismissedAt: Date | undefined

  // Process remaining transactions in order
  for (const transaction of sortedTransactions) {
    if (transaction.transaction_type === 'creation') {
      continue // Already processed
    }

    if (transaction.transaction_type === 'edit') {
      const editData = transaction.transaction_data as EditTransactionData
      if (editData.new_time) {
        dueTime = new Date(editData.new_time)
      }
      if (editData.new_message) {
        message = editData.new_message
      }
    } else if (transaction.transaction_type === 'snooze') {
      const snoozeData = transaction.transaction_data as SnoozeTransactionData
      // Add duration to current due time
      dueTime = new Date(dueTime.getTime() + snoozeData.duration_minutes * 60 * 1000)
    } else if (transaction.transaction_type === 'dismissal') {
      const dismissalData = transaction.transaction_data as DismissalTransactionData
      dismissed = true
      dismissedAt = new Date(dismissalData.dismissed_at)
    }
  }

  const result: Followup = {
    id: followupRow.id,
    seed_id: followupRow.seed_id,
    created_at: creationTransaction.created_at,
    due_time: dueTime,
    message,
    dismissed,
    transactions: sortedTransactions,
  }
  
  if (dismissedAt) {
    result.dismissed_at = dismissedAt
  }
  
  return result
}

export class FollowupService {
  /**
   * Get all followups for a seed with computed state
   */
  static async getBySeedId(seedId: string): Promise<Followup[]> {
    // Get all followups for this seed
    const followupRows = await db<FollowupRow>('followups')
      .where({ seed_id: seedId })
      .select('*')

    if (followupRows.length === 0) {
      return []
    }

    // Get all transactions for these followups
    const followupIds = followupRows.map((f) => f.id)
    const transactionRows = await db<FollowupTransactionRow>('followup_transactions')
      .whereIn('followup_id', followupIds)
      .orderBy('created_at', 'asc')
      .select('*')

    // Group transactions by followup_id
    const transactionsByFollowup = new Map<string, FollowupTransaction[]>()
    for (const row of transactionRows) {
      const transaction: FollowupTransaction = {
        id: row.id,
        followup_id: row.followup_id,
        transaction_type: row.transaction_type,
        transaction_data: row.transaction_data as any,
        created_at: new Date(row.created_at),
      }

      const existing = transactionsByFollowup.get(row.followup_id) || []
      existing.push(transaction)
      transactionsByFollowup.set(row.followup_id, existing)
    }

    // Compute state for each followup
    return followupRows.map((followupRow) => {
      const transactions = transactionsByFollowup.get(followupRow.id) || []
      return computeFollowupState(followupRow, transactions)
    })
  }

  /**
   * Get followup by ID with computed state
   */
  static async getById(followupId: string): Promise<Followup | null> {
    const followupRow = await db<FollowupRow>('followups')
      .where({ id: followupId })
      .first()

    if (!followupRow) {
      return null
    }

    const transactionRows = await db<FollowupTransactionRow>('followup_transactions')
      .where({ followup_id: followupId })
      .orderBy('created_at', 'asc')
      .select('*')

    const transactions: FollowupTransaction[] = transactionRows.map((row) => ({
      id: row.id,
      followup_id: row.followup_id,
      transaction_type: row.transaction_type,
      transaction_data: row.transaction_data as any,
      created_at: new Date(row.created_at),
    }))

    return computeFollowupState(followupRow, transactions)
  }

  /**
   * Create a new followup with creation transaction
   */
  static async create(
    seedId: string,
    data: CreateFollowupDto,
    trigger: FollowupTrigger
  ): Promise<Followup> {
    const followupId = uuidv4()
    const now = new Date()

    // Create followup row
    await db<FollowupRow>('followups').insert({
      id: followupId,
      seed_id: seedId,
    })

    // Create creation transaction
    const creationData: CreationTransactionData = {
      trigger,
      initial_time: data.due_time,
      initial_message: data.message,
    }

    await db<FollowupTransactionRow>('followup_transactions').insert({
      id: uuidv4(),
      followup_id: followupId,
      transaction_type: 'creation',
      transaction_data: db.raw('?::jsonb', [JSON.stringify(creationData)]),
      created_at: now,
    })

    // Return computed state
    const followup = await this.getById(followupId)
    if (!followup) {
      throw new Error('Failed to create followup')
    }

    return followup
  }

  /**
   * Edit followup (adds edit transaction)
   */
  static async edit(followupId: string, data: EditFollowupDto): Promise<Followup> {
    // Get current state
    const current = await this.getById(followupId)
    if (!current) {
      throw new Error('Followup not found')
    }

    if (current.dismissed) {
      throw new Error('Cannot edit dismissed followup')
    }

    // Build edit transaction data
    const editData: EditTransactionData = {
      new_time: data.due_time || current.due_time.toISOString(),
      new_message: data.message || current.message,
    }

    // Only include old values if they're being changed
    if (data.due_time && data.due_time !== current.due_time.toISOString()) {
      editData.old_time = current.due_time.toISOString()
    }
    if (data.message && data.message !== current.message) {
      editData.old_message = current.message
    }

    // Create edit transaction
    await db<FollowupTransactionRow>('followup_transactions').insert({
      id: uuidv4(),
      followup_id: followupId,
      transaction_type: 'edit',
      transaction_data: db.raw('?::jsonb', [JSON.stringify(editData)]),
      created_at: new Date(),
    })

    // Return updated state
    const updated = await this.getById(followupId)
    if (!updated) {
      throw new Error('Failed to update followup')
    }

    return updated
  }

  /**
   * Snooze followup (adds snooze transaction)
   */
  static async snooze(
    followupId: string,
    durationMinutes: number,
    method: SnoozeMethod
  ): Promise<Followup> {
    // Get current state
    const current = await this.getById(followupId)
    if (!current) {
      throw new Error('Followup not found')
    }

    if (current.dismissed) {
      throw new Error('Cannot snooze dismissed followup')
    }

    // Create snooze transaction
    const snoozeData: SnoozeTransactionData = {
      snoozed_at: new Date().toISOString(),
      duration_minutes: durationMinutes,
      method,
    }

    await db<FollowupTransactionRow>('followup_transactions').insert({
      id: uuidv4(),
      followup_id: followupId,
      transaction_type: 'snooze',
      transaction_data: db.raw('?::jsonb', [JSON.stringify(snoozeData)]),
      created_at: new Date(),
    })

    // Return updated state
    const updated = await this.getById(followupId)
    if (!updated) {
      throw new Error('Failed to snooze followup')
    }

    return updated
  }

  /**
   * Dismiss followup (adds dismissal transaction)
   */
  static async dismiss(followupId: string, type: DismissalType): Promise<Followup> {
    // Get current state
    const current = await this.getById(followupId)
    if (!current) {
      throw new Error('Followup not found')
    }

    if (current.dismissed) {
      throw new Error('Followup already dismissed')
    }

    // Create dismissal transaction
    const dismissalData: DismissalTransactionData = {
      dismissed_at: new Date().toISOString(),
      type,
    }

    await db<FollowupTransactionRow>('followup_transactions').insert({
      id: uuidv4(),
      followup_id: followupId,
      transaction_type: 'dismissal',
      transaction_data: db.raw('?::jsonb', [JSON.stringify(dismissalData)]),
      created_at: new Date(),
    })

    // Return updated state
    const updated = await this.getById(followupId)
    if (!updated) {
      throw new Error('Failed to dismiss followup')
    }

    return updated
  }

  /**
   * Get followups that are due for notification
   * Returns followups where due_time <= now and not dismissed
   */
  static async getDueFollowups(userId: string): Promise<DueFollowup[]> {
    const now = new Date()

    // Get all seeds for user
    const seeds = await db('seeds')
      .where({ user_id: userId })
      .select('id')

    const seedIds = seeds.map((s) => s.id)

    if (seedIds.length === 0) {
      return []
    }

    // Get all followups for user's seeds
    const followupRows = await db<FollowupRow>('followups')
      .whereIn('seed_id', seedIds)
      .select('*')

    if (followupRows.length === 0) {
      return []
    }

    // Get all transactions
    const followupIds = followupRows.map((f) => f.id)
    const transactionRows = await db<FollowupTransactionRow>('followup_transactions')
      .whereIn('followup_id', followupIds)
      .orderBy('created_at', 'asc')
      .select('*')

    // Group transactions by followup_id
    const transactionsByFollowup = new Map<string, FollowupTransaction[]>()
    for (const row of transactionRows) {
      const transaction: FollowupTransaction = {
        id: row.id,
        followup_id: row.followup_id,
        transaction_type: row.transaction_type,
        transaction_data: row.transaction_data as any,
        created_at: new Date(row.created_at),
      }

      const existing = transactionsByFollowup.get(row.followup_id) || []
      existing.push(transaction)
      transactionsByFollowup.set(row.followup_id, existing)
    }

    // Compute state and filter for due followups
    const dueFollowups: DueFollowup[] = []

    for (const followupRow of followupRows) {
      const transactions = transactionsByFollowup.get(followupRow.id) || []
      const followup = computeFollowupState(followupRow, transactions)

      // Check if due and not dismissed
      if (!followup.dismissed && followup.due_time <= now) {
        // Find seed_id
        const seed = seeds.find((s) => s.id === followup.seed_id)
        if (seed) {
          dueFollowups.push({
            followup_id: followup.id,
            seed_id: followup.seed_id,
            user_id: userId,
            due_time: followup.due_time,
            message: followup.message,
          })
        }
      }
    }

    return dueFollowups
  }
}

