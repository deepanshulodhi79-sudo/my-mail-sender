const express = require('express');
const nodemailer = require('nodemailer');
const path = require('path');

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

    let successCount = 0;
    let failCount = 0;

    // Direct Transporter Setup
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: senderEmail,
            pass: appPassword
        }
    });

    const cleanName = senderName ? senderName.trim() : senderEmail.split('@')[0];

    // Speed + Inboxing Balanced Loop
    for (let i = 0; i < emailList.length; i++) {
        const recipient = emailList[i];

        const mailOptions = {
            from: `"${cleanName}" <${senderEmail}>`,
            to: recipient,
            subject: subject,
            text: message
        };

        try {
            await transporter.sendMail(mailOptions);
            successCount++;
            console.log(`[✓] Sent to ${recipient}`);
        } catch (err) {
            console.error(`[X] Failed for ${recipient}:`, err.message);
            failCount++;
        }

        // Sirf 1.5 se 2 second ka gap — na zyada slow, na anti-spam trigger
        if (i < emailList.length - 1) {
            await delay(1500);
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
