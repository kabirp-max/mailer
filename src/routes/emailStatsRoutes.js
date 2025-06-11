const express = require('express');
const app = express.Router();
const multer = require('multer');
const storage = multer.memoryStorage(); // Store file in memory (useful for parsing Excel in memory)
const upload = multer({ storage });
const db = require('../db'); // now a promise pool
const nodemailer = require('nodemailer');
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

app.use(express.json());

// If you use URL-encoded forms too, add this:
app.use(express.urlencoded({ extended: true }));

app.get('/email-opens', async (req, res) => {
  const sql = `
    SELECT 
      eo.campaign_id,
      c.subject,
      eo.email,
      eo.opened_at
    FROM email_opens eo
    LEFT JOIN campaigns c ON eo.campaign_id = c.id
    ORDER BY eo.campaign_id, eo.opened_at;
  `;

  try {
    const [rows] = await db.query(sql);

    const campaigns = [];
    let currentCampaignId = null;
    let currentCampaign = null;

   for (const row of rows) {
  if (row.campaign_id == null) continue; // skip bad rows

  if (row.campaign_id !== currentCampaignId) {
    if (currentCampaign) campaigns.push(currentCampaign);
    currentCampaignId = row.campaign_id;
    currentCampaign = {
      campaign_id: row.campaign_id,
      subject: row.subject,
      opens: [],
    };
  }

  currentCampaign.opens.push({
    email: row.email,
    opened_at: row.opened_at,
  });
}


    if (currentCampaign) campaigns.push(currentCampaign);

    res.json({ campaigns });
  } catch (error) {
    console.error('Error fetching email opens:', error);
    res.status(500).json({ error: 'Failed to fetch email opens' });
  }
});

app.get('/email-unsubscribes', async (req, res) => {
  const sql = `
    SELECT 
      eu.campaign_id,
      c.subject,
      eu.email,
      eu.unsubscribed_at
    FROM email_unsubscribes eu
    LEFT JOIN campaigns c ON eu.campaign_id = c.id
    ORDER BY eu.campaign_id, eu.unsubscribed_at;
  `;

  try {
    const [rows] = await db.query(sql);

    const campaigns = [];
    let currentCampaignId = null;
    let currentCampaign = null;

    for (const row of rows) {
      if (row.campaign_id !== currentCampaignId) {
        if (currentCampaign) campaigns.push(currentCampaign);
        currentCampaignId = row.campaign_id;
        currentCampaign = {
          campaign_id: row.campaign_id,
          subject: row.subject,
          unsubscribes: [],
        };
      }

      currentCampaign.unsubscribes.push({
        email: row.email,
        unsubscribed_at: row.unsubscribed_at,
      });
    }

    if (currentCampaign) campaigns.push(currentCampaign);

    res.json({ campaigns });
  } catch (error) {
    console.error('Error fetching email unsubscribes:', error);
    res.status(500).json({ error: 'Failed to fetch email unsubscribes' });
  }
});

app.get('/email-clicks', async (req, res) => {
  const sql = `
    SELECT 
      ec.campaign_id,
      c.subject,
      ec.email,
      ec.url,
      ec.clicked_at
    FROM email_clicks ec
    LEFT JOIN campaigns c ON ec.campaign_id = c.id
    ORDER BY ec.campaign_id, ec.clicked_at;
  `;

  try {
    const [rows] = await db.query(sql);

    const campaigns = [];
    let currentCampaignId = null;
    let currentCampaign = null;

    for (const row of rows) {
      if (row.campaign_id !== currentCampaignId) {
        if (currentCampaign) campaigns.push(currentCampaign);
        currentCampaignId = row.campaign_id;
        currentCampaign = {
          campaign_id: row.campaign_id,
          subject: row.subject,
          clicks: [],
        };
      }

      currentCampaign.clicks.push({
        email: row.email,
        url: row.url,
        clicked_at: row.clicked_at,
      });
    }

    if (currentCampaign) campaigns.push(currentCampaign);

    res.json({ campaigns });
  } catch (error) {
    console.error('Error fetching email clicks:', error);
    res.status(500).json({ error: 'Failed to fetch email clicks' });
  }
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

module.exports = app;