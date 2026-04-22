/**
 * Database Configuration and Connection Management
 * Handles Prisma client initialization with proper connection pooling
 */

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

// Build DATABASE_URL from individual environment variables if not provided
const buildDatabaseUrl = () => {
  if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('${')) {
    return process.env.DATABASE_URL;
  }

  const dbUser = encodeURIComponent(process.env.DB_USER || 'axplore-user');
  const dbPassword = encodeURIComponent(process.env.DB_PASSWORD || 'AQn5qBZ5hAnlw5Ms');
  const dbHost = process.env.DB_HOST || '13.203.184.20';
  const dbPort = process.env.DB_PORT || '4266';
  const dbName = process.env.DB_NAME || 'axplore-db';

  return `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}?schema=public`;
};

// Set DATABASE_URL for Prisma Client
const databaseUrl = buildDatabaseUrl();
process.env.DATABASE_URL = databaseUrl;

// Create PostgreSQL connection pool  
const pool = new Pool({
  connectionString: databaseUrl,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Create Prisma adapter
const adapter = new PrismaPg(pool);

// Initialize Prisma Client with adapter
const prisma = new PrismaClient({ adapter });

// Handle graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
  await pool.end();
});

// Handle process termination
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  await pool.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  await pool.end();
  process.exit(0);
});

module.exports = {
  prisma,
  pool,
};
