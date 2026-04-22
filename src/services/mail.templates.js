/**
 * Mail Templates
 * Centralized HTML templates for all system emails
 */

/**
 * Common Base Layout for emails
 * @param {string} content - The main HTML content for the email body
 * @param {string} frontendUrl - Application frontend URL for images and links
 * @returns {string} - Full HTML document
 */
const getBaseLayout = (content, frontendUrl) => {
  const currentYear = new Date().getFullYear();
  return `
    <div style="background-color: #f6f8fb; padding: 40px 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
        <!-- Header with Logo -->
        <div style="padding: 30px; text-align: center; border-bottom: 1px solid #f0f0f0;">
          <img src="${frontendUrl}/images/loginpage.png" alt="Axplore Travel" style="width: 170px; height: 46px; display: block; margin: 0 auto;" />
        </div>
        
        <!-- Content -->
        <div style="padding: 40px; color: #333333; line-height: 1.6;">
          ${content}
        </div>
        
        <!-- Footer -->
        <div style="padding: 30px; background-color: #fafafa; text-align: center; color: #999999; font-size: 12px; border-top: 1px solid #f0f0f0;">
          <p style="margin: 0 0 10px 0; font-weight: 600;">Axplore Travel Management System</p>
          <p style="margin: 0 0 10px 0;">&copy; ${currentYear} Axplore Travel. All rights reserved.</p>
          <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #eeeeee;">
            <p style="margin: 0;">This is an automated security notification. Please do not reply directly to this email.</p>
          </div>
        </div>
      </div>
    </div>
  `;
};

