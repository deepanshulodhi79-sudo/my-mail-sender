const express = require('express');
const nodemailer = require('nodemailer');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// Render Environment Variable
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

// Helper: 5-5 Mails Chunk Batching
const chunkArray = (array, size) => {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
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

    // Direct Gmail SMTP via Port 465 (SSL) for High Trust Score
    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true, // SSL Connection
        auth: {
            user: senderEmail,
            pass: appPassword
        },
        tls: {
            rejectUnauthorized: true
        }
    });

    const emailBatches = chunkArray(emailList, 5);
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < emailBatches.length; i++) {
        const currentBatch = emailBatches[i];

        const promises = currentBatch.map(recipient => {
            // Anti-Spam Custom Message-ID Generator
            const domain = senderEmail.split('@')[1] || 'gmail.com';
            const randomBytes = crypto.randomBytes(8).toString('hex');
            const customMessageId = `<${Date.now()}.${randomBytes}@${domain}>`;

            const cleanName = senderName ? senderName.trim() : senderEmail.split('@')[0];

            // Anti-Spam Clean HTML Body Structure
            const formattedHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <style>
                        body { font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #222222; line-height: 1.6; }
                        .content { padding: 10px; }
                        .footer { margin-top: 25px; padding-top: 10px; border-top: 1px solid #eeeeee; font-size: 11px; color: #888888; }
                    </style>
                </head>
                <body>
                    <div class="content">
                        ${message.replace(/\n/g, '<br>')}
                    </div>
                    <div class="footer">
                        <p>Sent to ${recipient}. To unsubscribe or opt-out, please reply to this email.</p>
                    </div>
                </body>
                </html>
            `;

            const mailOptions = {
                from: `"${cleanName}" <${senderEmail}>`,
                to: recipient,
                subject: subject,
                text: message, // Plain text version (Very Important for Spam Filters)
                html: formattedHtml,
                messageId: customMessageId,
                headers: {
                    'X-Mailer': 'Microsoft Outlook 16.0', // Outlook simulation
                    'X-Priority': '3', // Normal Priority
                    'X-MSMail-Priority': 'Normal',
                    'Importance': 'Normal',
                    'MIME-Version': '1.0'
                }
            };

            return transporter.sendMail(mailOptions)
                .then(() => { successCount++; })
                .catch(err => {
                    console.error(`Failed for ${recipient}:`, err.message);
                    failCount++;
                });
        });

        await Promise.all(promises);

        // Batches ke beech 2.5 seconds ka pause
        if (i < emailBatches.length - 1) {
            await delay(2500);
        }
    }

    return res.json({ 
        success: true, 
        message: `Processing Complete! Success: ${successCount}, Failed: ${failCount}` 
    });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
