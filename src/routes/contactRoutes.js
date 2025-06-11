const express = require('express');
const app = express.Router();
const multer = require('multer');
const storage = multer.memoryStorage(); // Store file in memory (useful for parsing Excel in memory)
const upload = multer({ storage });
const db = require('../db'); // now a promise pool
const nodemailer = require('nodemailer');
app.use(express.json());

// If you use URL-encoded forms too, add this:
app.use(express.urlencoded({ extended: true }));

// GET /contact-lists
app.get('/contact-lists', async (req, res) => {

    
    
  const sql = `
    SELECT
      cl.id AS list_id,
      cl.name AS list_name,
      cl.description,
      c.id AS contact_id,
      c.email,
      c.name AS contact_name,
      c.phone,
      c.extra_data
    FROM contact_lists cl
    LEFT JOIN contact_list_contacts clc ON cl.id = clc.contact_list_id
    LEFT JOIN contacts c ON clc.contact_id = c.id
    ORDER BY cl.id, c.name;
  `;

  try {
    const [rows] = await db.query(sql); // db is mysql2/promise connection pool

    const lists = [];
    let currentListId = null;
    let currentList = null;

    for (const row of rows) {
      if (row.list_id !== currentListId) {
        if (currentList) lists.push(currentList);
        currentListId = row.list_id;
        currentList = {
          id: row.list_id,
          name: row.list_name,
          description: row.description,
          contacts: [],
        };
      }
      if (row.contact_id) {
        let extraData = {};
        if (typeof row.extra_data === 'string') {
          try {
            extraData = JSON.parse(row.extra_data);
          } catch {
            extraData = {};
          }
        } else if (typeof row.extra_data === 'object' && row.extra_data !== null) {
          extraData = row.extra_data;
        }

        currentList.contacts.push({
          id: row.contact_id,
          email: row.email,
          name: row.contact_name,
          phone: row.phone,
          extra_data: extraData,
        });
      }
    }
    if (currentList) lists.push(currentList);

    res.json({ lists });
  } catch (error) {
    console.error('Error fetching contact lists:', error);
    res.status(500).json({ error: 'Failed to fetch contact lists' });
  }
});

// Express route to save a contact list with emails
app.post('/contact-lists', async (req, res) => {
  const { name, emails } = req.body;

  if (!name || !emails || !Array.isArray(emails) || emails.length === 0) {
    return res.status(400).json({ error: 'List name and non-empty emails array required' });
  }

  try {
    console.log('Starting transaction...');
    await db.query('START TRANSACTION');

    console.log('Inserting list...');
    const [listResult] = await db.query(
      'INSERT INTO contact_lists (name) VALUES (?)',
      [name.trim()]
    );
    const listId = listResult.insertId;
    console.log('List inserted with ID:', listId);

    const contactIds = [];

    for (const email of emails) {
      const trimmedEmail = email.trim();
      console.log('Checking email:', trimmedEmail);

      const [existingContacts] = await db.query(
        'SELECT id FROM contacts WHERE email = ?',
        [trimmedEmail]
      );

      let contactId;

      if (existingContacts.length > 0) {
        contactId = existingContacts[0].id;
        console.log('Existing contact found:', contactId);
      } else {
        const [insertResult] = await db.query(
          'INSERT INTO contacts (email) VALUES (?)',
          [trimmedEmail]
        );
        contactId = insertResult.insertId;
        console.log('New contact inserted:', contactId);
      }

      contactIds.push(contactId);
    }

    const mappings = contactIds.map(contactId => [listId, contactId]);
    console.log('Inserting mappings:', mappings);

    await db.query(
      'INSERT IGNORE INTO contact_list_contacts (contact_list_id, contact_id) VALUES ?',
      [mappings]
    );

    await db.query('COMMIT');
    console.log('Transaction committed.');

    res.json({ message: 'Contact list saved successfully', listId });
  } catch (err) {
    console.error('Error saving contact list:', err);
    await db.query('ROLLBACK');
    res.status(500).json({ error: 'Failed to save contact list' });
  }
});


// POST /contact-lists/:listId/contacts
app.post('/contact-lists/:listId/contacts', async (req, res) => {
  const { listId } = req.params;
  const { email, name, phone, extra_data } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    // Check if contact with this email already exists
    const [existing] = await db.query('SELECT id FROM contacts WHERE email = ?', [email]);

    let contactId;
    if (existing.length > 0) {
      contactId = existing[0].id;
      // Optionally, update contact info here if needed
    } else {
      // Insert new contact
      const [result] = await db.query(
        'INSERT INTO contacts (email, name, phone, extra_data) VALUES (?, ?, ?, ?)',
        [email, name || null, phone || null, JSON.stringify(extra_data || {})]
      );
      contactId = result.insertId;
    }

    // Link contact to the list, ignoring duplicates
    await db.query(
      'INSERT IGNORE INTO contact_list_contacts (contact_list_id, contact_id) VALUES (?, ?)',
      [listId, contactId]
    );

    res.status(201).json({ message: 'Contact added to list', contactId });
  } catch (error) {
    console.error('Error adding contact to list:', error);
    res.status(500).json({ error: 'Failed to add contact to list' });
  }
});

// POST /contact-lists/upload
app.post('/contact-lists/upload', upload.single('file'), async (req, res) => {
  const { name, description, columnMapping } = req.body;
  const mapping = JSON.parse(columnMapping || '{}');

  if (!req.file || !name || !mapping.email) {
    return res.status(400).json({ error: 'Missing required fields (file, name, email column)' });
  }

  try {
    // Parse Excel file
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet);

    // Insert list
    const [listResult] = await db.query(
      'INSERT INTO contact_lists (name, description) VALUES (?, ?)',
      [name, description || null]
    );
    const listId = listResult.insertId;

    // Process contacts
    for (const row of rows) {
      const email = row[mapping.email]?.trim();
      if (!email) continue;

      const name = mapping.name ? row[mapping.name]?.trim() : null;
      const phone = mapping.phone ? row[mapping.phone]?.trim() : null;

      const extraData = {};
      Object.keys(mapping).forEach(key => {
        if (!['email', 'name', 'phone'].includes(key)) {
          extraData[key] = row[mapping[key]];
        }
      });

      // Insert contact or get existing
      const [existing] = await db.query('SELECT id FROM contacts WHERE email = ?', [email]);
      let contactId;
      if (existing.length > 0) {
        contactId = existing[0].id;
      } else {
        const [inserted] = await db.query(
          'INSERT INTO contacts (email, name, phone, extra_data) VALUES (?, ?, ?, ?)',
          [email, name, phone, JSON.stringify(extraData)]
        );
        contactId = inserted.insertId;
      }

      // Link to list
      await db.query(
        'INSERT IGNORE INTO contact_list_contacts (contact_list_id, contact_id) VALUES (?, ?)',
        [listId, contactId]
      );
    }

    res.json({ message: 'List and contacts created successfully', listId });
  } catch (error) {
    console.error('Error processing Excel:', error);
    res.status(500).json({ error: 'Failed to upload list from Excel' });
  }
});

module.exports = app;