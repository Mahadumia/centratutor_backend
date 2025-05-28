// File: routes/auth/auth.js - COMPLETE AUTH ROUTES WITH BREVO EMAIL SERVICE
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../../models/user/user');
const Subscription = require('../../models/subscription/subscription');
const auth = require('../../middleware/auth');
const crypto = require('crypto');
// Import Brevo email service
const brevoEmailService = require('../../utils/brevoEmailService');

// FIXED: Sign up route with proper trial subscription and Brevo email
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, country, interest } = req.body;

    // Validate required fields
    if (!name || !email || !password || !country || !interest) {
      return res.status(400).json({ 
        message: 'All fields are required' 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ 
        message: 'User already exists with this email' 
      });
    }

    // Generate verification code
    const verificationCode = crypto.randomInt(100000, 999999).toString();
    const verificationExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Create new user
    const user = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password, // Will be hashed by pre-save middleware
      country: country.trim(),
      interest,
      emailVerificationCode: verificationCode,
      emailVerificationExpiry: verificationExpiry,
      isEmailVerified: false
    });

    await user.save();
    console.log(`🔍 AUTH DEBUG: User created with ID: ${user._id}`);

    // FIXED: Create 3-day trial subscription with correct plan
    const trialDays = 3;
    const activatedAt = new Date();
    const expiresAt = new Date(activatedAt);
    expiresAt.setDate(expiresAt.getDate() + trialDays);

    const trialSubscription = new Subscription({
      plan: '3days', // FIXED: Explicitly set to 3days plan
      totalDays: trialDays,
      activationMethod: 'signup', // Changed from 'code' to 'signup' for clarity
      user: user._id,
      activatedAt: activatedAt,
      expiresAt: expiresAt,
      active: true
    });

    await trialSubscription.save();
    console.log(`🔍 AUTH DEBUG: Trial subscription created - Plan: ${trialSubscription.plan}, Days: ${trialSubscription.totalDays}`);

    // Generate JWT token
    const payload = {
      user: {
        id: user._id
      }
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { 
      expiresIn: '7d' 
    });

    // Send verification email using Brevo service
    try {
      await brevoEmailService.sendVerificationCode(
        { name: user.name, email: user.email }, 
        verificationCode
      );
      console.log(`🔍 AUTH DEBUG: Verification email sent to ${email}`);
    } catch (emailError) {
      console.error('🔍 AUTH DEBUG: Email sending failed:', emailError);
      // Don't fail the registration if email fails
    }

    // Return success response
    res.status(201).json({
      message: 'Account created successfully! Please check your email for verification code.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        country: user.country,
        interest: user.interest,
        isEmailVerified: user.isEmailVerified
      },
      subscription: {
        _id: trialSubscription._id,
        plan: trialSubscription.plan,
        totalDays: trialSubscription.totalDays,
        active: trialSubscription.active,
        activatedAt: trialSubscription.activatedAt,
        expiresAt: trialSubscription.expiresAt,
        daysRemaining: trialSubscription.daysRemaining,
        activationMethod: trialSubscription.activationMethod
      },
      token,
      requiresVerification: true
    });

  } catch (error) {
    console.error('🔍 AUTH DEBUG: Signup error:', error);
    
    // Handle specific MongoDB duplicate key errors
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'User already exists with this email' 
      });
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: validationErrors
      });
    }
    
    res.status(500).json({ 
      message: 'Server error during registration' 
    });
  }
});

// Verify email with code
router.post('/verify-code', async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ 
        message: 'Email and verification code are required' 
      });
    }

    // Find user with matching email and verification code
    const user = await User.findOne({
      email: email.toLowerCase(),
      emailVerificationCode: code,
      emailVerificationExpiry: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ 
        message: 'Invalid or expired verification code' 
      });
    }

    // Mark email as verified and clear verification fields
    user.isEmailVerified = true;
    user.emailVerificationCode = undefined;
    user.emailVerificationExpiry = undefined;
    await user.save();

    // Get user's subscription
    const subscription = await Subscription.findOne({ 
      user: user._id,
      active: true 
    }).sort({ createdAt: -1 });

    res.json({
      message: 'Email verified successfully!',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        country: user.country,
        interest: user.interest,
        isEmailVerified: user.isEmailVerified
      },
      subscription: subscription ? {
        _id: subscription._id,
        plan: subscription.plan,
        totalDays: subscription.totalDays,
        active: subscription.active,
        activatedAt: subscription.activatedAt,
        expiresAt: subscription.expiresAt,
        daysRemaining: subscription.daysRemaining,
        activationMethod: subscription.activationMethod
      } : null
    });

  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ 
      message: 'Server error during verification' 
    });
  }
});

