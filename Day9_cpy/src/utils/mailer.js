const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587, // Switch to STARTTLS port
  secure: false, // Must be false for 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
    ciphers: "SSLv3"
  },
  // 🚀 FORCE IPv4 (Fixes many cloud timeout issues)
  family: 4 
});

const sendOTPEmail = async (email, otp) => {
  // We remove the try/catch here so the controller handles the error logic
  const mailOptions = {
    from: '"ZEROTH Security" <no-reply@zeroth.io>',
    to: email,
    subject: "Your Verification Code",
    text: `Your ZEROTH Login OTP is: ${otp}.`,
    html: `<b>Your OTP: ${otp}</b>`
  };

  const info = await transporter.sendMail(mailOptions);
  console.log("✅ Email sent: %s", info.messageId);
  return info;
};

module.exports = { sendOTPEmail };  