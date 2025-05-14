const mysql = require('mysql2');

// Create a connection to the MySQL server
const connection = mysql.createConnection({
  host: 'localhost',  // Your MySQL host
  user: 'root',       // Your MySQL username
  password: 'Organics5!',  // Your MySQL password
  database: 'contacts', // Your database name (can be any existing database)
});

// Connect to the MySQL server
connection.connect((err) => {
  if (err) {
    console.error('Error connecting to the database: ' + err.stack);
    return;
  }
  console.log('Connected to MySQL server as id ' + connection.threadId);

  // Optionally, run a simple query to test the connection
  connection.query('SELECT 1 + 1 AS solution', (err, results) => {
    if (err) {
      console.error('Error executing query: ' + err.stack);
      return;
    }
    console.log('Query result: ', results[0].solution); // Should print: 2
  });

  // Close the connection
  connection.end();
});
