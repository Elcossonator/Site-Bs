import dotenv from "dotenv";
import path from "path";
import express from "express";
import mongoose from "mongoose";
import nodemailer from "nodemailer";
import Stripe from "stripe";
const router = express.Router();


dotenv.config();
console.log("✅ Loaded EMAIL_USER:", process.env.EMAIL_USER);
console.log("✅ Loaded EMAIL_PASS:", process.env.EMAIL_PASS ? "******" : "MISSING!");
console.log("✅ Loaded ADMIN_EMAIL:", process.env.ADMIN_EMAIL);



// 📌 Booking Schema
const bookingSchema = new mongoose.Schema({
    date: String,
    time: String,
    location: String,
    user: String,
    project: String,
    status: { type: String, default: "Libre" }, // "Libre", "Pending", "Reserved"
    calendarStatus: { type: String, default: "Free" },
    firstNotificationSent: { type: Boolean, default: false }, // ✅ New flag
    waitlist: [
        {
            user: String,
            project: String,
            timestamp: { type: Date, default: Date.now }
        }
    ]
});

// 📌 ADD THIS LINE BELOW:
bookingSchema.index({ date: 1, time: 1 }); // ✅ Optimized indexing for faster searches

const Booking = mongoose.model("Booking", bookingSchema);

// 📌 Email Transporter (Change this to your email)
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// ✅ 1️⃣ Confirmation Email (User)
async function sendConfirmationEmail(userEmail, bookingDetails) {
    const mailOptions = {
        from: `"Bruits Sourds" <${process.env.EMAIL_USER}>`,
        to: userEmail,
        subject: "✅ Your Tattoo Appointment is Confirmed! 🎨",
        html: `
            <p>Your booking is confirmed for:</p>
            <p><strong>Date:</strong> ${bookingDetails.date}</p>
            <p><strong>Time:</strong> ${bookingDetails.time}</p>
            <p><strong>Location:</strong> ${bookingDetails.location}</p>
            <p>See you soon! 🎨</p>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log("✅ Confirmation email sent to:", userEmail);
        sendAdminBookingNotification(bookingDetails); // Also notify the admin
    } catch (error) {
        console.error("❌ Email sending error:", error);
    }
}

// ✅ 2️⃣ Pending Email (User)
async function sendPendingEmail(userEmail, bookingDetails) {
    const mailOptions = {
        from: `"Bs Tattoo" <${process.env.EMAIL_USER}>`,
        to: userEmail,
        subject: "⏳ Your Booking Request is on the waitlist",
        html: `
            <p>Hey, we received your booking request! 🎨</p>
            <p><strong>Date:</strong> ${bookingDetails.date}</p>
            <p><strong>Time:</strong> ${bookingDetails.time}</p>
            <p><strong>Location:</strong> ${bookingDetails.location}</p>
            <p>We'll review your request and confirm it soon. Stay tuned!</p>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log("✅ Pending booking email sent to", userEmail);
    } catch (error) {
        console.error("❌ Error sending pending booking email:", error);
    }
}

