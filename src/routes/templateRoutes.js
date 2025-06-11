const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

router.use(express.json());

// If you use URL-encoded forms too, add this:
router.use(express.urlencoded({ extended: true }));

// API to list template files
router.get('/templates', (req, res) => {
  const templatesDir = path.join(__dirname, '../Pages/Templates');
  fs.readdir(templatesDir, (err, files) => {
    if (err) return res.status(500).json({ error: 'Cannot read templates folder' });
    const htmlFiles = files.filter(f => f.endsWith('.html'));
    res.json(htmlFiles);
  });
});

// API to fetch the content of a template
router.get('/templates/:filename', (req, res) => {
  const filename = req.params.filename.replace(/[^a-z0-9_\-\.]/gi, '_');
  const filePath = path.join(__dirname, '../Pages/Templates', filename);
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) return res.status(404).json({ error: 'Template not found' });
    res.send(data);
  });
});


module.exports = router;