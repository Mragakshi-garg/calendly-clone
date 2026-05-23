const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendBookingConfirmation = async ({
  inviteeName,
  inviteeEmail,
  eventName,
  hostName,
  startTime,
  endTime,
  date,
}) => {
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: inviteeEmail,
    subject: `Booking Confirmed - ${eventName}`,
    html: `
      <h2>Booking Confirmed</h2>
      <p>Hello ${inviteeName},</p>

      <p>Your booking has been confirmed.</p>

      <p><strong>Event:</strong> ${eventName}</p>
      <p><strong>Host:</strong> ${hostName}</p>
      <p><strong>Date:</strong> ${date}</p>
      <p><strong>Time:</strong> ${startTime} - ${endTime}</p>
    `,
  });
};

module.exports = {
  sendBookingConfirmation,
};