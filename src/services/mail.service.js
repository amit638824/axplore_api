const nodemailer = require('nodemailer');
const { prisma } = require('../config/database');
const {
  getResetPasswordTemplate,
  getLeadAssignmentTemplate,
  getContractingTeamAssignedTemplate,
  getPasswordSuccessTemplate,
  getWelcomeTemplate,
  getLeadReminderTemplate
} = require('./mail.templates');

/**
 * Get SMTP Settings from Database
 */
const getSMTPSettings = async () => {
  // Fetch SMTP config from travel_agency_settings using travel_agency_id
  const settings = await prisma.travelAgencySettings.findUnique({
    where: { travelAgencyId: 'bb93d353-9313-46c6-8e5d-71b9471b6691' }
  });

  if (!settings || !settings.storageEndpoint || !settings.storageAccessKey || !settings.storageSecretKey) {
    throw new Error('SMTP configuration missing in database settings');
  }

  return settings;
};

/**
 * Create Nodemailer Transporter
 */
const createTransporter = (settings) => {
  // Handle host:port format
  let host = settings.storageEndpoint;
  let port = 587; // default
  if (host.includes(':')) {
    const parts = host.split(':');
    host = parts[0];
    port = parseInt(parts[1], 10);
  }

  return nodemailer.createTransport({
    host: host,
    port: port,
    secure: port === 465, // true for 465, false for other ports
    auth: {
      user: settings.storageAccessKey,
      pass: settings.storageSecretKey,
    },
  });
};

const getLeadSubjectSuffix = (leadCode) => {
  const normalizedLeadCode = String(leadCode || '').trim();
  return normalizedLeadCode ? ` - Lead Code: ${normalizedLeadCode}` : '';
};

/**
 * Send Password Reset Email
 */
const sendResetEmail = async (to, token, firstName) => {
  const settings = await getSMTPSettings();
  const transporter = createTransporter(settings);

  const frontendUrl = process.env.FRONTEND_URL || 'https://axv2.demowithme.com';
  const html = getResetPasswordTemplate(token, firstName, frontendUrl);

  const mailOptions = {
    from: `"${settings.smtpFromName || 'Axplore Travel'}" <${settings.smtpFromEmail || 'noreply@axploretravel.com'}>`,
    to: to,
    subject: 'Action Required: Password Reset Request for Axplore Travel',
    html: html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Reset email sent successfully:', info.messageId);
  } catch (error) {
    console.error('--- SMTP RESET SEND ERROR ---');
    console.error(error.message);
    throw error;
  }
};

/**
 * Send Welcome Email (Set Password)
 */
const sendWelcomeEmail = async (to, token, firstName) => {
  const settings = await getSMTPSettings();
  const transporter = createTransporter(settings);

  const frontendUrl = process.env.FRONTEND_URL || 'https://axv2.demowithme.com';
  const html = getWelcomeTemplate(token, firstName, frontendUrl);

  const mailOptions = {
    from: `"${settings.smtpFromName || 'Axplore Travel'}" <${settings.smtpFromEmail || 'noreply@axploretravel.com'}>`,
    to: to,
    subject: 'Welcome to Axplore Travel: Set Up Your Account',
    html: html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Welcome email sent successfully:', info.messageId);
  } catch (error) {
    console.error('--- SMTP WELCOME SEND ERROR ---');
    console.error(error.message);
    throw error;
  }
};

/**
 * Send Lead Assignment Email
 */
