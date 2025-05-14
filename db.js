const mysql = require('mysql2');

// Your cPanel MySQL credentials
const connection = mysql.createConnection({
  host: '68.178.227.159',
  user: 'kabir',
  password: 'PPahT$=S?GXt',
  database: 'kabir-lp-data',
});

// Connect and run test query
connection.connect((err) => {
  if (err) {
    console.error('❌ Connection failed:', err.message);
    return;
  }
  console.log('✅ Connected to MySQL');

  // Run a sample query
  connection.query('SELECT * FROM leads ORDER BY timestamp DESC', (err, results) => {
    if (err) {
      console.error('❌ Query failed:', err.message);
    } else {
      console.log('✅ Query success. First row:', results[0] || 'No data');
    }

    // Close the connection
    connection.end();
  });
});
