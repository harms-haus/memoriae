import type { Knex } from 'knex'
import dotenv from 'dotenv'
import path from 'path'

// Load .env from project root (same as config.ts)
// When compiled, this file is in dist/db/, so we go up 3 levels to get to project root
dotenv.config({ path: path.resolve(__dirname, '../../../.env') })

// Helper to determine if connection is to AWS RDS
function isRDSConnection(): boolean {
  return !!(
    process.env.DB_HOST?.includes('rds.amazonaws.com') ||
    process.env.DATABASE_URL?.includes('rds.amazonaws.com')
  )
}

// Helper to get connection config with SSL for RDS
function getConnectionConfig(): string | Knex.PgConnectionConfig {
  const databaseUrl = process.env.DATABASE_URL
  
  // If DATABASE_URL is provided and it's an RDS connection, we need to add SSL parameters
  if (databaseUrl && isRDSConnection()) {
    // If SSL is already in the URL, use it as-is
    if (databaseUrl.includes('sslmode=')) {
      return databaseUrl
    }
    
    // Otherwise, add SSL mode to the connection string
    // PostgreSQL connection strings support ?sslmode=require
    const separator = databaseUrl.includes('?') ? '&' : '?'
    return `${databaseUrl}${separator}sslmode=require`
  }
  
  // If DATABASE_URL is provided as string (non-RDS), use it directly
  if (databaseUrl) {
    return databaseUrl
  }
  
  // Otherwise, build connection object
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'test',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    // Enable SSL for AWS RDS connections
    ssl: isRDSConnection()
      ? { rejectUnauthorized: false } // RDS uses self-signed certificates
      : false,
  }
}

const config: { [key: string]: Knex.Config } = {
  test: {
    client: 'postgresql',
    connection: getConnectionConfig(),
    pool: {
      min: 0,
      max: 5,
      acquireTimeoutMillis: 10000,
      createTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 200,
    },
    acquireConnectionTimeout: 10000,
    migrations: {
      directory: __dirname + '/migrations',
      extension: 'ts',
      loadExtensions: ['.ts'],
      // Disable migration list validation to prevent auto-population issues in tests
      disableMigrationsListValidation: true,
    },
    seeds: {
      directory: __dirname + '/seeds',
      extension: 'ts',
    },
  },

  development: {
    client: 'postgresql',
    connection: process.env.DATABASE_URL || {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME || 'memoriae',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      // Enable SSL for AWS RDS connections
      ssl: process.env.DB_HOST?.includes('rds.amazonaws.com') || process.env.DB_HOST?.includes('rds.amazonaws.com') 
        ? { rejectUnauthorized: false } // RDS uses self-signed certificates
        : false,
    },
    pool: {
      min: 0, // Start with 0 connections (lazy initialization) - prevents pool exhaustion on failed connections
      max: 10,
      acquireTimeoutMillis: 10000, // 10 seconds to acquire connection
      createTimeoutMillis: 10000, // 10 seconds to create connection
      idleTimeoutMillis: 30000, // 30 seconds idle timeout
      reapIntervalMillis: 1000, // Check for idle connections every second
      createRetryIntervalMillis: 200, // Retry connection creation every 200ms
    },
    acquireConnectionTimeout: 10000, // 10 seconds timeout for acquiring connection
    migrations: {
      directory: __dirname + '/migrations',
      extension: 'ts',
      loadExtensions: ['.ts'],
    },
    seeds: {
      directory: __dirname + '/seeds',
      extension: 'ts',
    },
  },

  production: {
    client: 'postgresql',
    connection: process.env.DATABASE_URL || {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME || 'memoriae',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      // Enable SSL for AWS RDS connections
      ssl: process.env.DB_HOST?.includes('rds.amazonaws.com') || process.env.DB_HOST?.includes('rds.amazonaws.com')
        ? { rejectUnauthorized: false } // RDS uses self-signed certificates
        : false,
    },
    pool: {
      min: 0, // Start with 0 connections (lazy initialization) - prevents pool exhaustion on failed connections
      max: 10,
      acquireTimeoutMillis: 10000, // 10 seconds to acquire connection
      createTimeoutMillis: 10000, // 10 seconds to create connection
      idleTimeoutMillis: 30000, // 30 seconds idle timeout
      reapIntervalMillis: 1000, // Check for idle connections every second
      createRetryIntervalMillis: 200, // Retry connection creation every 200ms
    },
    acquireConnectionTimeout: 10000, // 10 seconds timeout for acquiring connection
    migrations: {
      directory: __dirname + '/migrations',
      extension: 'ts',
      loadExtensions: ['.ts'],
    },
    seeds: {
      directory: __dirname + '/seeds',
      extension: 'ts',
    },
  },
}

export default config

