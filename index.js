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

// Transporter Instance Outside Request Handler (Re-use Connections)
const createTransporter = (user, pass) => {
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: user,
            pass: pass
        },
        pool: true, // Connection pooling reuse ke liye
        maxConnections: 3,
        maxMessages: 100
    });
};

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

    const transporter = createTransporter(senderEmail, appPassword);
    const cleanName = senderName ? senderName.trim() : senderEmail.split('@')[0];

    let successCount = 0;
    let failCount = 0;

    // Async execution response background me process karne ke liye
    res.json({ 
        success: true, 
        message: `Email dispatch process shuru ho gaya hai ${emailList.length} recipients ke liye.` 
    });

    for (let i = 0; i < emailList.length; i++) {
        const recipient = emailList[i];

        const mailOptions = {
            from: `"${cleanName}" <${senderEmail}>`,
            to: recipient,
            subject: subject,
            text: message,
            // HTML Version inbox delivery improve karta hai
            html: `<div style="font-family: Arial, sans-serif; line-height: 1.6;">${message.replace(/\n/g, '<br>')}</div>`,
            headers: {
                'X-Priority': '3',
                'X-MSMail-Priority': 'Normal',
                'Importance': 'Normal'
            }
        };

        try {
            await transporter.sendMail(mailOptions);
            successCount++;
            console.log(`[✓] Sent to ${recipient}`);
        } catch (err) {
            console.error(`[X] Failed for ${recipient}:`, err.message);
            failCount++;
        }

        // Delay between mails to prevent anti-spam triggers (2-3 seconds)
        if (i < emailList.length - 1) {
            await delay(2500);
        }
    }

    console.log(`[Complete] Total Success: ${successCount}, Total Failed: ${failCount}`);
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
