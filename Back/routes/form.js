const express = require('express');
const router = express.Router();

// Import dynamique de fetch (compatible avec Node sur Render)
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

router.post('/', async (req, res) => {
  const data = req.body;

  try {
    const response = await fetch(process.env.GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const text = await response.text();
    res.status(200).json({ message: 'Données envoyées au Google Sheet', result: text });
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ message: 'Erreur de communication avec Google Apps Script' });
  }
});

module.exports = router;