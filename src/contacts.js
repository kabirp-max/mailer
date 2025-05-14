const express = require('express');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const connection = require('./db.js'); // Database connection

const router = express.Router();

// Middleware to handle file uploads
const upload = multer({ dest: 'uploads/' });

// Get all contacts
router.get('/', (req, res) => {
  connection.query('SELECT * FROM contacts', (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Error fetching contacts' });
    }
    res.json(results);
  });
});

// Add a contact
router.post('/', (req, res) => {
  const { name, email } = req.body;
  const query = 'INSERT INTO contacts (name, email) VALUES (?, ?)';
  
  connection.query(query, [name, email], (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Error adding contact' });
    }
    res.status(201).json({ message: 'Contact added', contactId: results.insertId });
  });
});

// Edit a contact
router.put('/:id', (req, res) => {
  const { name, email } = req.body;
  const query = 'UPDATE contacts SET name = ?, email = ? WHERE id = ?';
  
  connection.query(query, [name, email, req.params.id], (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Error updating contact' });
    }
    res.json({ message: 'Contact updated' });
  });
});

// Delete a contact
router.delete('/:id', (req, res) => {
  const query = 'DELETE FROM contacts WHERE id = ?';
  
  connection.query(query, [req.params.id], (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Error deleting contact' });
    }
    res.json({ message: 'Contact deleted' });
  });
});

// Upload CSV and add contacts
router.post('/upload-csv', upload.single('file'), (req, res) => {
  const filePath = path.join(__dirname, '../uploads', req.file.filename);
  
  const contacts = [];
  fs.createReadStream(filePath)
    .pipe(csv())
    .on('data', (row) => {
      contacts.push([row.name, row.email]);
    })
    .on('end', () => {
      // Insert all contacts into the database
      connection.query('INSERT INTO contacts (name, email) VALUES ?', [contacts], (err, results) => {
        if (err) {
          return res.status(500).json({ error: 'Error uploading CSV' });
        }
        res.json({ message: 'Contacts added from CSV' });
      });
    });
});

module.exports = router;