const escapeHtml = (value) => {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const normalizeDocumentEntries = (documents = []) => {
  const seen = new Set();
  const entries = [];

  for (const doc of documents || []) {
    const isObject = typeof doc === 'object' && doc !== null;
    const title = typeof doc === 'object' && doc !== null
      ? String(doc.title || doc.name || doc.documentTitle || '').trim()
      : String(doc || '').trim();
    const documentName = isObject
      ? String(doc.documentName || doc.document_name || doc.documentTitle || doc.name || title || '').trim()
      : title;
    const fileName = isObject
      ? String(doc.fileName || doc.file_name || '').trim()
      : '';
    const rawUrl = typeof doc === 'object' && doc !== null
      ? String(doc.url || doc.href || doc.fileUrl || '').trim()
      : '';
    const url = /^https?:\/\//i.test(rawUrl) ? rawUrl : '';

    if (!title && !documentName && !fileName) continue;

    const key = `${title}|${documentName}|${fileName}|${url}`;
    if (seen.has(key)) continue;
    seen.add(key);
    entries.push({ title, documentName, fileName, url });
  }

  return entries;
};

const getDocumentDisplayTitle = (doc) => {
  const documentName = String(doc.documentName || doc.title || '').trim();
  const fileName = String(doc.fileName || '').trim();

  if (documentName.toLowerCase() === 'miscellaneous' && fileName) {
    return `Miscellaneous (${fileName})`;
  }

  return documentName || fileName || doc.title || 'Uploaded document';
};

const getDocumentSection = (documentTitles = []) => {
  const documents = normalizeDocumentEntries(documentTitles);
  if (!documents.length) return '';

  const items = documents
    .map((doc) => {
      const title = escapeHtml(getDocumentDisplayTitle(doc));
      const content = doc.url
        ? `<p style="color: #0061A0; font-weight: 600; text-decoration: underline;">${title}</p>`
        : title;
      return `<li style="margin: 6px 0; color: #0f172a; font-weight: 600;">${content}</li>`;
    })
    .join('');

  return `
    <div style="background-color: #fff7ed; border: 1px solid #fed7aa; border-radius: 10px; margin-top: 25px; padding: 18px 20px;">
      <h3 style="margin: 0 0 10px 0; font-size: 16px; color: #9a3412;">Uploaded Document${documents.length > 1 ? 's' : ''}</h3>
      <p style="margin: 0 0 10px 0; color: #7c2d12; font-size: 14px;">Please review the following document${documents.length > 1 ? 's' : ''} for this lead:</p>
      <ul style="margin: 0; padding-left: 20px;">${items}</ul>
    </div>
  `;
};

/**
 * Template for Password Reset Email
 */
const getResetPasswordTemplate = (token, firstName, frontendUrl) => {
  const resetLink = `${frontendUrl}/reset-password?token=${token}`;

  const content = `
    <h2 style="margin-top: 0; color: #0061A0; font-size: 22px; font-weight: 600;">Password Reset Request</h2>
    <p style="font-size: 16px;">Hello ${firstName || 'Valued User'},</p>
    <p style="font-size: 15px;">We received a request to reset the password for your Axplore Travel account. No changes have been made yet.</p>
    <p style="font-size: 15px;">You can reset your password by clicking the secure button below:</p>
    
    <div style="text-align: center; margin: 35px 0;">
      <a href="${resetLink}" style="background-color: #0061A0; color: #ffffff; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; font-size: 16px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">Reset My Password</a>
    </div>
    
    <p style="font-size: 14px; color: #666666; border-left: 4px solid #0061A0; padding-left: 15px; margin: 25px 0;">
      <strong>Security Note:</strong> For your protection, this link will expire in <span style="color: #dc3545; font-weight: bold;">10 minutes</span>.
    </p>
    
    <p style="margin-bottom: 0; font-size: 14px; color: #666666;">If you didn't request this change, please ignore this email or contact support if you have concerns. Your account remains secure.</p>
  `;

  return getBaseLayout(content, frontendUrl);
};

/**
 * Template for Lead Assignment Email
 */
const getLeadAssignmentTemplate = (fullName, leadDisplayName, frontendUrl, greeting = 'Dear', message = 'has been assigned to you', tripDetails = null, options = {}) => {
  const formatCurrency = (amt) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amt);
  const formatDate = (dateValue) => {
    if (!dateValue) return 'N/A';
    const date = new Date(dateValue);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  };

  const tripSection = tripDetails ? `
    <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; margin-top: 25px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
      <div style="background-color: #0061A0; border-top-left-radius: 9px; border-top-right-radius: 9px; padding: 12px 20px;">
        <h3 style="margin: 0; font-size: 16px; color: #ffffff; letter-spacing: 0.5px;">✓ Trip Specifications</h3>
      </div>
      <div style="padding: 20px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 15px;">
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 12px 10px; color: #64748b; width: 140px; font-weight: 500;">📌 Trip Name</td>
            <td style="padding: 12px 10px; color: #0f172a; font-weight: 600;">${tripDetails.tripName || 'N/A'}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 12px 10px; color: #64748b; font-weight: 500;">💰 Total Budget</td>
            <td style="padding: 12px 10px; color: #059669; font-weight: 600;">${tripDetails.totalBudget ? formatCurrency(tripDetails.totalBudget) : 'N/A'}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 12px 10px; color: #64748b; font-weight: 500;">👥 Travelers</td>
            <td style="padding: 12px 10px; color: #0f172a; font-weight: 600;">${tripDetails.numberOfTravelers || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 12px 10px; color: #64748b; font-weight: 500;">📅 Date</td>
            <td style="padding: 12px 10px; color: #0f172a; font-weight: 600;">${tripDetails.checkInDate ? formatDate(tripDetails.checkInDate) : (tripDetails.travelMonth || 'N/A')}</td>
          </tr>
        </table>
      </div>
    </div>
  ` : '';
  const documentSection = getDocumentSection(options.documentTitles);

  const content = `
    <h2 style="margin-top: 0; color: #0061A0; font-size: 22px; font-weight: 600;">Lead Assignment Notification</h2>
    <p style="font-size: 16px; color: #334155; margin-bottom: 8px;">${greeting} <strong style="color: #0f172a;">${fullName}</strong>,</p>
    <p style="font-size: 15px; color: #475569; line-height: 1.6;">You have received a new assignment for lead <strong style="color: #0f172a; background-color: #f1f5f9; padding: 2px 6px; border-radius: 4px;">${leadDisplayName}</strong>.</p>
    <p style="font-size: 15px; color: #475569; line-height: 1.6;">This lead ${message}. Please review the details below and log in to your dashboard to take the required action.</p>
    
    ${tripSection}
    ${documentSection}
    
    <div style="text-align: center; margin: 35px 0;">
      <a href="${frontendUrl}" style="background-color: #0061A0; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; font-size: 15px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">Log In to Dashboard</a>
    </div>

    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 25px 0;">
    <p style="font-size: 14px; color: #64748b;">Please ensure prompt follow-up on this assignment. If you have any queries, kindly reach out to the operations team.</p>
  `;

  return getBaseLayout(content, frontendUrl);
};

/**
 * Template for SalesREP / Contracting Head notice when Contracting Team is assigned
 */
