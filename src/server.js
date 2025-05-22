const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const uploadRoutes = require('./upload');
const path = require('path');
const fs = require('fs');
const db = require('./db'); // now a promise pool
const multer = require('multer');
const storage = multer.memoryStorage(); // Store file in memory (useful for parsing Excel in memory)
const upload = multer({ storage });
const cron = require('node-cron');

const app = express();
const port = process.env.PORT || 4000;




// CORS
// app.use(cors({
//   origin: 'http://localhost:3000',
//   methods: ['GET', 'POST', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization']
// }));

app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
};

app.use(cors(corsOptions));

// app.options('*', cors());




app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/api', uploadRoutes);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure 'saved' folder exists
const savedFolder = path.join(__dirname, 'saved');
if (!fs.existsSync(savedFolder)) fs.mkdirSync(savedFolder);

const logFilePath = path.join(__dirname, 'open-tracking.log');
if (!fs.existsSync(logFilePath)) {
  fs.writeFileSync(logFilePath, '', 'utf8');
}

const transporter = nodemailer.createTransport({
  host: "mailer.techresearchcenter.com",
  port: 587,
  secure: false,
  auth: {
    user: "emailuser",
    pass: "Organics5!"
  },
  tls: { rejectUnauthorized: false }
});

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

// Email open tracking route
app.get('/track/open', (req, res) => {
  const { email = 'unknown', subject = 'unknown', sent: sentTime = 'unknown', id = 'none' } = req.query;

  const openTime = new Date().toISOString();

  // Get the real IP address
  const ip =
    req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    req.ip;

  const logEntry = {
    id,
    email,
    subject,
    sentTime,
    openTime,
    ip
  };

  // Append the log to a file
  fs.appendFile(logFilePath, JSON.stringify(logEntry) + '\n', err => {
    if (err) console.error('Failed to write log:', err);
  });

  // Return a 1x1 transparent PNG
  const imgBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAr8B9WM9vKcAAAAASUVORK5CYII=',
    'base64'
  );

  res.writeHead(200, {
    'Content-Type': 'image/png',
    'Content-Length': imgBuffer.length,
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  });
  res.end(imgBuffer);
});

// Fetch open logs
app.get('/api/opens', (req, res) => {
  fs.readFile(logFilePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading logs:', err);
      return res.status(500).json({ error: 'Failed to read log file' });
    }

    const logs = data
      .trim()
      .split('\n')
      .map(line => {
        try {
          return JSON.parse(line);
        } catch (e) {
          console.warn('Skipping malformed log line:', line);
          return null;
        }
      })
      .filter(Boolean);

    res.json(logs.reverse()); // latest first
  });
});

// Reuse the same generatePersonalizedHtml function
function generatePersonalizedHtml(html, email, subject) {
  const sentTime = new Date().toISOString();
  const uniqueId = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const footer = `
    <p style="font-size: 12px; color: #888; margin-top: 40px;">
      Sent to ${email} on ${sentTime} • Ref: ${uniqueId}
    </p>
  `;

  const htmlWithReplacements = html
    .replace(/{{email}}/g, email)
    .replace(/{{subject}}/g, subject)
    .replace(/{{sentTime}}/g, sentTime)
    .replace(/{{someId}}/g, uniqueId);

  return htmlWithReplacements.includes('</body>')
    ? htmlWithReplacements.replace('</body>', `${footer}</body>`)
    : htmlWithReplacements + footer;
}

