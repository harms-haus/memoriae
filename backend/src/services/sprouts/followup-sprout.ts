// Followup sprout handler - manages followup sprout state via transactions
import { v4 as uuidv4 } from 'uuid'
import db from '../../db/connection'
import { SproutsService } from '../sprouts'
import type {
  Sprout,
  FollowupSproutData,
  FollowupSproutState,
  SproutFollowupTransaction,
  SproutFollowupTransactionRow,
  CreationTransactionData,
  EditTransactionData,
  DismissalTransactionData,
  SnoozeTransactionData,
  EditFollowupSproutDto,
  SnoozeFollowupSproutDto,
  DismissFollowupSproutDto,
} from '../../types/sprouts'
import log from 'loglevel'

const logHandler = log.getLogger('Handler:FollowupSprout')

/**
 * Compute followup sprout state from transactions
 */
function computeFollowupState(
  sprout: Sprout,
  transactions: SproutFollowupTransaction[]
): FollowupSproutState {
  // Sort transactions by created_at (oldest first)
  const sortedTransactions = [...transactions].sort(
    (a, b) => a.created_at.getTime() - b.created_at.getTime()
  )

  // Find creation transaction (must be first)
  const creationTransaction = sortedTransactions.find(
    (t) => t.transaction_type === 'creation'
  )

  if (!creationTransaction) {
    throw new Error('Followup sprout must have a creation transaction')
  }

  const sproutData = sprout.sprout_data as FollowupSproutData

  // Start with initial state from creation
  let dueTime = new Date(sproutData.initial_time)
  let message = sproutData.initial_message
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

  const result: FollowupSproutState = {
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

/**
 * Get computed state for a followup sprout
 */
export async function getFollowupState(sprout: Sprout): Promise<FollowupSproutState> {
  logHandler.debug(`getFollowupState - Computing state for sprout ${sprout.id}`)
  try {
    // Get all transactions for this sprout
    const transactionRows = await db<SproutFollowupTransactionRow>(
      'sprout_followup_transactions'
    )
      .where({ sprout_id: sprout.id })
      .orderBy('created_at', 'asc')
      .select('*')

    const transactions: SproutFollowupTransaction[] = transactionRows.map((row) => ({
      id: row.id,
      sprout_id: row.sprout_id,
      transaction_type: row.transaction_type,
      transaction_data: row.transaction_data,
      created_at: new Date(row.created_at),
    }))

    return computeFollowupState(sprout, transactions)
  } catch (error) {
    logHandler.error(`getFollowupState - Error computing state for sprout ${sprout.id}:`, error)
    throw error
  }
}

/**
 * Edit a followup sprout (adds edit transaction)
 */
export async function editFollowup(
  sproutId: string,
  data: EditFollowupSproutDto
): Promise<FollowupSproutState> {
  logHandler.debug(`editFollowup - Editing sprout ${sproutId}`)
  try {
    const sprout = await SproutsService.getById(sproutId)
    if (!sprout) {
      throw new Error('Sprout not found')
    }

    if (sprout.sprout_type !== 'followup') {
      throw new Error('Sprout is not a followup type')
    }

    // Get current state
    const currentState = await getFollowupState(sprout)

    if (currentState.dismissed) {
      throw new Error('Cannot edit dismissed followup sprout')
    }

    // Check if anything changed
    const newTime = data.due_time ? new Date(data.due_time) : currentState.due_time
    const newMessage = data.message ?? currentState.message

    if (
      newTime.getTime() === currentState.due_time.getTime() &&
      newMessage === currentState.message
    ) {
      // No changes, return current state
      return currentState
    }

    // Create edit transaction
    const editData: EditTransactionData = {
      old_time: currentState.due_time.toISOString(),
      new_time: newTime.toISOString(),
      old_message: currentState.message,
      new_message: newMessage,
    }

    await db<SproutFollowupTransactionRow>('sprout_followup_transactions').insert({
      id: uuidv4(),
      sprout_id: sproutId,
      transaction_type: 'edit',
      transaction_data: db.raw('?::jsonb', [JSON.stringify(editData)]),
      created_at: new Date(),
    })

    // Return updated state
    return await getFollowupState(sprout)
  } catch (error) {
    logHandler.error(`editFollowup - Error editing sprout ${sproutId}:`, error)
    throw error
  }
}

/**
 * Snooze a followup sprout (adds snooze transaction)
 */
export async function snoozeFollowup(
  sproutId: string,
  data: SnoozeFollowupSproutDto,
  method: 'manual' | 'automatic' = 'manual'
): Promise<FollowupSproutState> {
  logHandler.debug(`snoozeFollowup - Snoozing sprout ${sproutId} for ${data.duration_minutes} minutes`)
  try {
    const sprout = await SproutsService.getById(sproutId)
    if (!sprout) {
      throw new Error('Sprout not found')
    }

    if (sprout.sprout_type !== 'followup') {
      throw new Error('Sprout is not a followup type')
    }

    // Get current state
    const currentState = await getFollowupState(sprout)

    if (currentState.dismissed) {
      throw new Error('Cannot snooze dismissed followup sprout')
    }

    // Create snooze transaction
    const snoozeData: SnoozeTransactionData = {
      snoozed_at: new Date().toISOString(),
      duration_minutes: data.duration_minutes,
      method,
    }

    await db<SproutFollowupTransactionRow>('sprout_followup_transactions').insert({
      id: uuidv4(),
      sprout_id: sproutId,
      transaction_type: 'snooze',
      transaction_data: db.raw('?::jsonb', [JSON.stringify(snoozeData)]),
      created_at: new Date(),
    })

    // Return updated state
    return await getFollowupState(sprout)
  } catch (error) {
    logHandler.error(`snoozeFollowup - Error snoozing sprout ${sproutId}:`, error)
    throw error
  }
}

/**
 * Dismiss a followup sprout (adds dismissal transaction)
 */
export async function dismissFollowup(
  sproutId: string,
  data: DismissFollowupSproutDto
): Promise<FollowupSproutState> {
  logHandler.debug(`dismissFollowup - Dismissing sprout ${sproutId}`)
  try {
    const sprout = await SproutsService.getById(sproutId)
    if (!sprout) {
      throw new Error('Sprout not found')
    }

    if (sprout.sprout_type !== 'followup') {
      throw new Error('Sprout is not a followup type')
    }

    // Get current state
    const currentState = await getFollowupState(sprout)

    if (currentState.dismissed) {
      // Already dismissed, return current state
      return currentState
    }

    // Create dismissal transaction
    const dismissalData: DismissalTransactionData = {
      dismissed_at: new Date().toISOString(),
      type: data.type,
    }

    await db<SproutFollowupTransactionRow>('sprout_followup_transactions').insert({
      id: uuidv4(),
      sprout_id: sproutId,
      transaction_type: 'dismissal',
      transaction_data: db.raw('?::jsonb', [JSON.stringify(dismissalData)]),
      created_at: new Date(),
    })

    // Return updated state
    return await getFollowupState(sprout)
  } catch (error) {
    logHandler.error(`dismissFollowup - Error dismissing sprout ${sproutId}:`, error)
    throw error
  }
}

/**
 * Create a followup sprout with creation transaction
 */
export async function createFollowupSprout(
  seedId: string,
  dueTime: string,
  message: string,
  trigger: 'manual' | 'automatic' = 'manual',
  automationId: string | null = null
): Promise<{ sprout: Sprout; state: FollowupSproutState }> {
  logHandler.debug(`createFollowupSprout - Creating followup sprout for seed ${seedId}`)
  try {
    const now = new Date()

    // Create sprout with initial data
    const sproutData: FollowupSproutData = {
      trigger,
      initial_time: dueTime,
      initial_message: message,
    }

    const sprout = await SproutsService.create({
      seed_id: seedId,
      sprout_type: 'followup',
      sprout_data: sproutData,
      automation_id: automationId,
    })

    // Create creation transaction
    const creationData: CreationTransactionData = {
      trigger,
      initial_time: dueTime,
      initial_message: message,
    }

    await db<SproutFollowupTransactionRow>('sprout_followup_transactions').insert({
      id: uuidv4(),
      sprout_id: sprout.id,
      transaction_type: 'creation',
      transaction_data: db.raw('?::jsonb', [JSON.stringify(creationData)]),
      created_at: now,
    })

    // Get computed state
    const state = await getFollowupState(sprout)

    logHandler.info(`createFollowupSprout - Created followup sprout ${sprout.id} for seed ${seedId}`)
    return { sprout, state }
  } catch (error) {
    logHandler.error(`createFollowupSprout - Error creating followup sprout for seed ${seedId}:`, error)
    throw error
  }
}