// ✅ 3️⃣ Waitlist Email (Admin Notification)
async function sendWaitlistEmail(userEmail, bookingDetails) {
    // 🔎 Find the user's position in the waitlist
    const userIndex = bookingDetails.waitlist.findIndex(entry => entry.user === userEmail);
    const positionText = userIndex === 0 
        ? "You'll be notified first!" 
        : `You'll be notified ${userIndex + 1}ᵗʰ when the slots is open up!`;

    // 📩 Email to User
    const mailOptionsUser = {
        from: `"Bruits Sourds" <${process.env.EMAIL_USER}>`,
        to: userEmail,
        subject: "📩 You're on the Waitlist!",
        html: `
            <p>You've been added to the waitlist for:</p>
            <p><strong>Date:</strong> ${bookingDetails.date}</p>
            <p><strong>Time:</strong> ${bookingDetails.time}</p>
            <p><strong>Location:</strong> ${bookingDetails.location}</p>
            <p>${positionText}</p>
        `
    };

    // 📩 Email to Admin
    const mailOptionsAdmin = {
        from: `"Bruits Sourds" <${process.env.EMAIL_USER}>`,
        to: process.env.ADMIN_EMAIL,
        subject: "📩 New Waitlist Entry",
        html: `
            <h3>🚀 New User on the Waitlist!</h3>
            <p><strong>User:</strong> <a href="mailto:${userEmail}">${userEmail}</a></p>
            <p><strong>Project:</strong> ${bookingDetails.project}</p>
            <p><strong>Date:</strong> ${bookingDetails.date}</p>
            <p><strong>Time:</strong> ${bookingDetails.time}</p>
            <p><strong>Location:</strong> ${bookingDetails.location}</p>
            <p>User is #${userIndex + 1} in the waitlist.</p>
        `
    };

    try {
        // ✅ Send to User
        await transporter.sendMail(mailOptionsUser);
        console.log(`✅ Waitlist email sent to ${userEmail} (Position: ${userIndex + 1})`);

        // ✅ Send to Admin
        await transporter.sendMail(mailOptionsAdmin);
        console.log(`✅ Waitlist email sent to admin (${process.env.ADMIN_EMAIL})`);
    } catch (error) {
        console.error("❌ Error sending waitlist email:", error);
    }
}

