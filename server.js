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
  <div style='font-family:Arial;max-width:600px;margin:auto;border:1px solid #ddd'>
    <div style='background:#1a237e;padding:28px;text-align:center'>
      <h2 style='color:white;margin:0'>Thank You for Your Donation!</h2>
    </div>
    <div style='padding:28px;background:#fafafa'>
      <p>Dear <b>${d.name}</b>,</p>
      <p>Your generous donation has been received. Thank you for supporting our mission!</p>
      <h3 style='color:#1a237e'>Donation Receipt</h3>
      <table style='width:100%;border-collapse:collapse'>
        <tr style='background:#f0f4ff'>
          <td style='padding:8px;border:1px solid #ddd'><b>Payment ID</b></td>
          <td style='padding:8px;border:1px solid #ddd'>${d.payId}</td>
        </tr>
        <tr>
          <td style='padding:8px;border:1px solid #ddd'><b>Date</b></td>
          <td style='padding:8px;border:1px solid #ddd'>${d.date}</td>
        </tr>
        <tr style='background:#f0f4ff'>
          <td style='padding:8px;border:1px solid #ddd'><b>Amount</b></td>
          <td style='padding:8px;border:1px solid #ddd'><b>INR ${d.amount}</b></td>
        </tr>
        <tr>
          <td style='padding:8px;border:1px solid #ddd'><b>Purpose</b></td>
          <td style='padding:8px;border:1px solid #ddd'>${d.purpose}</td>
        </tr>
        <tr style='background:#f0f4ff'>
          <td style='padding:8px;border:1px solid #ddd'><b>PAN</b></td>
          <td style='padding:8px;border:1px solid #ddd'>${d.pan}</td>
        </tr>
      </table>
      <p style='color:#555;margin-top:16px'>This donation qualifies for tax deduction under Section 80G.</p>
    </div>
    <div style='background:#1a237e;padding:12px;text-align:center'>
      <p style='color:#BBDEFB;font-size:12px;margin:0'>The Forward Foundation | theforwardfoundation2025@gmail.com</p>
    </div>
  </div>`;

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