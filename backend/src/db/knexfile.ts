import type { Knex } from 'knex'
import dotenv from 'dotenv'

dotenv.config()

const config: { [key: string]: Knex.Config } = {
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
      min: 2,
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
    },
    seeds: {
      directory: __dirname + '/seeds',
      extension: 'ts',
    },
  },
}

export default config

