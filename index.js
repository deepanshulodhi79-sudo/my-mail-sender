const express = require('express');
const nodemailer = require('nodemailer');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "!!";

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Login API
app.post('/api/login', (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
        return res.json({ success: true, message: "Login successful" });
    }
    return res.status(401).json({ success: false, message: "Invalid Password" });
});

// Random Delay Generator (Insaan jaisa timing pattern banane ke liye)
const getRandomDelay = (minMs, maxMs) => {
    return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Mail Sending API
app.post('/api/send-email', async (req, res) => {
    const { senderName, senderEmail, appPassword, subject, message, recipients } = req.body;

    if (!senderEmail || !appPassword || !subject || !message || !recipients) {
        return res.status(400).json({ success: false, message: "Sabhi fields bharna zaroori hai!" });
    }

    const emailList = recipients
        .split('\n')
        .map(e => e.trim())
        .filter(e => e.length > 0);

    if (emailList.length === 0) {
        return res.status(400).json({ success: false, message: "Kam se kam ek recipient email dalein." });
    }

    // Standard Gmail Port 587 (TLS - High Reputation Connection)
    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false, // STARTTLS
        auth: {
            user: senderEmail,
            pass: appPassword
        }
    });

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < emailList.length; i++) {
        const recipient = emailList[i];
        const cleanName = senderName ? senderName.trim() : senderEmail.split('@')[0];

        // Unique tracking string (Content duplicate detection se bachne ke liye)
        const uniqueId = crypto.randomBytes(3).toString('hex');
        const finalMessage = `${message}\n\nRef: #${uniqueId}`;

        const mailOptions = {
            from: `"${cleanName}" <${senderEmail}>`,
            to: recipient,
            subject: subject,
            text: finalMessage
        };

        try {
            await transporter.sendMail(mailOptions);
            successCount++;
            console.log(`[+] Sent to ${recipient}`);
        } catch (err) {
            console.error(`[-] Failed for ${recipient}:`, err.message);
            failCount++;
        }

        // Agar aage aur mails hain, toh 3 se 6 second ka random delay do
        if (i < emailList.length - 1) {
            const waitTime = getRandomDelay(3000, 6000); // 3-6 sec random gap
            await delay(waitTime);
        }
    }

    return res.json({ 
        success: true, 
        message: `Complete! Success: ${successCount}, Failed: ${failCount}` 
    });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
