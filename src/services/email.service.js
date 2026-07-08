import nodemailer from 'nodemailer';

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
    port: parseInt(process.env.SMTP_PORT, 10) || 2525,
    auth: {
      user: process.env.SMTP_USER || '',
      password: process.env.SMTP_PASS || '',
    },
  });
};

export const sendVerificationEmail = async (user, token) => {
  try {
    const transporter = createTransporter();
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${token}`;

    const mailOptions = {
      from: `"MnCHub" <noreply@mnchub.com>`,
      to: user.email,
      subject: 'Verify your email address - MnCHub',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
          <h2 style="color: #7c3aed; text-align: center;">Welcome to MnCHub!</h2>
          <p>Hi ${user.name},</p>
          <p>Thank you for registering on MnCHub, the ultimate college resource sharing platform. Please click the button below to verify your email address and activate your account:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" style="background-color: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Verify Email</a>
          </div>
          <p>Or copy and paste this link into your browser:</p>
          <p><a href="${verificationUrl}">${verificationUrl}</a></p>
          <p>This link will expire in 24 hours.</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #666; text-align: center;">If you didn't create an account, you can safely ignore this email.</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Verification email sent: %s', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending verification email:', error);
    return false;
  }
};

export const sendPasswordResetEmail = async (user, token) => {
  try {
    const transporter = createTransporter();
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${token}`;

    const mailOptions = {
      from: `"MnCHub" <noreply@mnchub.com>`,
      to: user.email,
      subject: 'Password Reset Request - MnCHub',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
          <h2 style="color: #7c3aed; text-align: center;">Password Reset Request</h2>
          <p>Hi ${user.name},</p>
          <p>You are receiving this email because you (or someone else) requested a password reset for your account on MnCHub.</p>
          <p>Please click the button below to reset your password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #f43f5e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
          </div>
          <p>Or copy and paste this link into your browser:</p>
          <p><a href="${resetUrl}">${resetUrl}</a></p>
          <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
          <p>This link will expire in 1 hour.</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #666; text-align: center;">Need help? Contact support@mnchub.com</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Password reset email sent: %s', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return false;
  }
};

export const sendWelcomeEmail = async (user) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"MnCHub" <noreply@mnchub.com>`,
      to: user.email,
      subject: 'Welcome to MnCHub!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
          <h2 style="color: #7c3aed; text-align: center;">Welcome to MnCHub, ${user.name}!</h2>
          <p>Your account is now verified and active.</p>
          <p>Here are some things you can do to get started:</p>
          <ul>
            <li>Explore and download notes, PYQs, and class files.</li>
            <li>Connect with seniors or check out placement and internship resources.</li>
            <li>Join discussions and study groups.</li>
            <li>Contribute your own resources to earn reputation points and badges!</li>
          </ul>
          <p>Happy learning!</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #666; text-align: center;">The MnCHub Team</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return false;
  }
};
