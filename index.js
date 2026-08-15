const express = require('express');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "!!";

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Login API
app.post('/api/login', (req, res) => {
    if (req.body.password === ADMIN_PASSWORD) {
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

    const emailList = recipients.split('\n').map(e => e.trim()).filter(Boolean);

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: senderEmail,
            pass: appPassword
        }
    });

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < emailList.length; i++) {
        const recipient = emailList[i];
        
        // Spam bypass: Har mail me unique tracking ID
        const uniqueId = Math.random().toString(36).substring(7);

        try {
            await transporter.sendMail({
                from: `"${senderName || 'Sender'}" <${senderEmail}>`,
                to: recipient,
                subject: subject,
                text: `${message}\n\nRef: #${uniqueId}`,
                html: `
                    <div style="font-family: Arial, sans-serif; font-size: 14px; color: #222; line-height: 1.5;">
                        <p>${message.replace(/\n/g, '<br>')}</p>
                        <br>
                        <span style="color: #999; font-size: 10px;">Ref ID: ${uniqueId}</span>
                    </div>
                `
            });
            successCount++;
            console.log(`[✓] Sent to: ${recipient}`);
        } catch (err) {
            failCount++;
            console.error(`[X] Error: ${recipient}`, err.message);
        }

        // 1-second safe gap
        if (i < emailList.length - 1) {
            await delay(1000);
        }
    }

    return res.json({
        success: true,
        message: `Process complete! Success: ${successCount}, Failed: ${failCount}`
    });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
