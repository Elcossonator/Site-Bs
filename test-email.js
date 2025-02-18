require("dotenv").config();
const nodemailer = require("nodemailer");

// ✅ Create Transporter
const transporter = nodemailer.createTransport({
    service: "gmail", // If using another provider, change this
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// ✅ Send Test Email
const mailOptions = {
    from: process.env.EMAIL_USER,
    to: "your-email@example.com", // Replace with your email
    subject: "Test Email from Node.js",
    text: "If you receive this, your email setup works!"
};

transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
        console.error("❌ Email Error:", error);
    } else {
        console.log("✅ Email sent:", info.response);
    }
});