const getContractingTeamAssignedTemplate = (fullName, leadDisplayName, frontendUrl, teamMemberNames = [], tripDetails = null, options = {}) => {
  const formatCurrency = (amt) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amt);
  const teamNames = [...new Set((teamMemberNames || []).filter(Boolean).map((name) => String(name).trim()))];
  const teamList = teamNames.length
    ? `<ul style="margin: 0; padding-left: 20px;">${teamNames.map((name) => `<li style="margin: 6px 0; color: #0f172a; font-weight: 600;">${escapeHtml(name)}</li>`).join('')}</ul>`
    : '<p style="margin: 0; color: #475569;">Contracting Team has been assigned.</p>';

  const tripSection = tripDetails ? `
    <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; margin-top: 25px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
      <div style="background-color: #0061A0; border-top-left-radius: 9px; border-top-right-radius: 9px; padding: 12px 20px;">
        <h3 style="margin: 0; font-size: 16px; color: #ffffff; letter-spacing: 0.5px;">Trip Specifications</h3>
      </div>
      <div style="padding: 20px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 15px;">
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 12px 10px; color: #64748b; width: 140px; font-weight: 500;">Trip Name</td>
            <td style="padding: 12px 10px; color: #0f172a; font-weight: 600;">${escapeHtml(tripDetails.tripName || 'N/A')}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 12px 10px; color: #64748b; font-weight: 500;">Total Budget</td>
            <td style="padding: 12px 10px; color: #059669; font-weight: 600;">${tripDetails.totalBudget ? formatCurrency(tripDetails.totalBudget) : 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 12px 10px; color: #64748b; font-weight: 500;">Travelers</td>
            <td style="padding: 12px 10px; color: #0f172a; font-weight: 600;">${escapeHtml(tripDetails.numberOfTravelers || 'N/A')}</td>
          </tr>
        </table>
      </div>
    </div>
  ` : '';
  const documentSection = getDocumentSection(options.documentTitles);

  const content = `
    <h2 style="margin-top: 0; color: #0061A0; font-size: 22px; font-weight: 600;">Contracting Team Assigned</h2>
    <p style="font-size: 16px; color: #334155; margin-bottom: 8px;">Dear <strong style="color: #0f172a;">${escapeHtml(fullName || 'Valued User')}</strong>,</p>
    <p style="font-size: 15px; color: #475569; line-height: 1.6;">A Contracting Team has been assigned for lead <strong style="color: #0f172a; background-color: #f1f5f9; padding: 2px 6px; border-radius: 4px;">${escapeHtml(leadDisplayName)}</strong>.</p>
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; margin-top: 20px; padding: 18px 20px;">
      <h3 style="margin: 0 0 10px 0; font-size: 16px; color: #0f172a;">Assigned Team Member${teamNames.length === 1 ? '' : 's'}</h3>
      ${teamList}
    </div>
    ${tripSection}
    ${documentSection}
    <div style="text-align: center; margin: 35px 0;">
      <a href="${frontendUrl}" style="background-color: #0061A0; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; font-size: 15px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">Log In to Dashboard</a>
    </div>
    <p style="font-size: 14px; color: #64748b;">This is an automated notification so SalesREP and Contracting Head are aware as soon as the Contracting Team is assigned.</p>
  `;

  return getBaseLayout(content, frontendUrl);
};

/**
 * Template for Password Changed Success Email
 */
const getPasswordSuccessTemplate = (firstName, frontendUrl) => {
  const content = `
    <h2 style="margin-top: 0; color: #28a745; font-size: 22px; font-weight: 600;">Password Changed Successfully</h2>
    <p style="font-size: 16px;">Hello ${firstName || 'Valued User'},</p>
    <p style="font-size: 15px;">This is a confirmation that the password for your Axplore Travel account has been successfully changed.</p>
    
    <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 25px 0; border-left: 4px solid #28a745;">
      <p style="margin: 0; font-size: 14px; color: #495057;"><strong>Action:</strong> Password Update</p>
      <p style="margin: 5px 0 0 0; font-size: 14px; color: #495057;"><strong>Status:</strong> Success</p>
      <p style="margin: 5px 0 0 0; font-size: 14px; color: #495057;"><strong>Time:</strong> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
    </div>
    
    <p style="font-size: 15px;">If you performed this change, you can safely ignore this email. You can now log in using your new password.</p>
    
    <div style="text-align: center; margin: 35px 0;">
      <a href="${frontendUrl}/login" style="background-color: #0061A0; color: #ffffff; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; font-size: 16px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">Log In Now</a>
    </div>
    
    <p style="font-size: 14px; color: #666666; padding-top: 15px; border-top: 1px solid #eeeeee; margin-top: 25px;">
      <strong>Important Security Note:</strong> If you did <strong>not</strong> authorize this change, please contact our security team immediately at support@axploretravel.com to secure your account.
    </p>
  `;

  return getBaseLayout(content, frontendUrl);
};

