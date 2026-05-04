require('dotenv').config();
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const csvPath = path.join(__dirname, 'subscribers.csv');

if (!fs.existsSync(csvPath)) {
    console.error('No subscribers.csv found. Nobody has subscribed yet.');
    process.exit(1);
}

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const content = fs.readFileSync(csvPath, 'utf8');
const lines = content.split('\n').map(l => l.trim()).filter(Boolean);

const uniqueEmails = [...new Set(lines.map(line => {
    // extract email from "email","date" format
    return line.split(',')[0].replace(/"/g, '').trim();
}))];

console.log(`Found ${uniqueEmails.length} unique subscribers. Sending launch emails...`);

const launchHtml = `
<div style="background-color: #08080b; padding: 50px 20px; font-family: 'Jost', sans-serif; color: #f0e8d8;">
    <table width="100%" align="center" style="max-width: 400px; margin: 0 auto; background-color: #111016; border-radius: 8px; border: 1.2px solid rgba(201,169,110,0.8); box-shadow: 0 16px 40px rgba(201,169,110,0.2); border-collapse: collapse;">
        <tr>
            <td style="padding: 40px; text-align: center; background-image: linear-gradient(rgba(201,169,110,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(201,169,110,0.08) 1px, transparent 1px); background-size: 15px 15px;">
                
                <div style="font-family: 'Cormorant Garamond', serif; font-size: 32px; font-weight: 400; color: #e0c98a; letter-spacing: 2px; margin-bottom: 20px;">
                    VrewKriya
                </div>

                <div style="margin: 30px 0;">
                    <h2 style="font-family: 'Cormorant Garamond', serif; font-size: 28px; font-weight: 300; line-height: 1.4; color: #fff; margin-bottom: 20px;">
                        The Studio is Live.
                    </h2>
                    <p style="font-size: 14px; letter-spacing: 1px; color: #c9a96e; line-height: 1.6; margin-bottom: 30px;">
                        The wait is over.<br>
                        Discover what we've been crafting.
                    </p>
                    
                    <a href="https://vrewkriya.com" style="display: inline-block; background-color: #c9a96e; color: #08080b; text-decoration: none; padding: 12px 30px; font-size: 14px; font-weight: 600; letter-spacing: 2px; border-radius: 4px; text-transform: uppercase;">
                        Visit Studio
                    </a>
                </div>
                
            </td>
        </tr>
    </table>
</div>
`;

async function notifyAll() {
    for (let email of uniqueEmails) {
        if(!email) continue;
        try {
            await transporter.sendMail({
                from: `VrewKriya <${process.env.EMAIL_USER}>`,
                to: email,
                subject: 'VrewKriya is officially Live.',
                html: launchHtml
            });
            console.log('? Sent launch notification to: ' + email);
        } catch(e) {
            console.error('? Failed to send to: ' + email, e.message);
        }
    }
    console.log('All emails processed!');
}

notifyAll();
