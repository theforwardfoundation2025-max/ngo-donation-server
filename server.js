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

  const p       = event.payload.payment.entity;
  const email   = p.email;
  const name    = p.notes?.['Donor Full Name']     || 'Valued Donor';
  const pan     = p.notes?.['PAN for Tax Benefit'] || 'N/A';
  const purpose = p.notes?.['Purpose']             || 'General Donation';
  const amount  = (p.amount / 100).toFixed(2);
  const payId   = p.id;
  const date    = new Date().toLocaleDateString('en-IN',
                    { day: '2-digit', month: 'long', year: 'numeric' });

  await sendEmail({ email, name, pan, purpose, amount, payId, date });
  res.status(200).send('OK');
});

async function sendEmail(d) {

  const LOGO_BASE64 = 'data:image/png;base64,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';
  const receiptNum = 'TFF-' + new Date().getFullYear() + '-' + d.payId.slice(-6).toUpperCase();

  const html = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
<div style="max-width:600px;margin:20px auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e0e0e0;">

  <div style="background:#1a1a1a;padding:28px 24px;text-align:center;">
    <img src="${LOGO_BASE64}"
         style="height:70px;margin-bottom:8px;"
         alt="The Forward Foundation" />
    <p style="color:#8BC34A;margin:4px 0 0;font-size:12px;letter-spacing:1px;">LIVE | DEVELOP | SUSTAIN</p>
  </div>

  <div style="background:#E8F5E9;padding:16px 24px;text-align:center;border-left:4px solid #2E7D32;">
    <p style="margin:0;font-size:16px;font-weight:600;color:#1B5E20;">Thank You for Your Generous Donation!</p>
    <p style="margin:4px 0 0;font-size:13px;color:#2E7D32;">Your contribution helps us Live, Develop and Sustain communities.</p>
  </div>

  <div style="padding:28px 24px;">
    <p style="margin:0 0 16px;font-size:15px;color:#212121;">Dear <strong>${d.name}</strong>,</p>
    <p style="margin:0 0 24px;font-size:14px;color:#424242;line-height:1.7;">
      We are deeply grateful for your generous contribution to The Forward Foundation.
      Your support directly powers our mission of protecting water, planting trees,
      and uplifting communities across India.
    </p>

    <div style="background:#F9F9F9;border-radius:8px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 14px;font-size:12px;font-weight:600;color:#333;text-transform:uppercase;letter-spacing:0.8px;">Donation Receipt</p>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <tr style="border-bottom:1px solid #E0E0E0;">
          <td style="padding:10px 8px;color:#757575;width:45%;">Receipt Number</td>
          <td style="padding:10px 8px;color:#212121;font-weight:600;">${receiptNum}</td>
        </tr>
        <tr style="border-bottom:1px solid #E0E0E0;background:#ffffff;">
          <td style="padding:10px 8px;color:#757575;">Payment ID</td>
          <td style="padding:10px 8px;color:#212121;font-family:monospace;font-size:12px;">${d.payId}</td>
        </tr>
        <tr style="border-bottom:1px solid #E0E0E0;">
          <td style="padding:10px 8px;color:#757575;">Date</td>
          <td style="padding:10px 8px;color:#212121;">${d.date}</td>
        </tr>
        <tr style="border-bottom:1px solid #E0E0E0;background:#ffffff;">
          <td style="padding:10px 8px;color:#757575;">Donor Name</td>
          <td style="padding:10px 8px;color:#212121;">${d.name}</td>
        </tr>
        <tr style="border-bottom:1px solid #E0E0E0;">
          <td style="padding:10px 8px;color:#757575;">PAN Number</td>
          <td style="padding:10px 8px;color:#212121;font-family:monospace;">${d.pan}</td>
        </tr>
        <tr style="border-bottom:1px solid #E0E0E0;background:#ffffff;">
          <td style="padding:10px 8px;color:#757575;">Purpose</td>
          <td style="padding:10px 8px;color:#212121;">${d.purpose}</td>
        </tr>
        <tr style="background:#F1F8E9;">
          <td style="padding:14px 8px;color:#2E7D32;font-weight:700;font-size:15px;">Amount Donated</td>
          <td style="padding:14px 8px;color:#2E7D32;font-weight:700;font-size:18px;">INR ${d.amount}</td>
        </tr>
      </table>
    </div>

    <div style="background:#E8F5E9;border-left:4px solid #388E3C;padding:14px 16px;border-radius:0 8px 8px 0;margin-bottom:24px;">
      <p style="margin:0;font-size:13px;color:#1B5E20;font-weight:600;">80G Tax Exemption Certificate</p>
      <p style="margin:6px 0 0;font-size:12px;color:#2E7D32;line-height:1.6;">
        This donation is eligible for tax deduction under <strong>Section 80G</strong>
        of the Income Tax Act, 1961. Our 80G Registration No: <strong>YOUR-80G-NUMBER-HERE</strong>.
        Please retain this receipt for your tax records.
      </p>
    </div>

    <div style="text-align:center;padding:20px 0;border-top:1px solid #E0E0E0;border-bottom:1px solid #E0E0E0;margin-bottom:24px;">
      <p style="margin:0 0 16px;font-size:11px;color:#9E9E9E;text-transform:uppercase;letter-spacing:0.8px;">Our Impact So Far</p>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="text-align:center;padding:0 4px;">
            <p style="margin:0;font-size:16px;font-weight:700;color:#388E3C;">95M+</p>
            <p style="margin:3px 0 0;font-size:10px;color:#9E9E9E;">Litres of<br/>water saved</p>
          </td>
          <td style="text-align:center;padding:0 4px;">
            <p style="margin:0;font-size:16px;font-weight:700;color:#388E3C;">40,000+</p>
            <p style="margin:3px 0 0;font-size:10px;color:#9E9E9E;">Saplings<br/>planted</p>
          </td>
          <td style="text-align:center;padding:0 4px;">
            <p style="margin:0;font-size:16px;font-weight:700;color:#388E3C;">82,000+</p>
            <p style="margin:3px 0 0;font-size:10px;color:#9E9E9E;">Lives<br/>impacted</p>
          </td>
          <td style="text-align:center;padding:0 4px;">
            <p style="margin:0;font-size:16px;font-weight:700;color:#388E3C;">120+</p>
            <p style="margin:3px 0 0;font-size:10px;color:#9E9E9E;">Rain-to-tap<br/>schools</p>
          </td>
          <td style="text-align:center;padding:0 4px;">
            <p style="margin:0;font-size:16px;font-weight:700;color:#388E3C;">6+</p>
            <p style="margin:3px 0 0;font-size:10px;color:#9E9E9E;">Lakes<br/>rejuvenated</p>
          </td>
          <td style="text-align:center;padding:0 4px;">
            <p style="margin:0;font-size:16px;font-weight:700;color:#388E3C;">5,000+</p>
            <p style="margin:3px 0 0;font-size:10px;color:#9E9E9E;">Volunteers<br/>engaged</p>
          </td>
        </tr>
      </table>
    </div>

    <p style="margin:0;font-size:13px;color:#424242;line-height:1.7;">
      With heartfelt gratitude,<br/>
      <strong>The Forward Foundation Team</strong>
    </p>
  </div>

  <div style="background:#1a1a1a;padding:18px 24px;text-align:center;">
    <p style="margin:0 0 4px;color:#8BC34A;font-size:12px;font-weight:600;">theforwardfoundation.org</p>
    <p style="margin:0 0 4px;color:#9E9E9E;font-size:11px;">theforwardfoundation2025@gmail.com</p>
    <p style="margin:8px 0 0;color:#616161;font-size:10px;">This is an automated receipt. Please do not reply to this email.</p>
  </div>

</div>
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
          value: `Dear ${d.name}, Thank you for your donation of INR ${d.amount} to The Forward Foundation. Payment ID: ${d.payId}. Date: ${d.date}. Receipt No: TFF-${new Date().getFullYear()}-${d.payId.slice(-6).toUpperCase()}. PAN: ${d.pan}. Purpose: ${d.purpose}. This donation qualifies for Section 80G tax deduction.`
        },
        {
          type: 'text/html',
          value: html
        }
      ],
    }),
  });

  if (response.ok) {
    console.log('Email sent successfully to', d.email);
  } else {
    const err = await response.text();
    console.error('SendGrid error:', err);
  }
}

app.listen(process.env.PORT || 3000, () =>
  console.log('Server running on port', process.env.PORT || 3000)
);
