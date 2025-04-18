import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const CALENDLY_API_KEY = process.env.CALENDLY_API_KEY;
const CALENDLY_USER_URL = process.env.CALENDLY_USER_URL;

const headers = {
    'Authorization': `Bearer ${CALENDLY_API_KEY}`,
    'Content-Type': 'application/json'
};

let userInfoCache = null;

export async function getUserInfo() {
    if (userInfoCache) return userInfoCache; // Use cached user info
    try {
        const response = await fetch(CALENDLY_USER_URL, { headers });
        const data = await response.json();
        userInfoCache = data.resource; // Cache the response
        return data.resource;
    } catch (error) {
        console.error("❌ Error fetching Calendly user info:", error);
    }
}

// Fetch all available event types (appointment types)
export async function getEventTypes() {
    try {
        const user = await getUserInfo();
        const response = await fetch(`https://api.calendly.com/event_types?user=${user.uri}`, { headers });
        const data = await response.json();
        return data.collection;
    } catch (error) {
        console.error("❌ Error fetching event types:", error);
    }
}

// Fetch available slots for a specific event type
export async function getAvailableSlots(eventTypeId, startDate, endDate) {
    try {
        const response = await fetch(
            `https://api.calendly.com/event_type_available_times?event_type=${eventTypeId}&start_time=${startDate}&end_time=${endDate}`,
            { headers }
        );
        const data = await response.json();
        return data.collection;
    } catch (error) {
        console.error("❌ Error fetching available slots:", error);
    }
}