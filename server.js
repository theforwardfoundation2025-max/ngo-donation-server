require('dotenv').config();
const express = require('express');
const crypto  = require('crypto');
const fetch   = require('node-fetch');
const app     = express();

app.use(express.raw({ type: 'application/json' }));

app.post('/webhook/razorpay', async (req, res) => {
  const secret    = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature = req.headers['x-razorpay-signature'];
  const expected  = crypto.createHmac('sha256', secret)
                          .update(req.body).digest('hex');

  if (expected !== signature) return res.status(400).send('Invalid');

  const event = JSON.parse(req.body);
  if (event.event !== 'payment.captured') return res.status(200).send('Ignored');

  const p = event.payload.payment.entity;

  console.log('=== PAYMENT RECEIVED ===');
  console.log('notes:', JSON.stringify(p.notes));

  const email   = p.email;
  const name    = p.notes?.['donor_full_name']     || p.notes?.['Donor Full Name']     || p.notes?.['name']    || 'Valued Donor';
  const pan     = p.notes?.['pan_for_tax_benefit'] || p.notes?.['PAN for Tax Benefit'] || p.notes?.['pan']     || 'N/A';
  const purpose = p.notes?.['purpose']             || p.notes?.['Purpose']             || 'General Donation';
  const amount  = (p.amount / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 });
  const payId   = p.id;
  const date    = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  const receiptNum = 'TFF-' + new Date().getFullYear() + '-' + payId;

  console.log('Extracted:', { email, name, pan, purpose, amount, payId, receiptNum });

  await sendEmail({ email, name, pan, purpose, amount, payId, date, receiptNum });
  res.status(200).send('OK');
});

