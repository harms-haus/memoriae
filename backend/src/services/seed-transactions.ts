// Seed transactions service for transaction management
import { v4 as uuidv4 } from 'uuid'
import db from '../db/connection'
import type {
  SeedTransaction,
  SeedTransactionRow,
  CreateSeedTransactionDto,
  SeedTransactionData,
} from '../types/seed-transactions'

export class SeedTransactionsService {
  /**
   * Create a new transaction
   */
  static async create(data: CreateSeedTransactionDto & { seed_id: string }): Promise<SeedTransaction> {
    const [created] = await db('seed_transactions')
      .insert({
        id: uuidv4(),
        seed_id: data.seed_id,
        transaction_type: data.transaction_type,
        transaction_data: db.raw('?::jsonb', [JSON.stringify(data.transaction_data)]),
        created_at: new Date(),
        automation_id: data.automation_id || null,
      })
      .returning('*')

    return {
      ...created,
      transaction_data: created.transaction_data as SeedTransactionData,
      created_at: new Date(created.created_at),
    }
  }

  /**
   * Create multiple transactions in a transaction
   */
  static async createMany(transactions: (CreateSeedTransactionDto & { seed_id: string })[]): Promise<SeedTransaction[]> {
    const created: SeedTransaction[] = []
    
    for (const data of transactions) {
      const [result] = await db('seed_transactions')
        .insert({
          id: uuidv4(),
          seed_id: data.seed_id,
          transaction_type: data.transaction_type,
          transaction_data: db.raw('?::jsonb', [JSON.stringify(data.transaction_data)]),
          created_at: new Date(),
          automation_id: data.automation_id || null,
        })
        .returning('*')

      created.push({
        ...result,
        transaction_data: result.transaction_data as SeedTransactionData,
        created_at: new Date(result.created_at),
      })
    }

    return created
  }

  /**
   * Get transaction by ID
   */
  static async getById(id: string): Promise<SeedTransaction | null> {
    const transaction = await db<SeedTransactionRow>('seed_transactions')
      .where({ id })
      .first()

    if (!transaction) {
      return null
    }

    return {
      ...transaction,
      transaction_data: transaction.transaction_data as SeedTransactionData,
      created_at: new Date(transaction.created_at),
    }
  }

  /**
   * Get all transactions for a seed (timeline), ordered by creation time
   */
  static async getBySeedId(seedId: string): Promise<SeedTransaction[]> {
    const transactions = await db<SeedTransactionRow>('seed_transactions')
      .where({ seed_id: seedId })
      .orderBy('created_at', 'asc')

    return transactions.map(t => ({
      ...t,
      transaction_data: t.transaction_data as SeedTransactionData,
      created_at: new Date(t.created_at),
    }))
  }

  /**
   * Verify that a seed belongs to a user (for authorization)
   */
  static async verifySeedOwnership(seedId: string, userId: string): Promise<boolean> {
    const seed = await db('seeds')
      .where({ id: seedId, user_id: userId })
      .first()

    return !!seed
  }

  /**
   * Get transactions by automation ID
   */
  static async getByAutomationId(automationId: string): Promise<SeedTransaction[]> {
    const transactions = await db<SeedTransactionRow>('seed_transactions')
      .where({ automation_id: automationId })
      .orderBy('created_at', 'asc')

    return transactions.map(t => ({
      ...t,
      transaction_data: t.transaction_data as SeedTransactionData,
      created_at: new Date(t.created_at),
    }))
  }
}




