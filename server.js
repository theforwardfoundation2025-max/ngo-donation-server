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
  const html = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
<div style="max-width:600px;margin:20px auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e0e0e0;">

  <!-- HEADER WITH LOGO -->
  <div style="background:#1a1a1a;padding:28px 24px;text-align:center;">
    <img src="https://github.com/theforwardfoundation2025-max/ngo-donation-server/blob/main/logo.png"
         style="height:70px;margin-bottom:8px;"
         alt="The Forward Foundation" />
    <p style="color:#8BC34A;margin:4px 0 0;font-size:12px;letter-spacing:1px;">LIVE | DEVELOP | SUSTAIN</p>
  </div>

  <!-- GREEN THANK YOU BANNER -->
  <div style="background:#E8F5E9;padding:16px 24px;text-align:center;border-left:4px solid #2E7D32;">
    <p style="margin:0;font-size:16px;font-weight:600;color:#1B5E20;">Thank You for Your Generous Donation!</p>
    <p style="margin:4px 0 0;font-size:13px;color:#2E7D32;">Your contribution helps us Live, Develop and Sustain communities.</p>
  </div>

  <!-- MAIN BODY -->
  <div style="padding:28px 24px;">
    <p style="margin:0 0 16px;font-size:15px;color:#212121;">Dear <strong>${d.name}</strong>,</p>
    <p style="margin:0 0 24px;font-size:14px;color:#424242;line-height:1.7;">
      We are deeply grateful for your generous contribution to The Forward Foundation.
      Your support directly powers our mission of protecting water, planting trees,
      and uplifting communities across India.
    </p>

    <!-- RECEIPT TABLE -->
    <div style="background:#F9F9F9;border-radius:8px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 14px;font-size:12px;font-weight:600;color:#333;text-transform:uppercase;letter-spacing:0.8px;">Donation Receipt</p>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <tr style="border-bottom:1px solid #E0E0E0;">
          <td style="padding:10px 8px;color:#757575;width:45%;">Receipt Number</td>
          <td style="padding:10px 8px;color:#212121;font-weight:600;">TFF-${new Date().getFullYear()}-${d.payId.slice(-6).toUpperCase()}</td>
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

    <!-- 80G BOX -->
    <div style="background:#E8F5E9;border-left:4px solid #388E3C;padding:14px 16px;border-radius:0 8px 8px 0;margin-bottom:24px;">
      <p style="margin:0;font-size:13px;color:#1B5E20;font-weight:600;">80G Tax Exemption Certificate</p>
      <p style="margin:6px 0 0;font-size:12px;color:#2E7D32;line-height:1.6;">
        This donation is eligible for tax deduction under <strong>Section 80G</strong>
        of the Income Tax Act, 1961. Our 80G Registration No:
        <strong>YOUR-80G-NUMBER-HERE</strong>.
        Please retain this receipt for your tax records.
      </p>
    </div>

    <!-- IMPACT STATS -->
    <div style="text-align:center;padding:20px 0;border-top:1px solid #E0E0E0;border-bottom:1px solid #E0E0E0;margin-bottom:24px;">
      <p style="margin:0 0 16px;font-size:11px;color:#9E9E9E;text-transform:uppercase;letter-spacing:0.8px;">Our Impact So Far</p>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="text-align:center;padding:0 4px;">
            <p style="margin:0;font-size:18px;font-weight:700;color:#388E3C;">95M+</p>
            <p style="margin:3px 0 0;font-size:10px;color:#9E9E9E;">Litres of<br/>water saved</p>
          </td>
          <td style="text-align:center;padding:0 4px;">
            <p style="margin:0;font-size:18px;font-weight:700;color:#388E3C;">40,000+</p>
            <p style="margin:3px 0 0;font-size:10px;color:#9E9E9E;">Saplings<br/>planted</p>
          </td>
          <td style="text-align:center;padding:0 4px;">
            <p style="margin:0;font-size:18px;font-weight:700;color:#388E3C;">82,000+</p>
            <p style="margin:3px 0 0;font-size:10px;color:#9E9E9E;">Lives<br/>impacted</p>
          </td>
          <td style="text-align:center;padding:0 4px;">
            <p style="margin:0;font-size:18px;font-weight:700;color:#388E3C;">120+</p>
            <p style="margin:3px 0 0;font-size:10px;color:#9E9E9E;">Rain-to-tap<br/>schools</p>
          </td>
          <td style="text-align:center;padding:0 4px;">
            <p style="margin:0;font-size:18px;font-weight:700;color:#388E3C;">6+</p>
            <p style="margin:3px 0 0;font-size:10px;color:#9E9E9E;">Lakes<br/>rejuvenated</p>
          </td>
          <td style="text-align:center;padding:0 4px;">
            <p style="margin:0;font-size:18px;font-weight:700;color:#388E3C;">5,000+</p>
            <p style="margin:3px 0 0;font-size:10px;color:#9E9E9E;">Volunteers<br/>engaged</p>
          </td>
        </tr>
      </table>
    </div>

    <!-- SIGN OFF -->
    <p style="margin:0;font-size:13px;color:#424242;line-height:1.7;">
      With heartfelt gratitude,<br/>
      <strong>The Forward Foundation Team</strong>
    </p>
  </div>

  <!-- FOOTER -->
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
      subject: 'Thank You for Your Donation — Receipt Enclosed',
      content: [{ type: 'text/html', value: html }],
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