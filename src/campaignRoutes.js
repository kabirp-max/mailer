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

app.delete('/campaigns/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await db.query('DELETE FROM campaigns WHERE id = ?', [id]);
    res.json({ message: 'Campaign deleted' });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    res.status(500).json({ error: 'Failed to delete campaign' });
  }
});


module.exports = app;