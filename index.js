const express = require('express');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

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

// Helper: Micro Delay for Human-like Sending Pattern
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Fast & Anti-Spam Mail Sending Route
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

    // SMTP Transporter
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: senderEmail,
            pass: appPassword
        },
        pool: true,
        maxConnections: 3,
        maxMessages: 50
    });

    let successCount = 0;
    let failCount = 0;

    for (const recipient of emailList) {
        try {
            // Anti-Spam HTML Formatting
            const formattedHtml = `
                <div style="font-family: Arial, sans-serif; font-size: 15px; color: #222; line-height: 1.6;">
                    ${message.replace(/\n/g, '<br>')}
                    <br><br>
                    <hr style="border: none; border-top: 1px solid #eee; margin-top: 20px;" />
                    <p style="font-size: 11px; color: #888;">
                        This email was sent to ${recipient}. If you no longer wish to receive these, please reply with "Unsubscribe".
                    </p>
                </div>
            `;

            const mailOptions = {
                from: `"${senderName}" <${senderEmail}>`,
                to: recipient,
                subject: subject,
                text: message,
                html: formattedHtml,
                headers: {
                    'X-Priority': '3', // Normal Priority (High Priority flags spam)
                    'X-Mailer': 'Nodemailer'
                }
            };

            await transporter.sendMail(mailOptions);
            successCount++;

            // 250ms Ka micro delay — human behavior imitate karne ke liye
            await delay(250); 
        } catch (err) {
            console.error(`Failed for ${recipient}:`, err.message);
            failCount++;
        }
    }

    transporter.close();

    return res.json({ 
        success: true, 
        message: `Mails processed! Success: ${successCount}, Failed: ${failCount}` 
    });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
