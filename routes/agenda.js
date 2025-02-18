import dotenv from "dotenv";
import path from "path";
import express from "express";
import mongoose from "mongoose";
import nodemailer from "nodemailer";
import Stripe from "stripe";

dotenv.config();
console.log("✅ Loaded EMAIL_USER:", process.env.EMAIL_USER);
console.log("✅ Loaded EMAIL_PASS:", process.env.EMAIL_PASS ? "******" : "MISSING!");
console.log("✅ Loaded ADMIN_EMAIL:", process.env.ADMIN_EMAIL);

const router = express.Router();

// 📌 Booking Schema
const bookingSchema = new mongoose.Schema({
    date: String,
    time: String,
    location: String,
    user: String,
    project: String,
    status: { type: String, default: "Libre" }, // "Libre", "Pending", "Reserved"
    calendarStatus: { type: String, default: "Free" } // "Free" or "Busy" from Google Calendar
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

async function sendConfirmationEmail(userEmail, bookingDetails) {
    const mailOptions = {
        from: `"Tattoo Studio" <${process.env.EMAIL_USER}>`,
        to: userEmail,
        subject: "Your Tattoo Appointment is Confirmed! 🎨",
        html: `<p>Your booking is confirmed for:</p>
               <p><strong>Date:</strong> ${bookingDetails.date}</p>
               <p><strong>Time:</strong> ${bookingDetails.time}</p>
               <p><strong>Location:</strong> ${bookingDetails.location}</p>
               <p>See you soon! 🎨</p>`
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log("✅ Confirmation email sent to", userEmail);
    } catch (error) {
        console.error("❌ Error sending confirmation email:", error);
    }
}



// 📌 POST: Book a slot and send confirmation email
router.post("/book", async (req, res) => {
    try {
        console.log("📌 Received booking request:", req.body);

        const { date, time, location, user, project, status } = req.body;
        if (!date || !time || !location || !user) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        // 🟢 Save Booking in MongoDB
        let newBooking = new Booking({ date, time, location, user, project, status: status || "Pending" });
        await newBooking.save();

        console.log("✅ Booking saved:", newBooking);

        // 🟢 DISCUSS PAYMENT OPTION
        {
            await newBooking.save();
            console.log("✅ Booking saved:", newBooking);

            const gifUrl = process.env.DOMAIN
                ? `${process.env.DOMAIN}/public/images/mailgif.gif`
                : "https://bruitssourds.com/public/images/mailgif.gif";



                
            const mailOptionsUser = {
                from: `"Bruits Sourds" <${process.env.EMAIL_USER}>`,
                to: user,
                subject: "📝 Let's Discuss Your Booking",
                html: `
                    <img src="${gifUrl}" alt="Your appointment is booked" width="400">
                    <p>Your slot is booked for:</p>
                    <p><strong>Date:</strong> ${date}</p>
                    <p><strong>Time:</strong> ${time}</p>
                    <p><strong>Location:</strong> ${location}</p>
                    <p><strong>Your Project:</strong> ${project}</p>
                    <p>You will receive a response shortly.</p>
                    
                    
                `
            };

            // 📧 Admin Email
            const mailOptionsAdmin = {
                from: `"Bruits Sourds" <${process.env.EMAIL_USER}>`,
                to: process.env.ADMIN_EMAIL,
                replyTo: user,
                subject: "🆕 New Booking Request",
                html: `
                    <h3>🆕 New Booking Request</h3>
                    <p><strong>Date:</strong> ${date}</p>
                    <p><strong>Time:</strong> ${time}</p>
                    <p><strong>Location:</strong> ${location}</p>
                    <p><strong>User Email:</strong> <a href="mailto:${user}">${user}</a></p>
                    <p><strong>Project Description:</strong> ${project}</p>
                    <p>Reply to this email to respond directly to the user.</p>
                `
            };

            console.log("📧 Sending email to user:", user);
            console.log("📧 Sending email to admin:", process.env.ADMIN_EMAIL);

            try {
                await transporter.sendMail(mailOptionsUser);
                console.log("✅ User email sent!");
                await transporter.sendMail(mailOptionsAdmin);
                console.log("✅ Admin email sent!");
            } catch (error) {
                console.error("❌ Email sending error:", error);
            }

            return res.status(201).json({ message: "Emails sent for discussion first!", newBooking });
        }


    } catch (error) {
        console.error("❌ Booking error:", error);
        return res.status(500).json({ message: "Internal Server Error", error });
    }
});



import { fetchGroupedEvents } from "../googleCalendar.js";

router.get("/slots", async (req, res) => {
    console.log("✅ GET request received at /api/agenda/slots");

    try {
        const bookings = await Booking.find();
        console.log("📌 Current Bookings in MongoDB:", bookings);

        // ✅ Fetch Google Calendar events with "Free/Busy" status
        const googleEvents = await fetchGroupedEvents();
        console.log("📌 Google Calendar Events:", JSON.stringify(googleEvents, null, 2));

        // ✅ Convert Google Calendar events into a lookup table
        let busySlots = new Set();
        Object.keys(googleEvents).forEach(location => {
            googleEvents[location].forEach(event => {
                if (event.status === "Busy") {
                    let key = `${event.date}_${event.time}_${location}`;
                    busySlots.add(key);
                }
            });
        });

        // ✅ Loop through MongoDB bookings and update only if "Busy"
        for (let booking of bookings) {
            let key = `${booking.date}_${booking.time}_${booking.location}`;
        
            if (busySlots.has(key) && booking.status === "Libre") {
                console.log(`🔄 Google says BUSY → Updating ${booking._id} to Reserved`);
                await Booking.updateOne({ _id: booking._id }, { $set: { status: "Reserved", calendarStatus: "Busy" } });
                booking.status = "Reserved";
            } else if (!busySlots.has(key) && booking.calendarStatus === "Busy") {
                let newStatus = booking.user ? "Pending" : "Libre";
                console.log(`🔄 Google now says FREE → Reverting ${booking._id} to ${newStatus}`);
                await Booking.updateOne({ _id: booking._id }, { $set: { status: newStatus, calendarStatus: "Free" } });
                booking.status = newStatus;
            }
        }

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

export default router;