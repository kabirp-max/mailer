const { log } = require('console');
const express = require('express');
const app = express.Router();
const fs = require('fs');
const path = require('path');
const db = require('../db'); // now a promise pool


app.use(express.json());

// If you use URL-encoded forms too, add this:
app.use(express.urlencoded({ extended: true }));

// Save HTML template
app.post('/save-html', (req, res) => {
  const { filename, html } = req.body;

  if (!filename || !html) {
    return res.status(400).json({ error: 'Missing filename or html' });
  }

  const safeFilename = filename.replace(/[^a-z0-9_\-\.]/gi, '_');
  const savePath = path.join(savedFolder, `${safeFilename}.html`);

  fs.writeFile(savePath, html, (err) => {
    if (err) {
      console.error('Error saving HTML file:', err);
      return res.status(500).json({ error: 'Failed to save file' });
    }
    return res.status(200).json({ message: 'File saved successfully', path: `/saved/${safeFilename}.html` });
  });
});

// Test endpoint to inline CSS in HTML and return it
app.post('/api/inline-html', (req, res) => {
  const { html } = req.body;
  
  if (!html) {
    return res.status(400).json({ error: 'Missing html in request body' });
  }

  
});

app.post('/render', (req, res) => {
 
});

// app.post('/api/campaigns/:id/send', async (req, res) => {
//   const { id } = req.params;
//   try {
//     // Add your sending logic here
//     console.log(`Sending campaign ${id}...`);

//     res.json({ message: 'Campaign sent' });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: 'Failed to send campaign' });
//   }
// });

// app.get('/api/templates', async (req, res) => {
//   const fs = require('fs');
//   const path = require('path');
//   const templateDir = path.join(__dirname, 'pages', 'templates');

//   try {
//     const files = fs.readdirSync(templateDir).filter(file => file.endsWith('.html'));
//     res.json({ files });
//   } catch (err) {
//     res.status(500).json({ error: 'Failed to load templates' });
//   }
// });

// // GET /api/templates/:filename
// // Gets HTML content of a selected file
// app.get('/api/templates/:filename', (req, res) => {
//   const fs = require('fs');
//   const path = require('path');
//   const templateDir = path.join(__dirname, 'pages', 'templates');
//   const filePath = path.join(templateDir, req.params.filename);

//   if (!fs.existsSync(filePath)) {
//     return res.status(404).json({ error: 'Template not found' });
//   }

//   const content = fs.readFileSync(filePath, 'utf8');
//   res.send(content);
// });


// POST /api/public-html
app.post('/public-html', async (req, res) => {
  console.log(req)
  const { html_content, name = 'Untitled Template' } = req.body;

  if (!html_content) {
    return res.status(400).json({ error: 'HTML content is required' });
  }

  try {
    const [result] = await db.query(
      'INSERT INTO email_templates (name, html_content) VALUES (?, ?)',
      [name, html_content]
    );
    return res.json({ id: result.insertId });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Database error' });
  }
});

app.get('/htmlPages/:id', async (req, res) => {
  console.log('hell');
  
  const { id } = req.params;
  const [rows] = await db.query('SELECT html_content FROM email_templates WHERE id = ?', [id]);
  if (!rows.length) return res.status(404).send('Template not found');

  res.set('Content-Type', 'text/html');
  res.send(rows[0].html_content);
});

module.exports = app;