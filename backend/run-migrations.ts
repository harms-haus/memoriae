import dotenv from 'dotenv'
import knex from 'knex'
import config from './src/db/knexfile'

dotenv.config()

async function runMigrations() {
  const environment = process.env.NODE_ENV || 'development'
  const dbConfig = config[environment]
  
  if (!dbConfig) {
    throw new Error(`Database configuration not found for environment: ${environment}`)
  }

  const db = knex(dbConfig)
  
  try {
    console.log('Running migrations...')
    await db.migrate.latest()
    console.log('✅ Migrations completed successfully')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    await db.destroy()
  }
}

runMigrations()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
