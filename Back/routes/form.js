const express = require('express');
const router = express.Router();
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Import dynamique de fetch (compatible avec Node sur Render)
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

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

module.exports = router;