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
const { log } = require('console');

const app = express();
const port = process.env.PORT || 4000;

const templateRoutes = require('./routes/templateRoutes');
const contactRoutes = require('./routes/contactRoutes');
const campaignRoutes = require('./routes/campaignRoutes');
const emailStatsRoutes = require('./routes/emailStatsRoutes');
const htmlRoutes = require('./routes/htmlRoutes');

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

app.use('/api', templateRoutes);
app.use('/api', contactRoutes);
app.use('/api', campaignRoutes);
app.use('/api', emailStatsRoutes);
app.use('/api', htmlRoutes);

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

// Reuse the same generatePersonalizedHtml function
function generatePersonalizedHtml(html, email, subject, campaignId) {
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
    .replace(/{{campaignId}}/g, campaignId)
    .replace(/{{someId}}/g, uniqueId);

    // console.log(html);
    // return;
    

  return htmlWithReplacements.includes('</body>')
    ? htmlWithReplacements.replace('</body>', `${footer}</body>`)
    : htmlWithReplacements + footer;
}

// Schedule task every minute
cron.schedule('* * * * *', async () => {
//  console.log('⏰ Checking for scheduled campaigns...');

  // Get all scheduled campaigns (not just due ones)
  const [allScheduled] = await db.query(`
    SELECT name, sending_time FROM campaigns
    WHERE status = 'scheduled'
  `);

  const now = new Date();

// console.log(`🕒 Current UTC time: ${now.toISOString()}`);

for (const campaign of allScheduled) {
  const sendTime = new Date(campaign.sending_time);
  console.log(`📬 Campaign "${campaign.name}" sending_time: ${sendTime.toISOString()}`);

  const diffMs = sendTime - now;
  const diffMin = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMin / 60);
  const minutes = diffMin % 60;

  if (diffMs > 0) {
    // console.log(`📅 "${campaign.name}" — will be sent in ${hours}h${minutes}min`);
  } else {
    // console.log(`⏰ "${campaign.name}" is due or overdue by ${Math.abs(hours)}h${Math.abs(minutes)}min`);
  }
}

  // Filter campaigns that need to be sent now
  const [campaigns] = await db.query(`
    SELECT * FROM campaigns
    WHERE status = 'scheduled'
      AND sending_time <= UTC_TIMESTAMP()
      AND sending_time > UTC_TIMESTAMP() - INTERVAL 1 MINUTE
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
            campaign.subject,
            campaign.id
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

// Serve templates folder statically
app.use('/templates', express.static(path.join(__dirname, 'Pages/Templates')));



app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
