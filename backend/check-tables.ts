import dotenv from 'dotenv'
import knex from 'knex'
import config from './src/db/knexfile'

dotenv.config()

async function checkTables() {
  const environment = process.env.NODE_ENV || 'development'
  const dbConfig = config[environment]
  const db = knex(dbConfig)
  
  try {
    const tables = await db.raw(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `)
    console.log('Tables in database:')
    tables.rows.forEach((row: any) => console.log(`  - ${row.table_name}`))
    
    const migrationStatus = await db.migrate.list()
    console.log('\nMigrations:')
    migrationStatus.forEach((m: any) => console.log(`  ${m.name}: ${m.batch}`))
  } catch (error: any) {
    console.error('Error:', error.message)
  } finally {
    await db.destroy()
  }
}

checkTables()
