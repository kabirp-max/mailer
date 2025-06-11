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


app.get('/campaigns', async (req, res) => {
  const sql = `
    SELECT 
      c.id AS campaign_id,
      c.name AS campaign_name,
      c.subject,
      c.sender_name,
      c.sending_time,
      c.opens,
      c.delivered,
      c.status,
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
          status: row.status,
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

app.post('/campaigns', async (req, res) => {
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

app.get('/campaigns/:id', async (req, res) => {
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


function toMySQLDatetime(localString) {
  const date = new Date(localString); // Treat input as local time
  const offset = date.getTimezoneOffset(); // in minutes
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 19).replace('T', ' ');
}


app.put('/campaigns/:id', async (req, res) => {
  const { id } = req.params;
  const {
    name,
    subject,
    sender_name,
    html_content,
    sending_time,
    listIds = []
  } = req.body;

  const formattedDate = sending_time ? toMySQLDatetime(sending_time) : null;
  const status = sending_time ? 'scheduled' : 'draft'; // or 'sent' if needed
  console.log(sending_time);
  

  try {
    // Update campaign info
    await db.query(
      `UPDATE campaigns
       SET name = ?, subject = ?, sender_name = ?, html_content = ?, sending_time = ?, status = ?
       WHERE id = ?`,
      [name, subject, sender_name, html_content, formattedDate, status, id]
    );

    // Delete old list links
    await db.query('DELETE FROM campaign_contact_lists WHERE campaign_id = ?', [id]);

    // Insert new list links
    for (const listId of listIds) {
      await db.query(
        'INSERT INTO campaign_contact_lists (campaign_id, contact_list_id) VALUES (?, ?)',
        [id, listId]
      );
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error updating campaign:', err);
    res.status(500).json({ error: 'Failed to update campaign' });
  }
});

app.post('/campaigns/:id/send', async (req, res) => {
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
    const generatePersonalizedHtml = (html, email, subject, campaignId) => {
  const sentTime = new Date().toISOString();
  const uniqueId = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;

  // Encode values for use in URLs
  const encodedEmail = email;
  const encodedSubject = encodeURIComponent(subject);
  const encodedSentTime = sentTime;
  const encodedCampaignId = campaignId;

  return html
    .replace(/{{email}}/g, encodedEmail)
    .replace(/{{subject}}/g, encodedSubject)
    .replace(/{{sentTime}}/g, encodedSentTime)
    .replace(/{{sentAt}}/g, encodedSentTime)
    .replace(/{{campaignId}}/g, encodedCampaignId)
    .replace(/{{someId}}/g, uniqueId);
};


    
    

    // 5. Send emails
    const results = await Promise.all(
      emails.map(async (email) => {
        const personalizedMessage = generatePersonalizedHtml(
          campaign.html_content,
          email,
          campaign.subject,
          campaign.id
        );

        // console.log(personalizedMessage);
        // return;
        

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

    // ✅ Update campaign status to 'sent'
await db.query('UPDATE campaigns SET status = ? WHERE id = ?', ['sent', id]);

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

module.exports = app;