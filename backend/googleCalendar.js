import { google } from "googleapis";
import dotenv from "dotenv";

dotenv.config();

// ✅ Debugging: Ensure environment variables are correctly loaded
console.log("✅ GOOGLE_CLIENT_ID:", process.env.GOOGLE_CLIENT_ID);
console.log("✅ GOOGLE_REFRESH_TOKEN:", process.env.GOOGLE_REFRESH_TOKEN);
console.log("✅ GOOGLE_CALENDAR_ID:", process.env.GOOGLE_CALENDAR_ID || "primary");

const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

auth.setCredentials({
    access_token: process.env.GOOGLE_ACCESS_TOKEN,
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN
});

// ✅ Refresh Access Token Automatically
auth.on('tokens', (tokens) => {
    if (tokens.refresh_token) {
        console.log("✅ New Refresh Token Received:", tokens.refresh_token);
    }
    console.log("✅ New Access Token Received:", tokens.access_token);
});

// ✅ Google Calendar API Fetch Function
export async function fetchGroupedEvents() {
    console.log("🚀 Fetching Google Calendar events...");

    try {
        console.log("🔍 Using Access Token:", process.env.GOOGLE_ACCESS_TOKEN);
        console.log("🔍 Using Calendar ID:", process.env.GOOGLE_CALENDAR_ID || "primary");

        const calendar = google.calendar({ version: "v3", auth });

        const response = await calendar.events.list({
            calendarId: process.env.GOOGLE_CALENDAR_ID || "primary",
            timeMin: new Date().toISOString(),
            maxResults: 30,
            singleEvents: true,
            orderBy: "startTime",
            fields: "items(id,summary,location,start,end,transparency)"
        });

        console.log("📌 Google Calendar API Response:", response.data);

        const events = response.data.items || [];

        let groupedEvents = {};

        events.forEach(event => {
            if (!event.start || !event.end) return; // ✅ Avoid missing time data

            // 📌 Filter out birthdays & irrelevant events
            if (event.summary && event.summary.toLowerCase().includes("anniversaire")) {
                return; // ✅ Skip birthdays
            }

            // 🔥 Detect "Busy" or "Free" status
            let status = event.transparency === "transparent" ? "Free" : "Busy";

            let eventDate, eventTime;

            // ✅ Handle both `dateTime` and `date` formats
            if (event.start.dateTime) {
                const eventDateTime = new Date(event.start.dateTime);
                eventDate = eventDateTime.toISOString().split('T')[0]; // YYYY-MM-DD
                
                // 🔄 Ensure conversion to French timezone (or your expected format)
                eventTime = eventDateTime.toLocaleTimeString("fr-FR", { 
                    hour: "2-digit", 
                    minute: "2-digit", 
                    hour12: false  // ✅ Ensure 24-hour format
                });
            } else if (event.start.date) {
                eventDate = event.start.date; // All-day event (YYYY-MM-DD)
                eventTime = "00:00"; // Default time for all-day events
            }

            // 🌍 Fix inconsistent location values (Some events may have no location)
            const location = event.location?.trim() || "Unknown";

            if (!groupedEvents[location]) {
                groupedEvents[location] = [];
            }

            groupedEvents[location].push({
                id: event.id,
                summary: event.summary || "No Title",
                date: eventDate,
                time: eventTime,
                status,
            });
        });

        console.log("✅ Optimized Grouped Events:", JSON.stringify(groupedEvents, null, 2));

        return groupedEvents;
    } catch (error) {
        console.error("❌ Error fetching Google Calendar events:", error.response ? error.response.data : error);
        return {};
    }
}