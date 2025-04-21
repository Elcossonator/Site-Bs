import dotenv from "dotenv";
dotenv.config();
import path from "path";
import express from "express";
import { fetchGroupedEvents } from "./googleCalendar.js";
import mongoose from "mongoose";
import cors from "cors";
import nodemailer from "nodemailer"; 
import { getEventTypes, getAvailableSlots } from "./calendly.js";
import fetch from "node-fetch";
const REDIRECT_URI = "http://localhost:5001/oauth2callback";

// ✅ Debug: Ensure ENV variables are loaded
console.log("✅ Loaded ENV Variables:", process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_REFRESH_TOKEN);

const app = express();  // ✅ Fix: Move this line ABOVE router
app.use(cors({
    origin: "*", // Allow all origins (change to specific domains in production)
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type"]
}));
app.use(express.json()); // ✅ Ensure JSON middleware is applied

const router = express.Router();

// ✅ Debug: Ensure routes are being registered
console.log("✅ Registering API Routes...");

// ✅ Fix: Attach the router to the app AFTER `app` is initialized
app.use("/", router);

// ✅ Keep Calendly API for fetching event types
router.get("/event-types", async (req, res) => {
    try {
        const eventTypes = await getEventTypes();
        res.json(eventTypes);
    } catch (error) {
        res.status(500).json({ message: "Error fetching event types", error });
    }
});

// ✅ Ensure `/api/google-calendar` is properly registered
router.get("/api/google-calendar", async (req, res) => {
    try {
        console.log("🚀 Fetching events from Google Calendar...");
        const groupedEvents = await fetchGroupedEvents();
        res.json(groupedEvents);
    } catch (error) {
        console.error("❌ Error fetching Google Calendar events:", error);
        res.status(500).json({ message: "Error fetching Google Calendar events", error });
    }
});

// 📌 MongoDB Connection
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
    console.error("❌ ERROR: MONGO_URI is missing in .env!");
    process.exit(1);
}

mongoose
mongoose
.connect(MONGO_URI)
    .then(() => {
        const db = mongoose.connection.useDb("bookingDB");
        console.log("✅ Connected to MongoDB - Using Database:", db.name);
    })
    .catch((err) => console.error("❌ MongoDB Connection Error:", err));

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// 📌 Apply express.raw() ONLY for Stripe Webhook BEFORE express.json()
app.post("/api/agenda/stripe-webhook", express.raw({ type: "application/json" }));

// 📌 Serve the "public" folder
const __dirname = path.resolve();
app.use("/public", express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 5001;

// 📌 Import and use agenda routes
import agendaRoutes from "./routes/agenda.js";
app.use("/api/agenda", agendaRoutes);

// 📌 API Root Test
app.get("/", (req, res) => {
    res.send("✅ Server is running!");
});

// 📌 Start the server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});

// 📌 OAuth2 Callback Route
app.get("/oauth2callback", async (req, res) => {
    const code = req.query.code;
    if (!code) {
        return res.status(400).send("❌ Missing authorization code.");
    }

    try {
        // 📌 Exchange the authorization code for tokens
        const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                client_id: process.env.GOOGLE_CLIENT_ID,
                client_secret: process.env.GOOGLE_CLIENT_SECRET,
                redirect_uri: "http://localhost:5001/oauth2callback",
                grant_type: "authorization_code",
                code: code,
            }),
        });

        const tokenData = await tokenResponse.json();

        if (tokenData.error) {
            return res.status(400).json(tokenData);
        }

        console.log("✅ Access Token:", tokenData.access_token);
        console.log("✅ Refresh Token:", tokenData.refresh_token);

        res.send("✅ Authentication successful! Copy your refresh token from the terminal.");
    } catch (error) {
        console.error("❌ Error exchanging auth code:", error);
        res.status(500).send("❌ Error exchanging auth code.");
    }
});