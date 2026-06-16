require('dotenv').config();
const express    = require('express');
const crypto     = require('crypto');
const nodemailer = require('nodemailer');
const app        = express();
// Raw body is required for Razorpay signature check
app.use(express.raw({ type: 'application/json' }));
// Email transporter using Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});
// Webhook endpoint — Razorpay will POST here after payment
app.post('/webhook/razorpay', (req, res) => {
  const secret    = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature = req.headers['x-razorpay-signature'];
  const expected  = crypto.createHmac('sha256', secret)
                          .update(req.body).digest('hex');
  // Reject if signature does not match
  if (expected !== signature) return res.status(400).send('Invalid');
  const event = JSON.parse(req.body);
  if (event.event !== 'payment.captured') return res.status(200).send('Ignored');
  // Extract donor details from webhook payload
  const p = event.payload.payment.entity;
  const email   = p.email;
  const name    = p.notes?.['Donor Full Name']     || 'Valued Donor';
  const pan     = p.notes?.['PAN for Tax Benefit'] || 'N/A';
  const purpose = p.notes?.['Purpose']             || 'General Donation';
  const amount  = (p.amount / 100).toFixed(2);
  const payId   = p.id;
  const date    = new Date().toLocaleDateString('en-IN',
                    { day: '2-digit', month: 'long', year: 'numeric' });
  sendThankYouEmail({ email, name, pan, purpose, amount, payId, date });
  res.status(200).send('OK');
});

function sendThankYouEmail(d) {
  const html = `
  <div style='font-family:Arial;max-width:600px;margin:auto;border:1px solid #ddd'>
    <div style='background:#1a237e;padding:28px;text-align:center'>
      <h2 style='color:white;margin:0'>Thank You for Your Donation!</h2>
    </div>
    <div style='padding:28px;background:#fafafa'>
      <p>Dear <b>${d.name}</b>,</p>
      <p>Your generous donation has been received.
         Thank you for supporting our mission!</p>
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
      <p style='color:#555;margin-top:16px'>
        This donation qualifies for tax deduction under Section 80G.</p>
    </div>
    <div style='background:#1a237e;padding:12px;text-align:center'>
      <p style='color:#BBDEFB;font-size:12px;margin:0'>
        Your NGO Name  |  yourngo@gmail.com</p>
    </div>
  </div>`;
  transporter.sendMail({
    from: `'Your NGO Name' <${process.env.EMAIL_USER}>`,
    to:   d.email,
    subject: 'Thank You for Your Donation — Receipt Enclosed',
    html,
  });
}
app.listen(process.env.PORT || 3000, () =>
  console.log('Server running on port', process.env.PORT || 3000)
);