const sendLeadAssignmentEmail = async (to, fullName, leadDisplayName, greeting, message, cc = null, tripDetails = null, options = {}) => {
  const settings = await getSMTPSettings();
  const transporter = createTransporter(settings);

  const frontendUrl = process.env.FRONTEND_URL || 'https://axv2.demowithme.com';
  const html = getLeadAssignmentTemplate(fullName, leadDisplayName, frontendUrl, greeting, message, tripDetails, options);

  const mailOptions = {
    from: `"${settings.smtpFromName || 'Axplore Travel'}" <${settings.smtpFromEmail || 'noreply@axploretravel.com'}>`,
    to: to,
    cc: cc,
    subject: `Lead Notification: ${leadDisplayName} - Axplore Travel${getLeadSubjectSuffix(options.leadCode)}`,
    html: html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Lead assignment email sent successfully:', info.messageId);
  } catch (error) {
    console.error('--- SMTP ASSIGNMENT SEND ERROR ---');
    console.error(error.message);
    throw error;
  }
};

/**
 * Send Contracting Team Assigned notice to SalesREP / Contracting Head.
 */
const sendContractingTeamAssignedEmail = async (to, fullName, leadDisplayName, teamMemberNames = [], tripDetails = null, options = {}) => {
  const settings = await getSMTPSettings();
  const transporter = createTransporter(settings);

  const frontendUrl = process.env.FRONTEND_URL || 'https://axv2.demowithme.com';
  const html = getContractingTeamAssignedTemplate(fullName, leadDisplayName, frontendUrl, teamMemberNames, tripDetails, options);

  const mailOptions = {
    from: `"${settings.smtpFromName || 'Axplore Travel'}" <${settings.smtpFromEmail || 'noreply@axploretravel.com'}>`,
    to,
    subject: `Contracting Team Assigned: ${leadDisplayName} - Axplore Travel${getLeadSubjectSuffix(options.leadCode)}`,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Contracting team assigned email sent successfully:', info.messageId);
  } catch (error) {
    console.error('--- SMTP CONTRACTING TEAM ASSIGNED SEND ERROR ---');
    console.error(error.message);
    throw error;
  }
};

/**
 * Send Password Changed Success Email
 */
const sendPasswordSuccessEmail = async (to, firstName) => {
  const settings = await getSMTPSettings();
  const transporter = createTransporter(settings);

  const frontendUrl = process.env.FRONTEND_URL || 'https://axv2.demowithme.com';
  const html = getPasswordSuccessTemplate(firstName, frontendUrl);

  const mailOptions = {
    from: `"${settings.smtpFromName || 'Axplore Travel'}" <${settings.smtpFromEmail || 'noreply@axploretravel.com'}>`,
    to: to,
    subject: 'Security Alert: Your Axplore Travel Password was Changed',
    html: html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Password success email sent successfully:', info.messageId);
  } catch (error) {
    console.error('--- SMTP PASSWORD SUCCESS SEND ERROR ---');
    console.error(error.message);
  }
};

/**
 * Send Lead Assignment Reminder Email
 */
const sendLeadReminderEmail = async (to, fullName, leadDisplayName, reminderStage, maxReminders, cc = null, tripDetails = null, options = {}) => {
  const settings = await getSMTPSettings();
  const transporter = createTransporter(settings);

  const frontendUrl = process.env.FRONTEND_URL || 'https://axv2.demowithme.com';
  const html = getLeadReminderTemplate(fullName, leadDisplayName, frontendUrl, reminderStage, maxReminders, tripDetails, options);

  const mailOptions = {
    from: `"${settings.smtpFromName || 'Axplore Travel'}" <${settings.smtpFromEmail || 'noreply@axploretravel.com'}>`,
    to: to,
    cc: cc,
    subject: `Reminder ${reminderStage}: Lead Assignment Pending - ${leadDisplayName}${getLeadSubjectSuffix(options.leadCode)}`,
    html: html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Lead reminder email (${reminderStage}) sent successfully:`, info.messageId);
  } catch (error) {
    console.error(`--- SMTP REMINDER ${reminderStage} SEND ERROR ---`);
    console.error(error.message);
    throw error;
  }
};

module.exports = {
  sendResetEmail,
  sendLeadAssignmentEmail,
  sendContractingTeamAssignedEmail,
  sendPasswordSuccessEmail,
  sendWelcomeEmail,
  sendLeadReminderEmail,
};