// Resend verification code
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        message: 'Email is required' 
      });
    }

    // Find user by email
    const user = await User.findOne({ 
      email: email.toLowerCase() 
    });

    if (!user) {
      return res.status(400).json({ 
        message: 'No account found with this email' 
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ 
        message: 'Email is already verified' 
      });
    }

    // Generate new verification code
    const verificationCode = crypto.randomInt(100000, 999999).toString();
    const verificationExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Update user with new code
    user.emailVerificationCode = verificationCode;
    user.emailVerificationExpiry = verificationExpiry;
    await user.save();

    // Send verification email using Brevo service
    try {
      await brevoEmailService.sendVerificationCode(
        { name: user.name, email: user.email }, 
        verificationCode
      );
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      return res.status(500).json({ 
        message: 'Failed to send verification email' 
      });
    }

    res.json({
      message: 'New verification code sent to your email'
    });

  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ 
      message: 'Server error during resend' 
    });
  }
});

// FIXED: Login route to properly include subscription data
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ 
        message: 'Email and password are required' 
      });
    }

    // Find user and include password for comparison
    const user = await User.findOne({ 
      email: email.toLowerCase() 
    }).select('+password');

    if (!user) {
      return res.status(400).json({ 
        message: 'Invalid email or password' 
      });
    }

    // Check if account is locked
    if (user.isLocked()) {
      const lockTimeRemaining = Math.ceil((user.lockUntil - Date.now()) / (60 * 1000));
      return res.status(423).json({ 
        message: `Account is temporarily locked. Try again in ${lockTimeRemaining} minutes.` 
      });
    }

    // Compare password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      // Handle failed login attempt
      await user.handleFailedLogin();
      
      const attemptsRemaining = 5 - user.loginAttempts;
      return res.status(400).json({ 
        message: `Invalid email or password. ${attemptsRemaining} attempts remaining.` 
      });
    }

    // Reset login attempts on successful login
    if (user.loginAttempts > 0) {
      user.loginAttempts = 0;
      user.accountLocked = false;
      user.lockUntil = undefined;
    }
    
    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Get user's active subscription
    const subscription = await Subscription.findOne({ 
      user: user._id,
      active: true 
    }).sort({ createdAt: -1 });

    console.log(`🔍 AUTH DEBUG: Login - User: ${user._id}, Subscription found: ${subscription ? 'YES' : 'NO'}`);
    if (subscription) {
      console.log(`🔍 AUTH DEBUG: Login - Subscription plan: ${subscription.plan}, active: ${subscription.active}`);
    }

    // Generate JWT token
    const payload = {
      user: {
        id: user._id
      }
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { 
      expiresIn: '7d' 
    });

    res.json({
      message: 'Login successful',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        country: user.country,
        interest: user.interest,
        isEmailVerified: user.isEmailVerified,
        lastLogin: user.lastLogin
      },
      subscription: subscription ? {
        _id: subscription._id,
        plan: subscription.plan,
        totalDays: subscription.totalDays,
        active: subscription.active,
        activatedAt: subscription.activatedAt,
        expiresAt: subscription.expiresAt,
        daysRemaining: subscription.daysRemaining,
        activationMethod: subscription.activationMethod
      } : null,
      token
    });

  } catch (error) {
    console.error('🔍 AUTH DEBUG: Login error:', error);
    res.status(500).json({ 
      message: 'Server error during login' 
    });
  }
});