// Schedule task every minute
cron.schedule('* * * * *', async () => {
  console.log('⏰ Checking for scheduled campaigns...');

  const [campaigns] = await db.query(`
    SELECT * FROM campaigns
    WHERE status = 'scheduled' AND sending_time <= NOW()
  `);

  for (const campaign of campaigns) {
    console.log(`📋 Found scheduled campaign: "${campaign.name}" scheduled at ${campaign.sending_time}`);

    try {
      // Fetch contact list IDs
      const [listLinks] = await db.query(
        'SELECT contact_list_id FROM campaign_contact_lists WHERE campaign_id = ?',
        [campaign.id]
      );
      const listIds = listLinks.map(row => row.contact_list_id);
      if (listIds.length === 0) {
        console.warn(`⚠️ No contact lists linked to campaign "${campaign.name}"`);
        continue;
      }

      // Fetch contact emails
      const [contactRows] = await db.query(
        `
        SELECT DISTINCT c.email
        FROM contacts c
        JOIN contact_list_contacts clc ON clc.contact_id = c.id
        WHERE clc.contact_list_id IN (?)
        `,
        [listIds]
      );

      const emails = contactRows.map(row => row.email);
      if (emails.length === 0) {
        console.warn(`⚠️ No contacts found for campaign "${campaign.name}"`);
        continue;
      }

      // Send emails
      const results = await Promise.all(
        emails.map(async (email) => {
          const personalizedHtml = generatePersonalizedHtml(
            campaign.html_content,
            email,
            campaign.subject
          );

          try {
            const info = await transporter.sendMail({
              from: `"${campaign.sender_name}" <mail@techresearchcenter.com>`,
              to: email,
              subject: campaign.subject,
              html: personalizedHtml,
            });
            console.log(`✅ Sent to ${email}: ${info.messageId}`);
            return { email, status: 'fulfilled' };
          } catch (err) {
            console.error(`❌ Failed for ${email}: ${err.message}`);
            return { email, status: 'rejected', error: err.message };
          }
        })
      );

      // Update campaign status
      await db.query(`UPDATE campaigns SET status = 'sent' WHERE id = ?`, [campaign.id]);
      console.log(`📤 Campaign "${campaign.name}" sent. Success: ${results.filter(r => r.status === 'fulfilled').length}, Failed: ${results.filter(r => r.status === 'rejected').length}`);
    } catch (err) {
      console.error(`🔥 Error processing campaign "${campaign.name}" (${campaign.id}):`, err.message);
    }
  }
});



// Send emails
app.post('/api/campaigns/:id/send', async (req, res) => {
  const { id } = req.params;

  try {
    // 1. Fetch campaign info
    const [campaignRows] = await db.query(
      'SELECT * FROM campaigns WHERE id = ?',
      [id]
    );

    if (campaignRows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const campaign = campaignRows[0];

    // 2. Fetch related contact list IDs
    const [listLinks] = await db.query(
      'SELECT contact_list_id FROM campaign_contact_lists WHERE campaign_id = ?',
      [id]
    );
    const listIds = listLinks.map((row) => row.contact_list_id);

    if (listIds.length === 0) {
      return res.status(400).json({ error: 'No contact lists linked to this campaign' });
    }

    // 3. Fetch contacts from all those lists
    const [contactRows] = await db.query(
      `
      SELECT DISTINCT c.email
      FROM contacts c
      JOIN contact_list_contacts clc ON clc.contact_id = c.id
      WHERE clc.contact_list_id IN (?)
      `,
      [listIds]
    );

    const emails = contactRows.map((row) => row.email);

    if (emails.length === 0) {
      return res.status(400).json({ error: 'No contacts found for this campaign' });
    }

    // ✅ 4. Generate personalized HTML function
    const generatePersonalizedHtml = (html, email, subject) => {
      const sentTime = new Date().toISOString();
      const uniqueId = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;

      return html
        .replace(/{{email}}/g, email)
        .replace(/{{subject}}/g, subject)
        .replace(/{{sentTime}}/g, sentTime)
        .replace(/{{someId}}/g, uniqueId);
    };

    // 5. Send emails
    const results = await Promise.all(
      emails.map(async (email) => {
        const personalizedMessage = generatePersonalizedHtml(
          campaign.html_content,
          email,
          campaign.subject
        );

        try {
          const info = await transporter.sendMail({
            from: `"${campaign.sender_name}" <mail@techresearchcenter.com>`,
            to: email,
            subject: campaign.subject,
            html: personalizedMessage,
          });
          console.log(`Email sent to ${email}: ${info.messageId}`);
          return { email, status: 'fulfilled' };
        } catch (error) {
          console.error(`Failed to send to ${email}:`, error.message);
          return { email, status: 'rejected', error: error.message };
        }
      })
    );

    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const failureCount = results.filter(r => r.status === 'rejected').length;

    res.json({
      success: true,
      sent: successCount,
      failed: failureCount,
      details: results
    });

  } catch (err) {
    console.error('Error sending campaign:', err);
    res.status(500).json({ error: 'Failed to send campaign' });
  }
});




// Serve templates folder statically
app.use('/templates', express.static(path.join(__dirname, 'Pages/Templates')));

// API to list template files
app.get('/api/templates', (req, res) => {
  const templatesDir = path.join(__dirname, 'Pages/Templates');
  fs.readdir(templatesDir, (err, files) => {
    if (err) return res.status(500).json({ error: 'Cannot read templates folder' });
    const htmlFiles = files.filter(f => f.endsWith('.html'));
    res.json(htmlFiles);
  });
});

// API to fetch the content of a template
app.get('/api/templates/:filename', (req, res) => {
  const filename = req.params.filename.replace(/[^a-z0-9_\-\.]/gi, '_');
  const filePath = path.join(__dirname, 'Pages/Templates', filename);
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) return res.status(404).json({ error: 'Template not found' });
    res.send(data);
  });
});

