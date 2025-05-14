const express = require("express");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
require("dotenv").config();

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// ⚠️ Compatible avec Node v22+ et Render
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 📤 Route d'envoi de formulaire
router.post('/form', upload.single('photo'), async (req, res) => {
  const data = req.body;
  const file = req.file;

  try {
    const uploadStream = cloudinary.uploader.upload_stream(
      { resource_type: "image" },
      async (error, result) => {
        if (error) throw error;

        const imageUrl = result.secure_url;
        console.log("📸 Image URL :", imageUrl);
        data.imageUrl = imageUrl;

        const response = await fetch(process.env.GOOGLE_SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        const text = await response.text();
        res.status(200).json({ message: 'Données envoyées via /form', result: text });
      }
    );

    if (file && file.buffer) {
      uploadStream.end(file.buffer);
    } else {
      throw new Error("Aucun fichier photo trouvé.");
    }

  } catch (error) {
    console.error("❌ Erreur route /form :", error);
    res.status(500).json({ message: 'Erreur /form', error: error.message });
  }
});

// 🔁 Route crop manuelle
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