// Forgot password - sends reset code
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        message: 'Email is required' 
      });
    }

    // Find user by email
    const user = await User.findOne({ 
      email: email.toLowerCase() 
    });

    if (!user) {
      return res.status(400).json({ 
        message: 'No account found with this email address' 
      });
    }

    // Check if there's already a valid reset token
    if (user.passwordResetCode && user.passwordResetExpiry && user.passwordResetExpiry > new Date()) {
      return res.status(200).json({
        message: 'A password reset code has already been sent to your email and is still valid.',
        tokenExists: true,
        tokenValid: true
      });
    }

    // Generate reset code and session token
    const resetCode = crypto.randomInt(100000, 999999).toString();
    const resetExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    const sessionToken = crypto.randomBytes(32).toString('hex');

    // Update user with reset code
    user.passwordResetCode = resetCode;
    user.passwordResetExpiry = resetExpiry;
    user.passwordResetSessionToken = sessionToken;
    await user.save();

    // Send reset email using Brevo service
    try {
      await brevoEmailService.sendPasswordResetCode(
        { name: user.name, email: user.email }, 
        resetCode
      );
    } catch (emailError) {
      console.error('Reset email sending failed:', emailError);
      return res.status(500).json({ 
        message: 'Failed to send reset email' 
      });
    }

    res.json({
      message: 'Password reset code sent to your email',
      tokenExists: false,
      tokenValid: false
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ 
      message: 'Server error during password reset request' 
    });
  }
});

// Verify reset code
router.post('/verify-reset-code', async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ 
        message: 'Email and reset code are required' 
      });
    }

    // Find user with matching email and reset code
    const user = await User.findOne({
      email: email.toLowerCase(),
      passwordResetCode: code,
      passwordResetExpiry: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ 
        message: 'Invalid or expired reset code' 
      });
    }

    res.json({
      message: 'Reset code verified successfully',
      resetSessionToken: user.passwordResetSessionToken
    });

  } catch (error) {
    console.error('Reset code verification error:', error);
    res.status(500).json({ 
      message: 'Server error during code verification' 
    });
  }
});

// Reset password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, resetSessionToken, newPassword } = req.body;

    if (!email || !resetSessionToken || !newPassword) {
      return res.status(400).json({ 
        message: 'Email, reset session token, and new password are required' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        message: 'Password must be at least 6 characters long' 
      });
    }

    // Find user with matching email and session token
    const user = await User.findOne({
      email: email.toLowerCase(),
      passwordResetSessionToken: resetSessionToken,
      passwordResetExpiry: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ 
        message: 'Invalid or expired reset session' 
      });
    }

    // Update password and clear reset fields
    user.password = newPassword; // Will be hashed by pre-save middleware
    user.passwordResetCode = undefined;
    user.passwordResetExpiry = undefined;
    user.passwordResetSessionToken = undefined;
    
    // Reset any account lockout
    user.loginAttempts = 0;
    user.accountLocked = false;
    user.lockUntil = undefined;
    
    await user.save();

    res.json({
      message: 'Password reset successfully. You can now login with your new password.'
    });

  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ 
      message: 'Server error during password reset' 
    });
  }
});

// Delete account
router.delete('/delete-account', auth, async (req, res) => {
  try {
    const { password, confirmationText } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!password || !confirmationText) {
      return res.status(400).json({ 
        message: 'Password and confirmation text are required' 
      });
    }

    // Check confirmation text
    if (confirmationText.toLowerCase() !== 'delete my account') {
      return res.status(400).json({ 
        message: 'Please type "delete my account" to confirm account deletion' 
      });
    }

    // Find user with password
    const user = await User.findById(userId).select('+password');
    if (!user) {
      return res.status(404).json({ 
        message: 'User not found' 
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(400).json({ 
        message: 'Invalid password' 
      });
    }

    // Store user info for confirmation email before deletion
    const userInfo = {
      name: user.name,
      email: user.email
    };

    // Delete user's subscriptions
    await Subscription.deleteMany({ user: userId });

    // Delete the user
    await User.findByIdAndDelete(userId);

    // Send account deletion confirmation email
    try {
      await brevoEmailService.sendAccountDeletionConfirmation(userInfo);
    } catch (emailError) {
      console.error('Account deletion confirmation email failed:', emailError);
      // Don't fail the deletion if email fails
    }

    res.json({
      message: 'Account deleted successfully'
    });

  } catch (error) {
    console.error('Account deletion error:', error);
    res.status(500).json({ 
      message: 'Server error during account deletion' 
    });
  }
});

// Verify token endpoint (for token validation)
router.get('/verify-token', auth, async (req, res) => {
  try {
    // If we reach here, the token is valid (auth middleware validates it)
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ 
        message: 'User not found' 
      });
    }

    res.json({
      valid: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        country: user.country,
        interest: user.interest,
        isEmailVerified: user.isEmailVerified
      }
    });

  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({ 
      message: 'Server error during token verification' 
    });
  }
});

module.exports = router;