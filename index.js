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

// Helper Delay Function
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper: 5 Mails per batch
const chunkArray = (array, size) => {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
};

// Fast Mail Sending API
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

    // Gmail TLS Port 587 (Fast & Direct)
    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false, // STARTTLS
        auth: {
            user: senderEmail,
            pass: appPassword
        }
    });

    const emailBatches = chunkArray(emailList, 5); // 5 Mails ek sath
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < emailBatches.length; i++) {
        const currentBatch = emailBatches[i];

        const promises = currentBatch.map(recipient => {
            const cleanName = senderName ? senderName.trim() : senderEmail.split('@')[0];

            const mailOptions = {
                from: `"${cleanName}" <${senderEmail}>`,
                to: recipient,
                subject: subject,
                text: message // Standard Plain Text
            };

            return transporter.sendMail(mailOptions)
                .then(() => { successCount++; })
                .catch(err => {
                    console.error(`Failed for ${recipient}:`, err.message);
                    failCount++;
                });
        });

        // Batch ke saare mails ek saath fast execute honge
        await Promise.all(promises);

        // Sirf 1 second ka gap har batch ke baad (Tez speed ke liye)
        if (i < emailBatches.length - 1) {
            await delay(1000); 
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
