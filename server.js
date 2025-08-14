// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const twilio = require('twilio');

const app = express();
app.use(cors({ origin: 'https://your-frontend-domain.com' }));
app.use(express.json());

// Configure nodemailer (use your SMTP credentials)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
    }
});

// Configure Twilio (use your Twilio credentials)
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const twilioFrom = process.env.TWILIO_FROM; // Your Twilio phone number

app.post('/api/send-announcement', async (req, res) => {
    const { title, message, emails, phones } = req.body;

    // Send emails
    let emailSuccess = true;
    try {
        if (emails && emails.length > 0) {
            await transporter.sendMail({
                from: '"Church Announcement" <your_gmail@gmail.com>',
                to: emails.join(','),
                subject: `[Announcement] ${title}`,
                text: message,
                html: `<h3>${title}</h3><p>${message}</p>`
            });
        }
    } catch (err) {
        emailSuccess = false;
        console.error('Email error:', err);
    }

    // Send SMS (optional, Twilio charges apply)
    let smsSuccess = true;
    try {
        if (phones && phones.length > 0) {
            await Promise.all(phones.map(phone => {
                let formatted = phone.trim();

                // Convert PH numbers like 09xxxxxxxxx to +639xxxxxxxxx
                if (/^09\d{9}$/.test(formatted)) {
                    formatted = '+63' + formatted.slice(1);
                }
                // Optionally, skip invalid numbers
                if (!/^\+\d{10,15}$/.test(formatted)) {
                    console.log(`Skipping invalid phone number: ${phone}`);
                    return Promise.resolve();
                }
                return twilioClient.messages.create({
                    body: `${title}: ${message}`,
                    from: twilioFrom,
                    to: formatted
                });
            }));
        }
    } catch (err) {
        smsSuccess = false;
        console.error('SMS error:', err);
    }

    if (emailSuccess && smsSuccess) {
        res.status(200).json({ success: true });
    } else {
        res.status(500).json({ success: false, emailSuccess, smsSuccess });
    }
});

app.listen(3000, () => {
    console.log('Announcement server running on http://localhost:3000');
});

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM = process.env.TWILIO_FROM;