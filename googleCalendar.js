import { google } from "googleapis";
import dotenv from "dotenv";


dotenv.config();

// ✅ Debug: Ensure environment variables are correctly loaded
console.log("✅ GOOGLE_CLIENT_ID:", process.env.GOOGLE_CLIENT_ID);
console.log("✅ GOOGLE_REFRESH_TOKEN:", process.env.GOOGLE_REFRESH_TOKEN);

const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    "http://localhost:5001/oauth2callback"
);

auth.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN
});



// ✅ Function to Refresh Access Token
async function getAccessToken() {
    try {
        const { token } = await auth.getAccessToken();
        console.log("✅ New Access Token:", token);
        return token;
    } catch (error) {
        console.error("❌ Error fetching new access token:", error);
        return null;
    }
}

// ✅ Google Calendar API Fetch Function
export async function fetchGroupedEvents() {
    try {
        console.log("🚀 Fetching Google Calendar events...");

        // ✅ Initialize Google Calendar API
const calendar = google.calendar({ version: "v3", auth });

        const response = await calendar.events.list({
            calendarId: process.env.GOOGLE_CALENDAR_ID,
            timeMin: new Date().toISOString(),  // Only future events
            maxResults: 30,  // ✅ Limit the number of events returned
            singleEvents: true,
            orderBy: "startTime",
            fields: "items(id,summary,location,start,end,transparency)"  // ✅ Reduce returned data
        });

        console.log("✅ API Raw Response Received");

        const events = response.data.items || [];

        let groupedEvents = {};

        events.forEach(event => {
            // 📌 Filter out birthdays & irrelevant events
            if (event.summary && event.summary.toLowerCase().includes("anniversaire")) {
                return; // Skip birthdays
            }

            // 🔥 Detect "Busy" or "Free" status
            let status = event.transparency === "transparent" ? "Free" : "Busy";

            const location = event.location || "Unknown";
            if (!groupedEvents[location]) {
                groupedEvents[location] = [];
            }

            groupedEvents[location].push({
                id: event.id,
                summary: event.summary,
                date: event.start.dateTime || event.start.date,
                time: event.start.dateTime ? new Date(event.start.dateTime).toLocaleTimeString() : "All Day",
                status,
            });
        });

        console.log("✅ Optimized Grouped Events:", JSON.stringify(groupedEvents, null, 2));

        return groupedEvents;
    } catch (error) {
        console.error("❌ Error fetching Google Calendar events:", error);
        return {};
    }
}