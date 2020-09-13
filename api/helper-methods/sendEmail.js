const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

/**
 * @param {string} email - email to send
 * @param {image} from - from email
 * @param {string} subject - subject of email
 * @param {string} text - text should be plain version of html
 * @param {string} html - html for email
 */
async function sendEmail(email, from, subject, text, html) {
  try {
    const msg = {
      to: email,
      from: from,
      subject: subject,
      text: text, // text should be plain version of html
      html: html,
    };
    await sgMail.send(msg);
  } catch (error) {
    throw new Error(error.message);
  }
}

module.exports = sendEmail;