app.get('/api/bounces', async (req, res) => {
  const lines = fs.readFileSync('/var/log/mail.log', 'utf-8').split('\n');
  const bounces = lines.filter(line => line.includes('bounce') || line.includes('status=bounced'))
    .map(line => ({
      logLine: line,
      time: line.substring(0, 15), // basic parsing
      reason: line.match(/status=bounced \((.*?)\)/)?.[1] || 'Unknown'
    }));
  res.json(bounces);
});


// GET /api/contact-lists
app.get('/api/contact-lists', async (req, res) => {
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
app.post('/api/contact-lists', async (req, res) => {
  const { name, emails } = req.body;
  console.log(name,emails);
  

  if (!name || !emails || !Array.isArray(emails) || emails.length === 0) {
    return res.status(400).json({ error: 'List name and non-empty emails array required' });
  }

  try {
    // Start transaction (optional, but recommended)
    await db.query('START TRANSACTION');

    // Insert into contact_lists table
    const [result] = await db.query(
      'INSERT INTO contact_lists (name) VALUES (?)',
      [name.trim()]
    );
    const listId = result.insertId;

    // Insert contacts one by one or in bulk
    // Here bulk insert contacts (email only for now)
    const contactsData = emails.map(email => [email.trim()]);
    const [insertContactsResult] = await db.query(
      'INSERT INTO contacts (email) VALUES ?',
      [contactsData]
    );

    // Get inserted contact IDs, MySQL returns insertId for first, and affectedRows count
    const firstContactId = insertContactsResult.insertId;
    const contactCount = insertContactsResult.affectedRows;

    // Build list-contact mapping data
    const mappings = [];
    for (let i = 0; i < contactCount; i++) {
      mappings.push([listId, firstContactId + i]);
    }

    // Insert into mapping table
    await db.query(
      'INSERT INTO contact_list_contacts (contact_list_id, contact_id) VALUES ?',
      [mappings]
    );

    await db.query('COMMIT');

    res.json({ message: 'Contact list saved successfully', listId });
  } catch (err) {
    await db.query('ROLLBACK');
    console.error('Error saving contact list:', err);
    res.status(500).json({ error: 'Failed to save contact list' });
  }
});

// POST /api/contact-lists/:listId/contacts
app.post('/api/contact-lists/:listId/contacts', async (req, res) => {
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

// POST /api/contact-lists/upload
app.post('/api/contact-lists/upload', upload.single('file'), async (req, res) => {
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

// Express route - /api/campaigns
app.get('/api/campaigns', async (req, res) => {
  const sql = `
    SELECT 
      c.id AS campaign_id,
      c.name AS campaign_name,
      c.subject,
      c.sender_name,
      c.sending_time,
      c.opens,
      c.delivered,
      c.bounces,
      c.created_at,
      cl.id AS list_id,
      cl.name AS list_name
    FROM campaigns c
    LEFT JOIN campaign_contact_lists ccl ON c.id = ccl.campaign_id
    LEFT JOIN contact_lists cl ON ccl.contact_list_id = cl.id
    ORDER BY c.id DESC;
  `;

  try {
    const [rows] = await db.query(sql);

    const campaigns = [];
    const campaignMap = {};

    for (const row of rows) {
      if (!campaignMap[row.campaign_id]) {
        campaignMap[row.campaign_id] = {
          id: row.campaign_id,
          name: row.campaign_name,
          subject: row.subject,
          sender_name: row.sender_name,
          sending_time: row.sending_time,
          opens: row.opens,
          delivered: row.delivered,
          bounces: row.bounces,
          created_at: row.created_at,
          lists: [],
        };
        campaigns.push(campaignMap[row.campaign_id]);
      }

      if (row.list_id) {
        campaignMap[row.campaign_id].lists.push({
          id: row.list_id,
          name: row.list_name,
        });
      }
    }

    res.json({ campaigns });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

app.post('/api/campaigns', async (req, res) => {
  const { name, subject, senderName, htmlContent, sendingTime, listIds, sendNow } = req.body;

  try {
    // INSERT campaign
    const [campaignResult] = await db.query(
      `INSERT INTO campaigns (name, subject, sender_name, html_content, sending_time) VALUES (?, ?, ?, ?, ?)`,
      [name, subject, senderName, htmlContent, sendingTime || null]
    );

    const campaignId = campaignResult.insertId;

    // INSERT campaign-list relations
    for (const listId of listIds) {
      await db.query(
        'INSERT INTO campaign_contact_lists (campaign_id, contact_list_id) VALUES (?, ?)',
        [campaignId, listId]
      );
    }

    // if sendNow, trigger sending logic here

    res.json({ message: sendNow ? 'Campaign sent' : 'Campaign saved', campaignId });
  } catch (err) {
    console.error('Error creating campaign:', err);
    res.status(500).json({ error: 'Failed to create campaign' });
  }
});

app.get('/api/campaigns/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const [campaignRows] = await db.query('SELECT * FROM campaigns WHERE id = ?', [id]);
    if (campaignRows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    const campaign = campaignRows[0];

    // Fetch related contact list IDs
    const [listLinks] = await db.query(
      'SELECT contact_list_id FROM campaign_contact_lists WHERE campaign_id = ?',
      [id]
    );
    const listIds = listLinks.map(row => row.contact_list_id);

    res.json({ campaign: { ...campaign, listIds } });
  } catch (err) {
    console.error('Error fetching campaign:', err);
    res.status(500).json({ error: 'Failed to load campaign' });
  }
});



app.put('/api/campaigns/:id', async (req, res) => {
  const { id } = req.params;
  const { name, subject, sender_name, html_content, sending_time, listIds = [] } = req.body;

  try {
    // Update campaign info
    await db.query(
      `UPDATE campaigns SET name = ?, subject = ?, sender_name = ?, html_content = ?, sending_time = ? WHERE id = ?`,
      [name, subject, sender_name, html_content, sending_time, id]
    );

    // Delete old list links
    await db.query('DELETE FROM campaign_contact_lists WHERE campaign_id = ?', [id]);

    // Insert new list links
    for (const listId of listIds) {
      await db.query('INSERT INTO campaign_contact_lists (campaign_id, contact_list_id) VALUES (?, ?)', [id, listId]);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error updating campaign:', err);
    res.status(500).json({ error: 'Failed to update campaign' });
  }
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

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
