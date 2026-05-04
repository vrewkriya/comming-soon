require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const path = require('path');
const fs = require('fs'); // Added fs to save to file

const app = express();

// Basic Security Middleware
app.use(express.json({ limit: '10kb' })); // Limit body size
app.use(cors());

// Basic Security Headers (manual implementation of some helmet-like headers)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// Configure Nodemailer with the provided App Password
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// API endpoint for email registration
app.post('/notify', async (req, res) => {
  let { email } = req.body;

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email is required' });
  }

  email = email.trim().toLowerCase();

  // Simple email regex for security
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email) || email.length > 100) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  try {
    // Send a confirmation email to the user who registered
    const emailHtml = `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #08080b; font-family: 'Jost', Arial, sans-serif; color: #f0e8d8;">
  <tr>
    <td align="center" style="padding: 60px 20px;">
      
      <!-- HEADER TEXT -->
      <table cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center" style="font-family: 'Cormorant Garamond', serif; font-size: 26px; color: #e0c98a; padding-bottom: 10px;">
            Hi Subscriber,
          </td>
        </tr>
        <tr>
          <td align="center" style="font-size: 14px; color: #c9a96e; letter-spacing: 0.5px; padding-bottom: 40px;">
            You are officially on the list.
          </td>
        </tr>
      </table>

      <!-- GMAIL-OPTIMIZED CARD (Using Tables instead of Divs, no absolute pos) -->
      <table width="320" cellpadding="0" cellspacing="0" border="0" style="background-color: #111016; border: 2px solid #c9a96e; border-radius: 12px; margin: 0 auto; max-width: 320px;">
        <tr>
          <td style="padding: 6px;">
            
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border: 1px solid #786440; border-radius: 8px;">
              <!-- TOP CORNER (V) -->
              <tr>
                <td align="left" valign="top" style="padding: 15px 0 0 15px; font-family: 'Cormorant Garamond', serif; color: #c9a96e; font-size: 14px;">
                  V
                </td>
                <td width="20"></td>
              </tr>
              
              <!-- CENTER CONTENT -->
              <tr>
                <td colspan="2" align="center" style="padding: 20px 30px;">
                  <div style="font-family: 'Cormorant Garamond', serif; font-size: 56px; color: #e0c98a; margin-bottom: 20px; line-height: 1;">V</div>
                  <div style="font-family: 'Cormorant Garamond', serif; font-size: 22px; color: #e0c98a; margin-bottom: 15px; letter-spacing: 1.5px;">The Studio Awakens.</div>
                  <div style="font-size: 13px; color: #c9a96e; line-height: 1.8; letter-spacing: 1px;">
                    Something extraordinary is being crafted. We will notify you the exact moment our doors open.
                  </div>
                </td>
              </tr>
              
              <!-- BOTTOM CORNER (K) -->
              <tr>
                <td width="20"></td>
                <td align="right" valign="bottom" style="padding: 0 15px 15px 0; font-family: 'Cormorant Garamond', serif; color: #c9a96e; font-size: 14px;">
                  K
                </td>
              </tr>
            </table>

          </td>
        </tr>
      </table>

      <!-- REGARDS & SOCIALS -->
      <table cellpadding="0" cellspacing="0" border="0" style="margin-top: 45px;">
        <tr>
          <td align="center" style="font-family: 'Cormorant Garamond', serif; font-style: italic; font-size: 16px; color: #c9a96e; padding-bottom: 20px;">
            Regards,<br>Team VrewKriya
          </td>
        </tr>
        <tr>
          <td align="center" style="border-top: 1px solid #4a3e28; padding-top: 20px;">
            <a href="https://instagram.com/vrewkriya" style="color: #8a7e6e; text-decoration: none; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; margin: 0 10px;">Instagram</a>
            <span style="color: #4a3e28;">|</span>
            <a href="https://behance.net/vrewkriya" style="color: #8a7e6e; text-decoration: none; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; margin: 0 10px;">Behance</a>
            <span style="color: #4a3e28;">|</span>
            <a href="https://www.linkedin.com/in/vrewkriya-lab-4602683bb" style="color: #8a7e6e; text-decoration: none; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; margin: 0 10px;">LinkedIn</a>
          </td>
        </tr>
      </table>
      
    </td>
  </tr>
</table>
`;

    const mailOptions = {
      from: `VrewKriya <${process.env.EMAIL_USER}>`,
      to: email, // The user's email
      subject: 'VrewKriya - You are on the list',
      html: emailHtml
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent: ' + info.response);

    // 1. Save email to a local CSV backup (guarantees data is never lost)
    const csvLine = '"' + email + '", "' + new Date().toISOString() + '"\n';
    fs.appendFile(path.join(__dirname, 'subscribers.csv'), csvLine, (err) => {
      if (err) console.error('Failed to save to CSV backup:', err);
    });

    // 2. Save email to Google Sheets via Apps Script Webhook
    if (process.env.GOOGLE_SCRIPT_URL) {
      try {
        const response = await fetch(process.env.GOOGLE_SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email, date: new Date().toISOString() })
        });

        if (!response.ok) {
          console.error('Google Sheets Error:', response.status, response.statusText);
        }
      } catch (err) {
        console.error('Failed to contact Google Sheets Webhook:', err);
      }
    }

    // Optional: notify yourself as well
    /*
    await transporter.sendMail({
       from: 'VrewKriya <vrewkriya@email.com>',
       to: 'vrewkriya@email.com',
       subject: 'New Registration: ' + email,
       text: 'A new user registered: ' + email
    });
    */

    res.status(200).json({ message: 'Email sent successfully' });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

// Fallback to index.html for any other requests (SPA behavior / good practice)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server (only locally, Vercel will export the app instead)
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server is successfully running on http://localhost:${PORT}`);
  });
}

// Export the Express API for Vercel
module.exports = app;

