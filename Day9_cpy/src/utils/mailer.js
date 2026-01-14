const nodemailer = require("nodemailer");

// Use explicit settings instead of just service: 'gmail'
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465, // Force Secure SSL Port
  secure: true, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  // 🚀 CRITICAL FIXES FOR CLOUD DEPLOYMENT
  tls: {
    rejectUnauthorized: false, // Helps if Render has cert issues
    ciphers: "SSLv3"
  },
  connectionTimeout: 10000, // 10 seconds
  greetingTimeout: 5000,
  socketTimeout: 10000
});

const sendOTPEmail = async (email, otp) => {
  try {
    const mailOptions = {
      from: '"ZEROTH Security" <no-reply@zeroth.io>',
      to: email,
      subject: "Your Verification Code",
      text: `Your ZEROTH Login OTP is: ${otp}. It expires in 5 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #333;">🔐 Verification Code</h2>
          <p>Your OTP for ZEROTH is:</p>
          <h1 style="color: #000; letter-spacing: 5px;">${otp}</h1>
          <p style="font-size: 12px; color: #666;">This code expires in 5 minutes.</p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Email sent: %s", info.messageId);
    return info;
  } catch (error) {
    console.error("❌ Nodemailer Failed:", error);
    throw error; // Rethrow so the controller knows it failed
  }
};

module.exports = { sendOTPEmail };