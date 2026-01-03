const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER, // Your Gmail
    pass: process.env.EMAIL_PASS, // Your App Password
  },
});

const sendOTPEmail = async (email, otp) => {
  const mailOptions = {
    from: '"ZEROTH Security" <no-reply@zeroth.io>',
    to: email,
    subject: "Your Verification Code",
    text: `Your ZEROTH Login OTP is: ${otp}. It expires in 5 minutes.`,
    html: `<b>Your ZEROTH Login OTP is: ${otp}</b><br>It expires in 5 minutes.`
  };

  await transporter.sendMail(mailOptions);
};

module.exports = { sendOTPEmail };