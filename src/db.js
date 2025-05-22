// db.js
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: '75.119.141.210',
  user: 'nodeuser',
  password: 'Organics5!',
  database: 'mailer',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Optional: Test connection and log connection ID
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('Connected as ID ' + connection.threadId);
    connection.release();
  } catch (err) {
    console.error('DB connection failed:', err);
  }
}

testConnection();

module.exports = pool;