async function sendEmail(d) {

  // ── REPLACE THESE TWO URLS WITH YOUR ACTUAL HOSTED IMAGE URLS ──
  const LOGO_URL = 'https://theforwardfoundation.org/images/logo.png';
  const BG_URL   = 'https://theforwardfoundation.org/images/background.png';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Donation Acknowledgement - The Forward Foundation</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,700&family=Poppins:wght@300;400;500;600&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background-color:#f0f4f0;font-family:'Poppins',Arial,sans-serif;">

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f4f0;padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.10);">

  <!-- HEADER -->
  <tr>
    <td align="center" style="background:linear-gradient(160deg,#14382A 0%,#1e5c35 45%,#2e7d32 100%);padding:44px 32px 36px;">
      <img src="https://theforwardfoundation.org/images/logo.png" alt="The Forward Foundation" width="200" style="display:block;margin:0 auto 14px;max-width:200px;">
      <div style="font-family:'Poppins',Arial,sans-serif;font-size:11px;color:rgba(255,255,255,0.65);letter-spacing:3px;text-transform:uppercase;">LIVE &nbsp;|&nbsp; DEVELOP &nbsp;|&nbsp; SUSTAIN</div>
    </td>
  </tr>

  <!-- THANK YOU -->
  <tr>
    <td align="center" style="background:#ffffff;padding:40px 40px 20px;">
      <div style="font-family:'Playfair Display',Georgia,serif;font-size:30px;font-weight:700;color:#1a3d22;line-height:1.2;margin-bottom:4px;">Thank You for Your</div>
      <div style="font-family:'Playfair Display',Georgia,serif;font-size:30px;font-weight:700;font-style:italic;color:#2e7d32;line-height:1.3;margin-bottom:16px;">Generous Donation!</div>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 14px;">
        <tr>
          <td style="width:60px;height:1px;background:linear-gradient(to right,transparent,#b5d5b7);"></td>
          <td style="padding:0 10px;color:#6aa84f;font-size:14px;">&#9827;</td>
          <td style="width:60px;height:1px;background:linear-gradient(to left,transparent,#b5d5b7);"></td>
        </tr>
      </table>
      <div style="font-family:'Poppins',Arial,sans-serif;font-size:14px;color:#555;line-height:1.6;">Your contribution helps us Live, Develop and Sustain communities.</div>
    </td>
  </tr>

  <!-- GREETING + BACKGROUND IMAGE COMBINED -->
  <!-- Using background-image on the TD — most email-client compatible method -->
  <tr>
    <td style="padding:0;font-size:0;line-height:0;">

      <!-- TOP WHITE FADE -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="height:30px;background:linear-gradient(to bottom,#ffffff 0%,rgba(255,255,255,0.0) 100%);font-size:0;line-height:0;"></td>
        </tr>
      </table>

      <!-- GREETING CARD ON TOP OF BG — use nested table with background-image on outer td -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
             background="https://theforwardfoundation.org/images/background.png"
             style="background-image:url('https://theforwardfoundation.org/images/background.png');background-size:cover;background-position:center center;background-repeat:no-repeat;">
        <tr>
          <!-- Semi-transparent green overlay layer -->
          <td style=padding:32px 40px;">

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                   style="background-color:rgba(228, 222, 222, 0.75);border-left:4px solid #2e7d32;border-radius:0 12px 12px 0;box-shadow:0 2px 16px rgba(46,125,50,0.10);">
              <tr>
                <td style="padding:24px 28px;">
                  <div style="font-family:'Poppins',Arial,sans-serif;font-size:15px;font-weight:700;color:#1a3d22;margin-bottom:12px;">Dear ${d.name},</div>
                  <div style="font-family:'Poppins',Arial,sans-serif;font-size:14px;font-weight:800;color:#2d4a2d;line-height:1.8;">
                    We are deeply grateful for your generous contribution to The Forward Foundation.<br>
                    Your support directly powers our mission of protecting water, planting trees, and uplifting communities across India.
                  </div>
                </td>
              </tr>
            </table>

          </td>
        </tr>
      </table>

      <!-- BOTTOM WHITE FADE -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="height:30px;background:linear-gradient(to top,#ffffff 0%,rgba(255,255,255,0.0) 100%);font-size:0;line-height:0;"></td>
        </tr>
      </table>

    </td>
  </tr>

  <!-- RECEIPT CARD -->
  <tr>
    <td style="background:#ffffff;padding:0 32px 28px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #d8ead8;border-radius:14px;overflow:hidden;box-shadow:0 4px 20px rgba(46,125,50,0.08);">

        <!-- Receipt header pill -->
        <tr>
          <td colspan="2" align="center" style="background:linear-gradient(135deg,#2e7d32,#388e3c);padding:14px 20px;">
            <span style="display:inline-block;background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.3);border-radius:100px;padding:6px 20px;font-family:'Poppins',Arial,sans-serif;font-size:11px;font-weight:600;color:#ffffff;letter-spacing:2px;text-transform:uppercase;">
              &#128221; DONATION ACKNOWLEDGEMENT RECEIPT
            </span>
          </td>
        </tr>

        <!-- Receipt Number -->
        <tr>
          <td style="padding:13px 20px;font-family:'Poppins',Arial,sans-serif;font-size:12px;color:#666;vertical-align:middle;border-bottom:1px solid #eef5ee;">
            <span style="display:inline-block;width:28px;height:28px;background:#f0f9f0;border-radius:6px;text-align:center;line-height:28px;margin-right:10px;">&#35;</span>Receipt Number
          </td>
          <td align="right" style="padding:13px 20px;font-family:'Courier New',monospace;font-size:11px;color:#222;vertical-align:middle;border-bottom:1px solid #eef5ee;">${d.receiptNum}</td>
        </tr>

        <!-- Payment ID -->
        <tr style="background:#fafcfa;">
          <td style="padding:13px 20px;font-family:'Poppins',Arial,sans-serif;font-size:12px;color:#666;vertical-align:middle;border-bottom:1px solid #eef5ee;">
            <span style="display:inline-block;width:28px;height:28px;background:#f0f9f0;border-radius:6px;text-align:center;line-height:28px;margin-right:10px;">&#128179;</span>Payment ID
          </td>
          <td align="right" style="padding:13px 20px;font-family:'Courier New',monospace;font-size:11px;color:#222;vertical-align:middle;border-bottom:1px solid #eef5ee;">${d.payId}</td>
        </tr>

        <!-- Date -->
        <tr>
          <td style="padding:13px 20px;font-family:'Poppins',Arial,sans-serif;font-size:12px;color:#666;vertical-align:middle;border-bottom:1px solid #eef5ee;">
            <span style="display:inline-block;width:28px;height:28px;background:#f0f9f0;border-radius:6px;text-align:center;line-height:28px;margin-right:10px;">&#128197;</span>Date
          </td>
          <td align="right" style="padding:13px 20px;font-family:'Poppins',Arial,sans-serif;font-size:12px;color:#222;vertical-align:middle;border-bottom:1px solid #eef5ee;">${d.date}</td>
        </tr>

        <!-- Donor Name -->
        <tr style="background:#fafcfa;">
          <td style="padding:13px 20px;font-family:'Poppins',Arial,sans-serif;font-size:12px;color:#666;vertical-align:middle;border-bottom:1px solid #eef5ee;">
            <span style="display:inline-block;width:28px;height:28px;background:#f0f9f0;border-radius:6px;text-align:center;line-height:28px;margin-right:10px;">&#128100;</span>Donor Name
          </td>
          <td align="right" style="padding:13px 20px;font-family:'Poppins',Arial,sans-serif;font-size:12px;font-weight:600;color:#222;vertical-align:middle;border-bottom:1px solid #eef5ee;">${d.name}</td>
        </tr>

        <!-- Email -->
        <tr>
          <td style="padding:13px 20px;font-family:'Poppins',Arial,sans-serif;font-size:12px;color:#666;vertical-align:middle;border-bottom:1px solid #eef5ee;">
            <span style="display:inline-block;width:28px;height:28px;background:#f0f9f0;border-radius:6px;text-align:center;line-height:28px;margin-right:10px;">&#9993;</span>Email
          </td>
          <td align="right" style="padding:13px 20px;vertical-align:middle;border-bottom:1px solid #eef5ee;">
            <a href="mailto:${d.email}" style="color:#2e7d32;text-decoration:none;font-family:'Poppins',Arial,sans-serif;font-size:12px;">${d.email}</a>
          </td>
        </tr>

        <!-- PAN Number -->
        <tr style="background:#fafcfa;">
          <td style="padding:13px 20px;font-family:'Poppins',Arial,sans-serif;font-size:12px;color:#666;vertical-align:middle;border-bottom:1px solid #eef5ee;">
            <span style="display:inline-block;width:28px;height:28px;background:#f0f9f0;border-radius:6px;text-align:center;line-height:28px;margin-right:10px;">&#128196;</span>PAN Number
          </td>
          <td align="right" style="padding:13px 20px;font-family:'Courier New',monospace;font-size:12px;font-weight:600;color:#222;vertical-align:middle;border-bottom:1px solid #eef5ee;">${d.pan}</td>
        </tr>

        <!-- Purpose -->
        <tr>
          <td style="padding:13px 20px;font-family:'Poppins',Arial,sans-serif;font-size:12px;color:#666;vertical-align:middle;border-bottom:1px solid #eef5ee;">
            <span style="display:inline-block;width:28px;height:28px;background:#f0f9f0;border-radius:6px;text-align:center;line-height:28px;margin-right:10px;">&#127919;</span>Purpose
          </td>
          <td align="right" style="padding:13px 20px;font-family:'Poppins',Arial,sans-serif;font-size:12px;color:#222;vertical-align:middle;border-bottom:1px solid #eef5ee;">${d.purpose}</td>
        </tr>

        <!-- 80G Registration -->
        <tr style="background:#fafcfa;">
          <td style="padding:13px 20px;font-family:'Poppins',Arial,sans-serif;font-size:12px;color:#666;vertical-align:middle;border-bottom:1px solid #eef5ee;">
            <span style="display:inline-block;width:28px;height:28px;background:#f0f9f0;border-radius:6px;text-align:center;line-height:28px;margin-right:10px;font-size:10px;font-weight:700;color:#2e7d32;">80G</span>80G Registration No.
          </td>
          <td align="right" style="padding:13px 20px;font-family:'Courier New',monospace;font-size:12px;color:#222;vertical-align:middle;border-bottom:1px solid #eef5ee;">YOUR-80G-NUMBER-HERE</td>
        </tr>

        <!-- Amount -->
        <tr>
          <td style="padding:18px 20px;background:#e8f5e8;font-family:'Poppins',Arial,sans-serif;font-size:14px;font-weight:700;color:#1a5c1e;vertical-align:middle;">
            <span style="display:inline-block;width:28px;height:28px;background:rgba(46,125,50,0.15);border-radius:6px;text-align:center;line-height:28px;margin-right:10px;">&#128181;</span>Amount Donated
          </td>
          <td align="right" style="padding:18px 20px;background:#e8f5e8;font-family:'Poppins',Arial,sans-serif;font-size:20px;font-weight:700;color:#1a5c1e;vertical-align:middle;">INR ${d.amount}</td>
        </tr>

      </table>
    </td>
  </tr>

  <!-- TAX INFO -->
  <tr>
    <td style="background:#ffffff;padding:0 32px 28px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#f0f9f0,#e8f5e8);border:1px solid #c8e6c9;border-radius:12px;">
        <tr>
          <td style="padding:18px 20px;vertical-align:top;width:44px;">
            <div style="width:38px;height:38px;background:#2e7d32;border-radius:50%;text-align:center;line-height:38px;font-size:16px;color:white;">&#9432;</div>
          </td>
          <td style="padding:18px 20px 18px 0;">
            <div style="font-family:'Poppins',Arial,sans-serif;font-size:13px;font-weight:600;color:#1a5c1e;margin-bottom:6px;">80G Tax Exemption</div>
            <div style="font-family:'Poppins',Arial,sans-serif;font-size:12px;color:#2e5c2e;line-height:1.7;">
              This donation is eligible for tax deduction under <strong>Section 80G</strong> of the Income Tax Act, 1961.<br>
              Your official 80G receipt will be issued before <strong>30 April</strong> of the following financial year.
            </div>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- IMPACT -->
  <tr>
    <td style="background:#ffffff;padding:0 32px 36px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
        <tr><td style="height:1px;background:linear-gradient(to right,transparent,#c8e6c9,transparent);"></td></tr>
      </table>
      <div style="text-align:center;margin-bottom:6px;">
        <span style="font-family:'Poppins',Arial,sans-serif;font-size:10px;font-weight:600;letter-spacing:3px;color:#6aa84f;text-transform:uppercase;">Making a Difference</span>
      </div>
      <div style="font-family:'Playfair Display',Georgia,serif;font-size:20px;font-weight:700;color:#1a3d22;text-align:center;margin-bottom:24px;">OUR IMPACT SO FAR</div>

      <!-- Row 1 -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
        <tr>
          <td width="33%" align="center" style="padding:4px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fbf8;border:1px solid #e0ede0;border-radius:12px;">
              <tr><td align="center" style="padding:18px 12px;">
                <div style="font-size:28px;margin-bottom:8px;">&#128167;</div>
                <div style="font-family:'Poppins',Arial,sans-serif;font-size:18px;font-weight:700;color:#2e7d32;margin-bottom:4px;">95M+</div>
                <div style="font-family:'Poppins',Arial,sans-serif;font-size:11px;color:#666;line-height:1.4;">Litres of water saved</div>
              </td></tr>
            </table>
          </td>
          <td width="33%" align="center" style="padding:4px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fbf8;border:1px solid #e0ede0;border-radius:12px;">
              <tr><td align="center" style="padding:18px 12px;">
                <div style="font-size:28px;margin-bottom:8px;">&#127807;</div>
                <div style="font-family:'Poppins',Arial,sans-serif;font-size:18px;font-weight:700;color:#2e7d32;margin-bottom:4px;">40,000+</div>
                <div style="font-family:'Poppins',Arial,sans-serif;font-size:11px;color:#666;line-height:1.4;">Saplings planted</div>
              </td></tr>
            </table>
          </td>
          <td width="33%" align="center" style="padding:4px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fbf8;border:1px solid #e0ede0;border-radius:12px;">
              <tr><td align="center" style="padding:18px 12px;">
                <div style="font-size:28px;margin-bottom:8px;">&#127979;</div>
                <div style="font-family:'Poppins',Arial,sans-serif;font-size:18px;font-weight:700;color:#2e7d32;margin-bottom:4px;">120+</div>
                <div style="font-family:'Poppins',Arial,sans-serif;font-size:11px;color:#666;line-height:1.4;">Rain-to-tap schools</div>
              </td></tr>
            </table>
          </td>
        </tr>
      </table>

      <!-- Row 2 -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td width="33%" align="center" style="padding:4px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fbf8;border:1px solid #e0ede0;border-radius:12px;">
              <tr><td align="center" style="padding:18px 12px;">
                <div style="font-size:28px;margin-bottom:8px;">&#9851;</div>
                <div style="font-family:'Poppins',Arial,sans-serif;font-size:18px;font-weight:700;color:#2e7d32;margin-bottom:4px;">6+</div>
                <div style="font-family:'Poppins',Arial,sans-serif;font-size:11px;color:#666;line-height:1.4;">Lakes rejuvenated</div>
              </td></tr>
            </table>
          </td>
          <td width="33%" align="center" style="padding:4px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fbf8;border:1px solid #e0ede0;border-radius:12px;">
              <tr><td align="center" style="padding:18px 12px;">
                <div style="font-size:28px;margin-bottom:8px;">&#129309;</div>
                <div style="font-family:'Poppins',Arial,sans-serif;font-size:18px;font-weight:700;color:#2e7d32;margin-bottom:4px;">5,000+</div>
                <div style="font-family:'Poppins',Arial,sans-serif;font-size:11px;color:#666;line-height:1.4;">Volunteers engaged</div>
              </td></tr>
            </table>
          </td>
          <td width="33%" align="center" style="padding:4px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fbf8;border:1px solid #e0ede0;border-radius:12px;">
              <tr><td align="center" style="padding:18px 12px;">
                <div style="font-size:28px;margin-bottom:8px;">&#10084;</div>
                <div style="font-family:'Poppins',Arial,sans-serif;font-size:18px;font-weight:700;color:#2e7d32;margin-bottom:4px;">82,000+</div>
                <div style="font-family:'Poppins',Arial,sans-serif;font-size:11px;color:#666;line-height:1.4;">Lives impacted</div>
              </td></tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- SIGN OFF -->
  <tr>
    <td align="center" style="background:#ffffff;padding:4px 32px 32px;">
      <div style="font-family:'Playfair Display',Georgia,serif;font-size:16px;font-style:italic;color:#555;margin-bottom:6px;">With heartfelt gratitude,</div>
      <div style="font-family:'Poppins',Arial,sans-serif;font-size:15px;font-weight:700;color:#1a3d22;margin-bottom:4px;">The Forward Foundation Team</div>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:10px auto 0;">
        <tr>
          <td style="width:40px;height:1px;background:linear-gradient(to right,transparent,#b5d5b7);"></td>
          <td style="padding:0 8px;color:#6aa84f;font-size:12px;">&#9830;</td>
          <td style="width:40px;height:1px;background:linear-gradient(to left,transparent,#b5d5b7);"></td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- FOOTER -->
  <tr>
    <td style="background:linear-gradient(160deg,#14382A 0%,#1e5c35 50%,#2e7d32 100%);padding:28px 32px;border-radius:0 0 16px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center">
            <table role="presentation" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:0 12px;">
                  <a href="tel:+919035479763" style="font-family:'Poppins',Arial,sans-serif;font-size:12px;color:rgba(255,255,255,0.75);text-decoration:none;">&#128222; +91 90354 79763</a>
                </td>
                <td style="width:1px;height:16px;background:rgba(255,255,255,0.2);"></td>
                <td style="padding:0 12px;">
                  <a href="mailto:team@theforwardfoundation.org" style="font-family:'Poppins',Arial,sans-serif;font-size:12px;color:rgba(255,255,255,0.75);text-decoration:none;">&#9993; team@theforwardfoundation.org</a>
                </td>
                <td style="width:1px;height:16px;background:rgba(255,255,255,0.2);"></td>
                <td style="padding:0 12px;">
                  <a href="https://theforwardfoundation.org" style="font-family:'Poppins',Arial,sans-serif;font-size:12px;color:rgba(255,255,255,0.75);text-decoration:none;">&#127758; theforwardfoundation.org</a>
                </td>
              </tr>
            </table>
            <div style="height:1px;background:rgba(255,255,255,0.12);margin:16px 0;"></div>
            <div style="font-family:'Poppins',Arial,sans-serif;font-size:10px;color:rgba(255,255,255,0.35);letter-spacing:0.5px;">&copy; 2026 The Forward Foundation. All rights reserved.</div>
          </td>
        </tr>
      </table>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`;

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: d.email, name: d.name }] }],
      from: { email: process.env.EMAIL_USER, name: 'The Forward Foundation' },
      subject: `Donation Receipt - The Forward Foundation - ${d.date}`,
      content: [
        {
          type: 'text/plain',
          value: `Dear ${d.name}, Thank you for your donation of INR ${d.amount} to The Forward Foundation. Receipt No: ${d.receiptNum}. Payment ID: ${d.payId}. Date: ${d.date}. Donor: ${d.name}. PAN: ${d.pan}. Purpose: ${d.purpose}. This donation qualifies for Section 80G tax deduction.`
        },
        {
          type: 'text/html',
          value: html
        }
      ],
    }),
  });

  if (response.ok) {
    console.log('Email sent to', d.email, '| Receipt:', d.receiptNum);
  } else {
    const err = await response.text();
    console.error('SendGrid error:', err);
  }
}

app.listen(process.env.PORT || 3000, () =>
  console.log('Server running on port', process.env.PORT || 3000)
);
