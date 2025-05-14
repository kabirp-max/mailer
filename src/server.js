const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const uploadRoutes = require('./upload');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 4000;

app.use(cors());
app.use(bodyParser.json());
app.use('/api', uploadRoutes);

// Serve static files (for uploaded CSV files)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const logFilePath = path.join(__dirname, 'opens.log');

if (!fs.existsSync(logFilePath)) {
  fs.writeFileSync(logFilePath, '', 'utf8');
}


const transporter = nodemailer.createTransport({
  host: "mautic.techresearchcenter.com",
  port: 587,
  secure: false, // Set this to `true` if you use SSL
  auth: {
    user: "emailuser",
    pass: "Organics5!"
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Get email open logs from `opens.log`
app.get('/api/opens', (req, res) => {
  const logFilePath = path.join(__dirname, 'opens.log');
  
  fs.readFile(logFilePath, 'utf8', (err, data) => {
    if (err) return res.status(500).send({ error: 'Failed to read log file' });

    const logs = data
      .trim()
      .split('\n')
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    res.json(logs.reverse()); // latest first
  });
});

// Send emails
app.post('/send-emails', async (req, res) => {
  const { subject, message, recipients } = req.body;

  const sendPromises = recipients.map(email =>
    transporter.sendMail({
      from: '"Your Name" <emailuser@techresearchcenter.com>',
      to: email,
      subject,
      html: message // Using HTML format for the message
    })
    .then(() => ({
      email,
      status: 'fulfilled'
    }))
    .catch(error => ({
      email,
      status: 'rejected',
      error: error.message
    }))
  );

  const results = await Promise.all(sendPromises);

  const successCount = results.filter(r => r.status === 'fulfilled').length;
  const failureCount = results.filter(r => r.status === 'rejected').length;

  res.json({
    success: true,
    sent: successCount,
    failed: failureCount,
    details: results
  });
});

const PORT = process.env.PORT || 4000; // For production use the environment variable
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
