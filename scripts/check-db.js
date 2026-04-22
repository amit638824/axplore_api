const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function checkDatabase() {
  try {
    // Check if database exists and get all tables
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    
    console.log('Existing tables in database:');
    if (result.rows.length === 0) {
      console.log('No tables found. Database is empty.');
    } else {
      result.rows.forEach(row => {
        console.log(`- ${row.table_name}`);
      });
    }
    
    // Get table schemas
    if (result.rows.length > 0) {
      console.log('\nTable schemas:');
      for (const row of result.rows) {
        const tableName = row.table_name;
        const columns = await pool.query(`
          SELECT 
            column_name,
            data_type,
            is_nullable,
            column_default
          FROM information_schema.columns
          WHERE table_schema = 'public' 
          AND table_name = $1
          ORDER BY ordinal_position;
        `, [tableName]);
        
        console.log(`\n${tableName}:`);
        columns.rows.forEach(col => {
          console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : '(NULL)'} ${col.column_default ? `DEFAULT: ${col.column_default}` : ''}`);
        });
      }
    }
    
    await pool.end();
  } catch (error) {
    console.error('Error checking database:', error.message);
    await pool.end();
    process.exit(1);
  }
}

checkDatabase();
