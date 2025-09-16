const nodemailer = require('nodemailer');

let transporter;

const initTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  }
  return transporter;
};

const sendLeadNotification = async (leadData) => {
  try {
    const { name, phone, source, created_at } = leadData;

    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">New Lead Received!</h2>

        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 10px 0;"><strong>Name:</strong> ${name}</p>
          <p style="margin: 10px 0;"><strong>Phone:</strong> ${phone}</p>
          <p style="margin: 10px 0;"><strong>Source:</strong> ${source || 'Direct'}</p>
          <p style="margin: 10px 0;"><strong>Date:</strong> ${new Date(created_at).toLocaleString('it-IT')}</p>
        </div>

        <p style="color: #666; font-size: 14px;">
          This lead has been automatically saved to your database and a WhatsApp welcome message has been sent.
        </p>

        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">

        <p style="color: #999; font-size: 12px;">
          This is an automated notification from your Omira Lead Capture System.
        </p>
      </div>
    `;

    const mailOptions = {
      from: `"Omira Lead System" <${process.env.SMTP_USER}>`,
      to: process.env.NOTIFICATION_EMAIL || 'hello@byrivon.com',
      subject: `New Lead: ${name} - ${new Date().toLocaleDateString('it-IT')}`,
      html: emailContent,
      text: `New lead received!\n\nName: ${name}\nPhone: ${phone}\nSource: ${source || 'Direct'}\nDate: ${new Date(created_at).toLocaleString('it-IT')}`
    };

    await initTransporter().sendMail(mailOptions);
    console.log('Email notification sent successfully');
    return { success: true };

  } catch (error) {
    console.error('Email send error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = { sendLeadNotification };