// ✅ 4️⃣ Admin Booking Notification (Styled like your image)
async function sendAdminBookingNotification(bookingDetails) {
    try {
        let booking = await Booking.findById(bookingDetails._id);

        if (!booking) {
            console.error("❌ Booking not found when sending admin email.");
            return;
        }

        const declineUrl = `https://site-bs.onrender.com/api/agenda/decline/${bookingDetails._id}`;
        let declineButton = ""; // Default: No decline button
        
        if (!booking.firstNotificationSent) {
            declineButton = `
                <br>
                <a href="${declineUrl}" style="display:inline-block;
                    padding:10px 15px;
                    background:#FF4D4D;
                    color:white;
                    text-decoration:none;
                    border-radius:5px;
                    font-size:16px;">
                    ❌ Decline Booking
                </a>
            `;
        
            booking.firstNotificationSent = true;
            await booking.save();
        }

        const mailOptions = {
            from: `"Bruits Sourds" <${process.env.EMAIL_USER}>`,
            to: process.env.ADMIN_EMAIL,
            replyTo: bookingDetails.user, // ✅ Clicking "Reply" sends email to user
            subject: "📅 New Booking Request",
            html: `
                <h2>📅 New Booking Request</h2>
                <p><strong>User:</strong> <a href="mailto:${bookingDetails.user}">${bookingDetails.user}</a></p>
                <p><strong>Project:</strong> ${bookingDetails.project}</p>
                <p><strong>Date:</strong> ${bookingDetails.date}</p>
                <p><strong>Time:</strong> ${bookingDetails.time}</p>
                <p><strong>Location:</strong> ${bookingDetails.location}</p>
                <br>
                <p>Reply to this email to respond directly to the user.</p>

                <!-- 🪑 Clickable for Admin but Broken in Replies -->
                <p>
                    <a href="${declineUrl}" style="font-size:24px; text-decoration:none;">
                        🪑&#8288;
                    </a>
                </p>

                <!-- Hide the Decline Button in Replies -->
                <div style="display:none;">
                    <a href="${declineUrl}" style="display:inline-block;
                        padding:10px 15px;
                        background:#FF4D4D;
                        color:white;
                        text-decoration:none;
                        border-radius:5px;
                        font-size:16px;">
                        ❌ Decline Booking
                    </a>
                </div>
            `,
            inReplyTo: undefined, // ✅ Prevents email from being grouped in the same thread
            references: undefined  // ✅ Forces email clients to treat it as a new conversation
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ Admin booking notification sent to ${process.env.ADMIN_EMAIL}`);
    } catch (error) {
        console.error("❌ Error sending admin booking email:", error);
    }
}


// 📌 POST: Book a slot and join waitlist if needed
router.post("/book", async (req, res) => {
    try {
        console.log("📌 Received booking request:", req.body);
        console.log("📩 Booking received on backend:", req.body);

        const { date, time, location, user, project, status } = req.body;
        if (!date || !time || !location || !user) {
            return res.status(400).json({ message: "⛔ Missing required fields" });
        }

        // 🔎 Check if the user is already on any waitlist
        const alreadyOnWaitlist = await Booking.findOne({ "waitlist.user": user });

        if (alreadyOnWaitlist) {
            return res.status(400).json({ message: "⛔ You are already on the waitlist for another slot." });
        }

        // 🔎 Check if the slot already exists
        let existingBooking = await Booking.findOne({ date, time, location });

        if (existingBooking) {
            if (existingBooking.status === "Reserved") {
                return res.status(400).json({ message: "⛔ This slot is fully booked and cannot be reserved." });
            }

            if (existingBooking.status === "Pending") {
                // ✅ Add user to waitlist (multiple users allowed)
                existingBooking.waitlist.push({ user, project });
                await existingBooking.save();

                sendWaitlistEmail(user, existingBooking); // 📩 Notify user

                return res.status(200).json({ message: "✅ You have been added to the waitlist!" });
            }
        }

        // ✅ If slot is free, confirm the booking immediately
        if (!existingBooking || existingBooking.status === "Libre") {
            const newBooking = new Booking({
                date,
                time,
                location,
                user,
                project,
                status: "Reserved",
                calendarStatus: "Busy"
            });
            await newBooking.save();
        
            console.log("✅ Booking saved as Reserved:", newBooking);
        
            if (newBooking.status === "Reserved") {
                sendConfirmationEmail(user, newBooking);
            } else {
                sendPendingEmail(user, newBooking);
            }
            sendAdminBookingNotification(newBooking);
        
            return res.status(201).json({ message: "✅ Slot reserved successfully!" });
        } else {
            // 🔁 Existing booking found → add to waitlist
            existingBooking.waitlist.push({ user, project });
            await existingBooking.save();
        
            sendWaitlistEmail(user, existingBooking); // 📩 Notify user and admin
            return res.status(200).json({ message: "🕒 Added to waitlist" });
        }

    } catch (error) {
        console.error("❌ Booking error:", error);
        return res.status(500).json({ message: "Internal Server Error", error });
    }
});

router.get("/decline/:id", async (req, res) => {
    try {
        const bookingId = req.params.id;
        console.log(`🔍 Decline request received for booking ID: ${bookingId}`);

        // ✅ Ignore invalid ObjectId if testing
        if (bookingId === "test") {
            return res.send(`<h2>✅ Test Successful: Backend is Working!</h2>`);
        }

        // ✅ Validate ObjectId before querying MongoDB
        if (!bookingId.match(/^[0-9a-fA-F]{24}$/)) {
            console.error("❌ Invalid ObjectId format:", bookingId);
            return res.status(400).send("❌ Invalid Booking ID.");
        }

        let booking = await Booking.findById(bookingId);

        if (!booking) {
            console.error("❌ Error: Booking not found.");
            return res.status(404).send("❌ Booking not found.");
        }

        console.log(`⛔ Declining booking for ${booking.user} on ${booking.date} at ${booking.time}`);

        if (booking.waitlist.length > 0) {
            booking.waitlist.sort((a, b) => a.timestamp - b.timestamp);
            const nextUser = booking.waitlist.shift();

            booking.user = nextUser.user;
            booking.project = nextUser.project;
            booking.status = "Pending";
            await booking.save();

            sendWaitlistPromotionEmail(nextUser.user, booking);
            console.log(`✅ ${nextUser.user} is now booked for this slot.`);
            return res.send(`<h2>✅ Booking declined. ${nextUser.user} is now booked for this slot.</h2>`);
        } else {
            booking.status = "Libre";
            booking.user = null;
            booking.project = null;
            await booking.save();

            console.log("✅ Booking declined. Slot is now free.");
            return res.send("<h2>✅ Booking declined. The slot is now available.</h2>");
        }
    } catch (error) {
        console.error("❌ Internal Server Error:", error);
        return res.status(500).send(`❌ Internal Server Error: ${error.message}`);
    }
});

// 📌 Notify Next in Waitlist
async function notifyNextInWaitlist(booking) {
    if (booking.waitlist.length > 0) {
        // 🔄 Sort waitlist by timestamp (earliest first)
        booking.waitlist.sort((a, b) => a.timestamp - b.timestamp);

        // ⏩ Get the first user from the waitlist
        const nextUser = booking.waitlist.shift();
        
        // 🔄 Move waitlist user to main booking slot
        booking.user = nextUser.user;
        booking.project = nextUser.project;
        booking.status = "Pending"; // Reset to pending for new user
        await booking.save();

        // 📩 Send email ONLY to the new first-in-line
        sendConfirmationEmail(nextUser.user, booking);

        console.log(`✅ ${nextUser.user} has been moved to the booking slot on ${booking.date} ${booking.time}`);
    } else {
        // ⏪ No one in waitlist → Return to "Libre"
        booking.status = "Libre";
        await booking.save();
    }
}



import { fetchGroupedEvents } from "../googleCalendar.js";

router.get("/slots", async (req, res) => {
    console.log("✅ GET request received at /api/agenda/slots");

    try {
        // 🔹 Récupérer les réservations depuis MongoDB
        const bookings = await Booking.find();
        console.log("📌 Current Bookings in MongoDB:", bookings);

        // 🔹 Récupérer les événements depuis Google Calendar
        const googleEvents = await fetchGroupedEvents();
        console.log("📌 Google Calendar Events:", JSON.stringify(googleEvents, null, 2));

        // 🔹 Construire une table des créneaux occupés
        let busySlots = new Set();
        Object.keys(googleEvents).forEach(location => {
            googleEvents[location].forEach(event => {
                if (event.status === "Busy") {
                    let key = `${event.date}_${event.time}_${location}`;
                    busySlots.add(key);
                }
            });
        });

        // 🔹 Mise à jour de MongoDB si besoin
        for (let booking of bookings) {
            let key = `${booking.date}_${booking.time}_${booking.location}`;
            let googleStatus = busySlots.has(key) ? "Busy" : "Free";
        
            // 🟥 If Google says BUSY and status is Libre → Reserve it
            if (googleStatus === "Busy" && booking.status === "Libre") {
                console.log(`🔄 Google says BUSY → Setting ${booking._id} to Reserved`);
                booking.status = "Reserved";
                booking.calendarStatus = "Busy";
                await booking.save();
            }
        
            // 🟩 If Google says FREE but booking is still marked Busy in DB
            else if (googleStatus === "Free" && booking.calendarStatus === "Busy") {
                if (!booking.user) {
                    // ✅ No user → clear it
                    console.log(`🔄 Google says FREE & no user → Reverting ${booking._id} to Libre`);
                    booking.status = "Libre";
                    booking.calendarStatus = "Free";
                    await booking.save();
                } else {
                    // ✅ User exists (Pending/Reserved) → keep it
                    console.log(`🛡️ Google FREE but user exists → Preserving status '${booking.status}'`);
                    booking.calendarStatus = "Free"; // optional update
                    await booking.save();
                }
            }
        
            // Attach google status for frontend rendering if needed
            booking.googleStatus = googleStatus;
        }

        // 🔹 Envoyer les réservations enrichies avec le statut Google
        res.json({ slots: bookings });

    } catch (error) {
        console.error("❌ Error fetching bookings:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

router.post("/stripe-webhook", express.raw({ type: "application/json" }), async (req, res) => {
    console.log("📌 Webhook request received!");

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const sig = req.headers["stripe-signature"];
    let event;

    try {
        console.log("📌 Checking Stripe Signature..."); // ✅ DEBUG
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
        console.log("✅ Webhook event verified:", event.type);
    } catch (err) {
        console.error("⚠️ Webhook signature verification failed:", err);
        return res.status(400).send("Webhook Signature Error");
    }

    // ✅ Handle multiple Stripe events
    if (["checkout.session.completed", "payment_intent.succeeded", "charge.succeeded"].includes(event.type)) {
        const session = event.data.object;
        console.log("💳 Payment successful for session:", session.id);

        try {
            const booking = await Booking.findOne({ paymentSessionId: session.id });

            if (booking) {
                console.log(`✅ Found booking: ${booking._id} - Updating status to PAID`);
                booking.paymentStatus = "paid";
                await booking.save();
                //TODO res.json({ date : "mardi 18h", ville : "Paris"})

                console.log(`✅ Booking ${booking._id} updated successfully in MongoDB`);

                // 📧 Send confirmation email to User
                const mailOptionsUser = {
                    from: `"Bruits Sourds" <${process.env.EMAIL_USER}>`,
                    to: booking.user,
                    subject: "🎉 Payment Confirmed! Your Booking is Secured",
                    html: `<h3>✅ Your Payment is Confirmed</h3>
                    <p>Thank you for your booking! Here are the details:</p>
                    <p><strong>Date:</strong> ${booking.date}</p>
                    <p><strong>Time:</strong> ${booking.time}</p>
                    <p><strong>Location:</strong> ${booking.location}</p>
                    <p><strong>Project:</strong> ${booking.project}</p>
                    <p>Your appointment is now fully confirmed. See you soon! 🎨</p>`
                };

                // 📧 Send notification email to Admin
                const mailOptionsAdmin = {
                    from: `"Bruits Sourds" <${process.env.EMAIL_USER}>`,
                    to: process.env.ADMIN_EMAIL,
                    subject: "📌 New Paid Booking",
                    html: `<h3>📌 New Paid Booking Received</h3>
                    <p>A client has completed payment and booked a slot.</p>
                    <p><strong>Date:</strong> ${booking.date}</p>
                    <p><strong>Time:</strong> ${booking.time}</p>
                    <p><strong>Location:</strong> ${booking.location}</p>
                    <p><strong>User Email:</strong> <a href="mailto:${booking.user}">${booking.user}</a></p>
                    <p><strong>Project Description:</strong> ${booking.project}</p>
                    <p><strong>Payment Status:</strong> ✅ Paid</p>
                    <p>Reply to this email to engage with the client.</p>`
                };

                console.log("📧 Sending confirmation email to user:", booking.user);
                console.log("📧 Sending notification email to admin:", process.env.ADMIN_EMAIL);

                try {
                    await transporter.sendMail(mailOptionsUser);
                    console.log("✅ User email sent!");
                    await transporter.sendMail(mailOptionsAdmin);
                    console.log("✅ Admin email sent!");
                } catch (error) {
                    console.error("❌ Email sending error:", error);
                }
            } else {
                console.error("❌ No booking found in MongoDB for session ID:", session.id);
            }
        } catch (error) {
            console.error("❌ MongoDB update error:", error);
        }
    }

    res.status(200).send("Webhook received!");
});

// ✅ Nouvelle route pour fetch les réservations (bookings) par lieu
router.get("/bookings", async (req, res) => {
    try {
        const { location } = req.query;

        if (!location) {
            return res.status(400).json({ message: "❌ Location is required." });
        }

        const bookings = await Booking.find({ location });

        console.log(`✅ Bookings fetched for ${location}:`, bookings);

        res.json(bookings);
    } catch (error) {
        console.error("❌ Error fetching bookings:", error);
        res.status(500).json({ message: "❌ Error fetching bookings.", error });
    }
});

export default router;