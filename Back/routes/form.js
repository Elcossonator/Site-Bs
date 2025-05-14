const express = require('express');
const fetch = require('node-fetch');
const router = express.Router();

const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

const cloudinary = require('cloudinary').v2;
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});


// Import dynamique de fetch (compatible avec Node sur Render)
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));


router.post('/submit-crop', async (req, res) => {
  const { cropUrl, row } = req.body;

  if (!cropUrl || !row) {
    return res.status(400).json({ error: "cropUrl et row sont requis." });
  }

  try {
    const response = await fetch(process.env.GOOGLE_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cropUrl, row })
    });

    const text = await response.text();
    res.status(200).send(`✅ Crop envoyé : ${text}`);
  } catch (err) {
    console.error("Erreur d'envoi vers Google Script:", err);
    res.status(500).send("❌ Erreur serveur");
  }
});

router.post('/', upload.single('photo'), async (req, res) => {
    const data = req.body;
    const file = req.file;
  
    try {
      const uploadResult = await cloudinary.uploader.upload_stream(
        { resource_type: "image" },
        async (error, result) => {
          if (error) throw error;
  
          const imageUrl = result.secure_url;
          console.log("📸 Image URL :", imageUrl);
  
          // Ajoute imageUrl aux données envoyées à Google Sheets
          data.imageUrl = imageUrl;
  
          // Appel à Google Apps Script
          const response = await fetch(process.env.GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });
  
          const text = await response.text();
          res.status(200).json({ message: 'Données + image envoyées', result: text });
        }
      );
  
      uploadResult.end(file.buffer);
    } catch (error) {
      console.error("❌ Erreur Cloudinary :", error);
      res.status(500).json({ message: 'Erreur d’upload image ou de communication Google' });
    }
  });

  router.post("/submit-crop", async (req, res) => {
    const { row, cropUrl } = req.body;
  
    try {
      const response = await fetch(process.env.GOOGLE_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ row, cropUrl })
      });
      const text = await response.text();
      res.send("OK: " + text);
    } catch (error) {
      res.status(500).send("Erreur : " + error.message);
    }
  });

module.exports = router;