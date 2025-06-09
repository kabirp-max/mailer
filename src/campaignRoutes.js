const express = require('express');
const app = express.Router();

// API to list template files
app.get('/api/templates', (req, res) => {
  const templatesDir = path.join(__dirname, 'Pages/Templates');
  fs.readdir(templatesDir, (err, files) => {
    if (err) return res.status(500).json({ error: 'Cannot read templates folder' });
    const htmlFiles = files.filter(f => f.endsWith('.html'));
    res.json(htmlFiles);
  });
});

module.exports = app;