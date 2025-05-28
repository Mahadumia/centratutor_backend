// File: utils\brevoEmailService.js

const SibApiV3Sdk = require('sib-api-v3-sdk');

class BrevoEmailService {
  constructor() {
    this.defaultClient = SibApiV3Sdk.ApiClient.instance;
    
    // Configure API key authorization
    this.apiKey = this.defaultClient.authentications['api-key'];
    
    // Initialize with API key from environment
    this.initializeApiKey();
  }

  /**
   * Initialize the API key from environment variables
   * Can be called again to reinitialize if environment changes
   */
  initializeApiKey() {
    // Get the API key from environment
    const apiKeyValue = process.env.BREVO_API_KEY;
    
    if (!apiKeyValue) {
      console.error('BREVO_API_KEY is missing in environment variables');
      this.apiInstance = null;
      return false;
    }
    
    try {
      // Set API key for authorization
      this.apiKey.apiKey = apiKeyValue;
      // Create API instance
      this.apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
      console.log('Brevo Email Service initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize Brevo Email Service:', error);
      this.apiInstance = null;
      return false;
    }
  }

  /**
   * Send a transactional email using Brevo API
   * 
   * @param {Object} options - Email options
   * @param {string} options.to - Recipient email address
   * @param {string} options.toName - Recipient name
   * @param {string} options.subject - Email subject
   * @param {string} options.htmlContent - HTML content of the email
   * @param {string} options.from - Sender email (defaults to environment variable)
   * @param {string} options.fromName - Sender name (defaults to 'Centratutor')
   * @returns {Promise} - API response
   */
  async sendEmail({ to, toName, subject, htmlContent, from, fromName }) {
    try {
      // Try to initialize again in case the environment was updated
      if (!this.apiInstance) {
        this.initializeApiKey();
      }

      // Verify API instance is configured
      if (!this.apiInstance) {
        throw new Error('Brevo API is not configured properly');
      }

      const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
      
      sendSmtpEmail.to = [{ email: to, name: toName }];
      sendSmtpEmail.subject = subject;
      sendSmtpEmail.htmlContent = htmlContent;
      sendSmtpEmail.sender = { 
        email: from || process.env.FROM_EMAIL || 'mahadumia@gmail.com',
        name: fromName || 'Centratutor'
      };
      
      const data = await this.apiInstance.sendTransacEmail(sendSmtpEmail);
      console.log('Email sent successfully. MessageId:', data.messageId);
      return data;
    } catch (error) {
      console.error('Error sending email via Brevo API:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  /**
   * Send verification code email to a user
   * 
   * @param {Object} user - User object with name and email
   * @param {string} verificationCode - 6-digit verification code
   * @returns {Promise} - API response
   */
  async sendVerificationCode(user, verificationCode) {
    try {
      const htmlContent = `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
          <div style="background: linear-gradient(135deg, #002855, #EFA09A); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Centratutor!</h1>
            <p style="color: white; margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Verify your email to get started</p>
          </div>
          
          <div style="background: #f9f9f9; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
            <p style="font-size: 16px; color: #333; margin-bottom: 20px;">Hi ${user.name},</p>
            
            <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
              Thank you for joining Centratutor! To get started with your 3-day free trial, please verify your email address using the verification code below:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <div style="background: linear-gradient(135deg, #002855, #004080); color: white; padding: 20px; border-radius: 12px; font-size: 32px; font-weight: bold; letter-spacing: 8px; display: inline-block; box-shadow: 0 4px 15px rgba(0, 40, 85, 0.3); border: 3px solid #EFA09A;">
                ${verificationCode}
              </div>
            </div>
            
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center;">
              <p style="margin: 0; color: #856404; font-weight: bold;">
                ⏰ This code will expire in 5 minutes
              </p>
            </div>
            
            <div style="background: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #0c5460; margin: 0 0 10px 0; font-size: 18px;">🎉 Your 3-day free trial includes:</h3>
              <ul style="color: #0c5460; margin: 10px 0; padding-left: 20px;">
                <li style="margin-bottom: 8px;">Full access to all courses and materials</li>
                <li style="margin-bottom: 8px;">Practice quizzes and past questions</li>
                <li style="margin-bottom: 8px;">Tutorial videos and skills classes</li>
              </ul>
            </div>
            
            <p style="font-size: 14px; color: #666; text-align: center; margin-top: 30px;">
              If you didn't create this account, please ignore this email.
            </p>
          </div>
          
          <div style="text-align: center; color: #666; font-size: 12px;">
            <p>&copy; 2025 Centratutor. All rights reserved.</p>
          </div>
        </div>
      `;

      return await this.sendEmail({
        to: user.email,
        toName: user.name,
        subject: 'Welcome to Centratutor - Verify Your Email',
        htmlContent
      });
    } catch (error) {
      console.error('Error sending verification code email:', error);
      throw new Error('Failed to send verification code email');
    }
  }

  /**
   * Send password reset code email to a user
   * 
   * @param {Object} user - User object with name and email
   * @param {string} resetCode - 6-digit reset code
   * @returns {Promise} - API response
   */
  async sendPasswordResetCode(user, resetCode) {
    try {
      const htmlContent = `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
          <div style="background: linear-gradient(135deg, #002855, #EFA09A); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Password Reset Request</h1>
            <p style="color: white; margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Secure your account with a new password</p>
          </div>
          
          <div style="background: #f9f9f9; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
            <p style="font-size: 16px; color: #333; margin-bottom: 20px;">Hi ${user.name},</p>
            
            <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
              You requested to reset your password for your Centratutor account. Please use the following code to reset your password:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <div style="background: linear-gradient(135deg, #dc3545, #c82333); color: white; padding: 20px; border-radius: 12px; font-size: 32px; font-weight: bold; letter-spacing: 8px; display: inline-block; box-shadow: 0 4px 15px rgba(220, 53, 69, 0.3); border: 3px solid #EFA09A;">
                ${resetCode}
              </div>
            </div>
            
            <div style="background: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center;">
              <p style="margin: 0; color: #721c24; font-weight: bold;">
                ⏰ This code will expire in 5 minutes
              </p>
            </div>
            
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #856404; margin: 0 0 10px 0; font-size: 18px;">🔒 Security Notice:</h3>
              <ul style="color: #856404; margin: 10px 0; padding-left: 20px;">
                <li style="margin-bottom: 8px;">Never share this code with anyone</li>
                <li style="margin-bottom: 8px;">If you didn't request this reset, please ignore this email</li>
                <li style="margin-bottom: 8px;">Your password will remain unchanged until you create a new one</li>
              </ul>
            </div>
            
            <p style="font-size: 14px; color: #666; text-align: center; margin-top: 30px;">
              This is an automated security message from Centratutor.
            </p>
          </div>
          
          <div style="text-align: center; color: #666; font-size: 12px;">
            <p>&copy; 2025 Centratutor. All rights reserved.</p>
          </div>
        </div>
      `;

      return await this.sendEmail({
        to: user.email,
        toName: user.name,
        subject: 'Centratutor - Password Reset Code',
        htmlContent
      });
    } catch (error) {
      console.error('Error sending password reset code email:', error);
      throw new Error('Failed to send password reset code email');
    }
  }

  /**
   * Send account deletion confirmation email to a user
   * (Simple confirmation email sent after successful deletion)
   * 
   * @param {Object} user - User object with name and email
   * @returns {Promise} - API response
   */
  async sendAccountDeletionConfirmation(user) {
    try {
      const htmlContent = `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
          <div style="background: linear-gradient(135deg, #002855, #EFA09A); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Account Deleted</h1>
          </div>
          
          <div style="background: #f9f9f9; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
            <p style="font-size: 16px; color: #333; margin-bottom: 20px;">Hi ${user.name},</p>
            
            <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
              Your Centratutor account has been permanently deleted as requested.
            </p>
            
            <div style="background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #155724;">
                ✅ All your personal data and account information have been securely removed from our systems.
              </p>
            </div>
            
            <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
              We're sorry to see you go! If you ever decide to return, you'll need to create a new account.
            </p>
            
            <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
              Thank you for using Centratutor. We wish you the best in your learning journey.
            </p>
          </div>
          
          <div style="text-align: center; color: #666; font-size: 12px;">
            <p>This is an automated message from Centratutor</p>
            <p>You will not receive any further emails from us.</p>
          </div>
        </div>
      `;

      return await this.sendEmail({
        to: user.email,
        toName: user.name,
        subject: 'Account Successfully Deleted - Centratutor',
        htmlContent
      });
    } catch (error) {
      console.error('Error sending account deletion confirmation email:', error);
      throw new Error('Failed to send account deletion confirmation email');
    }
  }
}

module.exports = new BrevoEmailService();