const express = require('express');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Render Environment Password
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "ChangeMe123!";

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Login Route
app.post('/api/login', (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
        return res.json({ success: true, message: "Login successful" });
    }
    return res.status(401).json({ success: false, message: "Invalid Password" });
});

// Helper Delay Function
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Normal Gmail Mail Sender Route
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

    // Direct Gmail SMTP via Port 465 (SSL) - Better Inbox Trust Score
    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true, // SSL/TLS
        auth: {
            user: senderEmail,
            pass: appPassword
        }
    });

    let successCount = 0;
    let failCount = 0;

    for (const recipient of emailList) {
        try {
            const cleanName = senderName ? senderName.trim() : senderEmail.split('@')[0];
            
            const mailOptions = {
                from: `"${cleanName}" <${senderEmail}>`,
                to: recipient,
                subject: subject,
                text: message,
                html: `
                    <div style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #333333; line-height: 1.5;">
                        ${message.replace(/\n/g, '<br>')}
                    </div>
                `,
                headers: {
                    'X-Mailer': 'Microsoft Outlook', // Trusted client header simulation
                    'Importance': 'normal'
                }
            };

            await transporter.sendMail(mailOptions);
            successCount++;

            // Natural 1-second gap to pass Google automated rate limits
            await delay(1000); 

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

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
