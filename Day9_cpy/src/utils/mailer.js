const axios = require('axios');

const sendOTPEmail = async (email, otp) => {
  const url = 'https://api.brevo.com/v3/smtp/email';
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.EMAIL_USER; // Must be the email you used to sign up for Brevo

  if (!apiKey || !senderEmail) {
    throw new Error("Missing Brevo Configuration");
  }

  const data = {
    sender: { name: "ZEROTH Security", email: senderEmail },
    to: [{ email: email }],
    subject: "Your Verification Code",
    htmlContent: `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2>🔐 Verification Code</h2>
        <p>Your OTP for ZEROTH is:</p>
        <h1 style="color: #4f46e5; letter-spacing: 5px;">${otp}</h1>
        <p style="color: #666; font-size: 12px;">This code expires in 5 minutes.</p>
      </div>
    `
  };

  try {
    const response = await axios.post(url, data, {
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        'accept': 'application/json'
      }
    });
    console.log("✅ Email sent via Brevo HTTP:", response.data.messageId);
    return response.data;
  } catch (error) {
    console.error("❌ Brevo API Failed:", error.response?.data || error.message);
    throw error;
  }
};

module.exports = { sendOTPEmail };