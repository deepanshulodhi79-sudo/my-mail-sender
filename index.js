const express = require('express');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Render Environment Variable se password aayega (Default fallback provided)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "ChangeMe123!";

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Login API Check
app.post('/api/login', (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
        return res.json({ success: true, message: "Login successful" });
    }
    return res.status(401).json({ success: false, message: "Invalid Password" });
});

// Mail Sending API
app.post('/api/send-email', async (req, res) => {
    const { senderName, senderEmail, appPassword, subject, message, recipients } = req.body;

    if (!senderEmail || !appPassword || !subject || !message || !recipients) {
        return res.status(400).json({ success: false, message: "Sabhi fields bharna zaroori hai!" });
    }

    // Line-by-line emails extract karna
    const emailList = recipients
        .split('\n')
        .map(e => e.trim())
        .filter(e => e.length > 0);

    if (emailList.length === 0) {
        return res.status(400).json({ success: false, message: "Kam se kam ek recipient email dalein." });
    }

    // SMTP Transporter setup (Gmail)
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: senderEmail,
            pass: appPassword
        }
    });

    try {
        const mailOptions = {
            from: `"${senderName || senderEmail}" <${senderEmail}>`,
            bcc: emailList,
            subject: subject,
            text: message
        };

        await transporter.sendMail(mailOptions);
        return res.json({ success: true, message: `${emailList.length} recipients ko mail bhej diya gaya!` });
    } catch (error) {
        console.error("Mail Error:", error);
        return res.status(500).json({ success: false, message: "Mail bhejne me error aaya: " + error.message });
    }
});

// Default route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
