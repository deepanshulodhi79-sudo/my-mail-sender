const express = require('express');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Render Environment Variable se password aayega (fallback: "ChangeMe123!")
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

// Mail Sending API (Spam protection ke saath individual sending)
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

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: senderEmail,
            pass: appPassword
        }
    });

    let successCount = 0;
    let failCount = 0;

    // Loop chala kar ek-ek recipient ko alag mail bhejna (Inbox placement badhane ke liye)
    for (const recipient of emailList) {
        try {
            const mailOptions = {
                from: `"${senderName}" <${senderEmail}>`,
                to: recipient,
                subject: subject,
                text: message,
                html: `<p>${message.replace(/\n/g, '<br>')}</p>`
            };

            await transporter.sendMail(mailOptions);
            successCount++;

            // Gmail rate-limiting & spam trigger se bachne ke liye 1 second ka gap
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (err) {
            console.error(`Failed to send to ${recipient}:`, err.message);
            failCount++;
        }
    }

    return res.json({ 
        success: true, 
        message: `Sending Complete! Success: ${successCount}, Failed: ${failCount}` 
    });
});

// Default Route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
