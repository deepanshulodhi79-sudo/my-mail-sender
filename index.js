const express = require('express');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Render Environment Variable password
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "ChangeMe123!";

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

// Array ko 5-5 ke chunks me todne wala helper
const chunkArray = (array, size) => {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
};

// Mail Sending API (Batching Strategy)
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

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: senderEmail,
            pass: appPassword
        }
    });

    // Email list ko 5-5 ke batches me divide karna
    const emailBatches = chunkArray(emailList, 5);
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < emailBatches.length; i++) {
        const currentBatch = emailBatches[i];

        // Batch ke 5 mails ko ek sath parallel bhejenge
        const promises = currentBatch.map(recipient => {
            const mailOptions = {
                from: `"${senderName || senderEmail}" <${senderEmail}>`,
                to: recipient, // Har recipient ko alag mail (No BCC)
                subject: subject,
                text: message,
                html: `<p>${message.replace(/\n/g, '<br>')}</p>`
            };

            return transporter.sendMail(mailOptions)
                .then(() => { successCount++; })
                .catch(err => {
                    console.error(`Failed for ${recipient}:`, err.message);
                    failCount++;
                });
        });

        await Promise.all(promises);

        // Agar aur batches baaki hain, toh agle batch se pehle 3 second ka pause
        if (i < emailBatches.length - 1) {
            await delay(3000); // 3 seconds pause
        }
    }

    return res.json({ 
        success: true, 
        message: `Sending Complete! Success: ${successCount}, Failed: ${failCount}` 
    });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
