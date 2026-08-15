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
    if (req.body.password === ADMIN_PASSWORD) {
        return res.json({ success: true, message: "Login successful" });
    }
    return res.status(401).json({ success: false, message: "Invalid Password" });
});

// Mail Sending API (Simple Setup)
app.post('/api/send-email', async (req, res) => {
    const { senderName, senderEmail, appPassword, subject, message, recipients } = req.body;

    if (!senderEmail || !appPassword || !subject || !message || !recipients) {
        return res.status(400).json({ success: false, message: "Sabhi fields bharna zaroori hai!" });
    }

    const emailList = recipients.split('\n').map(e => e.trim()).filter(Boolean);

    // Simple Transporter
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: senderEmail,
            pass: appPassword
        }
    });

    try {
        // Sabhi emails ek saath bhejne ke liye
        await Promise.all(emailList.map(recipient => 
            transporter.sendMail({
                from: `"${senderName || 'Sender'}" <${senderEmail}>`,
                to: recipient,
                subject: subject,
                text: message
            })
        ));

        return res.json({ success: true, message: "Sabhi mails bhej diye gaye!" });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