/**
 * Template for Welcome Email (Set Password)
 */
const getWelcomeTemplate = (token, firstName, frontendUrl) => {
  const setupLink = `${frontendUrl}/reset-password?token=${token}`;

  const content = `
    <h2 style="margin-top: 0; color: #0061A0; font-size: 22px; font-weight: 600;">Welcome to Axplore Travel!</h2>
    <p style="font-size: 16px;">Hello ${firstName || 'Valued User'},</p>
    <p style="font-size: 15px;">Your account for the Axplore Travel Management System has been created successfully.</p>
    <p style="font-size: 15px;">To get started and set your account password, please click the secure button below:</p>
    
    <div style="text-align: center; margin: 35px 0;">
      <a href="${setupLink}" style="background-color: #0061A0; color: #ffffff; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; font-size: 16px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">Set My Password</a>
    </div>
    
    <p style="font-size: 14px; color: #666666; border-left: 4px solid #0061A0; padding-left: 15px; margin: 25px 0;">
      <strong>Note:</strong> For security reasons, this setup link is only valid for a limited time.
    </p>
    
    <p style="margin-bottom: 0; font-size: 14px; color: #666666;">If you have any questions, please reach out to your administrator.</p>
  `;

  return getBaseLayout(content, frontendUrl);
};

/**
 * Template for Lead Assignment Reminder Email
 */
const getLeadReminderTemplate = (fullName, leadDisplayName, frontendUrl, reminderStage, maxReminders, tripDetails = null, options = {}) => {
  const formatCurrency = (amt) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amt);
  const formatDate = (dateValue) => {
    if (!dateValue) return 'N/A';
    const date = new Date(dateValue);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  };

  const tripSection = tripDetails ? `
    <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; margin-top: 25px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
      <div style="background-color: #f59e0b; border-top-left-radius: 9px; border-top-right-radius: 9px; padding: 12px 20px;">
        <h3 style="margin: 0; font-size: 16px; color: #ffffff; letter-spacing: 0.5px;">📌 Trip Specifications</h3>
      </div>
      <div style="padding: 20px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 15px;">
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 12px 10px; color: #64748b; width: 140px; font-weight: 500;">Trip Name</td>
            <td style="padding: 12px 10px; color: #0f172a; font-weight: 600;">${tripDetails.tripName || 'N/A'}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 12px 10px; color: #64748b; font-weight: 500;">Total Budget</td>
            <td style="padding: 12px 10px; color: #059669; font-weight: 600;">${tripDetails.totalBudget ? formatCurrency(tripDetails.totalBudget) : 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 12px 10px; color: #64748b; font-weight: 500;">Date</td>
            <td style="padding: 12px 10px; color: #0f172a; font-weight: 600;">${tripDetails.checkInDate ? formatDate(tripDetails.checkInDate) : (tripDetails.travelMonth || 'N/A')}</td>
          </tr>
        </table>
      </div>
    </div>
  ` : '';

  const content = `
    <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 15px; margin-bottom: 25px;">
      <p style="margin: 0; color: #92400e; font-weight: 600; font-size: 14px;">⚠️ REMINDER ${reminderStage} of ${maxReminders}</p>
    </div>
    
    <h2 style="margin-top: 0; color: #0061A0; font-size: 22px; font-weight: 600;">Action Required: Lead Assignment Pending</h2>
    <p style="font-size: 16px; color: #334155; margin-bottom: 8px;">Dear <strong style="color: #0f172a;">${fullName}</strong>,</p>
    <p style="font-size: 15px; color: #475569; line-height: 1.6;">This is a follow-up reminder regarding lead <strong style="color: #0f172a;">${leadDisplayName}</strong> which was assigned to you as Contracting Head.</p>
    <p style="font-size: 15px; color: #475569; line-height: 1.6;">Our records show that a contracting team has not yet been assigned to this lead. Please take the necessary action to ensure the lead is processed timely.</p>
    
    ${tripSection}
    
    <div style="text-align: center; margin: 35px 0;">
      <a href="${frontendUrl}" style="background-color: #0061A0; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; font-size: 15px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">Log In to Dashboard</a>
    </div>

    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 25px 0;">
    <p style="font-size: 14px; color: #64748b;">If you have already assigned a team, please ignore this email. This is an automated notification.</p>
  `;

  return getBaseLayout(content, frontendUrl);
};

module.exports = {
  getResetPasswordTemplate,
  getLeadAssignmentTemplate,
  getContractingTeamAssignedTemplate,
  getPasswordSuccessTemplate,
  getWelcomeTemplate,
  getLeadReminderTemplate
};
