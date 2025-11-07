// Tag transactions service for transaction management
import { v4 as uuidv4 } from 'uuid'
import db from '../db/connection'
import type {
  TagTransaction,
  TagTransactionRow,
  CreateTagTransactionDto,
  TagTransactionData,
} from '../types/tag-transactions'

export class TagTransactionsService {
  /**
   * Create a new transaction
   */
  static async create(data: CreateTagTransactionDto & { tag_id: string }): Promise<TagTransaction> {
    const [created] = await db('tag_transactions')
      .insert({
        id: uuidv4(),
        tag_id: data.tag_id,
        transaction_type: data.transaction_type,
        transaction_data: db.raw('?::jsonb', [JSON.stringify(data.transaction_data)]),
        created_at: new Date(),
        automation_id: data.automation_id || null,
      })
      .returning('*')

    return {
      ...created,
      transaction_data: created.transaction_data as TagTransactionData,
      created_at: new Date(created.created_at),
    }
  }

  /**
   * Create multiple transactions
   */
  static async createMany(transactions: (CreateTagTransactionDto & { tag_id: string })[]): Promise<TagTransaction[]> {
    const created: TagTransaction[] = []
    
    for (const data of transactions) {
      const [result] = await db('tag_transactions')
        .insert({
          id: uuidv4(),
          tag_id: data.tag_id,
          transaction_type: data.transaction_type,
          transaction_data: db.raw('?::jsonb', [JSON.stringify(data.transaction_data)]),
          created_at: new Date(),
          automation_id: data.automation_id || null,
        })
        .returning('*')

      created.push({
        ...result,
        transaction_data: result.transaction_data as TagTransactionData,
        created_at: new Date(result.created_at),
      })
    }

    return created
  }

  /**
   * Get transaction by ID
   */
  static async getById(id: string): Promise<TagTransaction | null> {
    const transaction = await db<TagTransactionRow>('tag_transactions')
      .where({ id })
      .first()

    if (!transaction) {
      return null
    }

    return {
      ...transaction,
      transaction_data: transaction.transaction_data as TagTransactionData,
      created_at: new Date(transaction.created_at),
    }
  }

  /**
   * Get all transactions for a tag (timeline), ordered by creation time
   */
  static async getByTagId(tagId: string): Promise<TagTransaction[]> {
    const transactions = await db<TagTransactionRow>('tag_transactions')
      .where({ tag_id: tagId })
      .orderBy('created_at', 'asc')

    return transactions.map(t => ({
      ...t,
      transaction_data: t.transaction_data as TagTransactionData,
      created_at: new Date(t.created_at),
    }))
  }

  /**
   * Get transactions by automation ID
   */
  static async getByAutomationId(automationId: string): Promise<TagTransaction[]> {
    const transactions = await db<TagTransactionRow>('tag_transactions')
      .where({ automation_id: automationId })
      .orderBy('created_at', 'asc')

    return transactions.map(t => ({
      ...t,
      transaction_data: t.transaction_data as TagTransactionData,
      created_at: new Date(t.created_at),
    }))
  }
}
