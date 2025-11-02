// Quick database connection test
require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'memoriae',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  connectTimeoutMillis: 5000,
});

console.log('Testing database connection...');
console.log(`Host: ${client.host}`);
console.log(`Port: ${client.port}`);
console.log(`Database: ${client.database}`);
console.log(`User: ${client.user}`);
console.log(`Password: ${client.password ? '***' : 'MISSING'}`);

client.connect()
  .then(() => {
    console.log('✓ Connection successful!');
    return client.query('SELECT version()');
  })
  .then((result) => {
    console.log('✓ Database version:', result.rows[0].version.split(' ')[0] + ' ' + result.rows[0].version.split(' ')[1]);
    client.end();
    process.exit(0);
  })
  .catch((err) => {
    console.error('✗ Connection failed:', err.message);
    console.error('Error code:', err.code);
    if (err.code === 'ENOTFOUND') {
      console.error('  → DNS lookup failed. Check DB_HOST is correct.');
    } else if (err.code === 'ECONNREFUSED') {
      console.error('  → Connection refused. Check:');
      console.error('     - Database server is running');
      console.error('     - Port is correct');
      console.error('     - Firewall/security group allows connections');
    } else if (err.code === 'ETIMEDOUT') {
      console.error('  → Connection timeout. Check network connectivity.');
    } else if (err.code === '28P01') {
      console.error('  → Authentication failed. Check DB_USER and DB_PASSWORD.');
    }
    client.end();
    process.exit(1);
  });
