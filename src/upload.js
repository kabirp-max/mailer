const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.post('/upload', upload.single('file'), (req, res) => {
  const filePath = req.file.path;
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  fs.unlinkSync(filePath); // delete after processing

  const headers = json[0]; // First row
  const rows = json.slice(1); // Data

  res.json({ headers, rows });
});

module.exports = router;
