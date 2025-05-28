// File: middleware/auth.js - FIXED VERSION WITH DEBUG
const jwt = require('jsonwebtoken');
const User = require('../models/user/user');

module.exports = async (req, res, next) => {
  try {
    let token = null;
    
    // Check for token in multiple header formats
    const authHeader = req.header('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7); // Remove 'Bearer ' prefix
    } else if (req.header('x-auth-token')) {
      token = req.header('x-auth-token');
    }
    
    console.log('🔍 AUTH DEBUG: Token received:', token ? 'YES' : 'NO');
    
    if (!token) {
      return res.status(401).json({ 
        message: 'No token, authorization denied',
        code: 'NO_TOKEN'
      });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('🔍 AUTH DEBUG: Token decoded successfully');
    console.log('🔍 AUTH DEBUG: Decoded payload:', {
      userId: decoded.user?.id,
      iat: decoded.iat,
      exp: decoded.exp
    });
    
    // CRITICAL FIX: Ensure we have the user ID
    if (!decoded.user || !decoded.user.id) {
      console.log('🔍 AUTH DEBUG: Invalid token payload - missing user.id');
      return res.status(401).json({ 
        message: 'Invalid token payload',
        code: 'INVALID_TOKEN_PAYLOAD'
      });
    }
    
    // Check if user still exists (handles deleted users)
    const user = await User.findById(decoded.user.id);
    if (!user) {
      console.log('🔍 AUTH DEBUG: User not found in database:', decoded.user.id);
      return res.status(401).json({ 
        message: 'User not found. Account may have been deleted.',
        code: 'USER_NOT_FOUND'
      });
    }
    
    console.log('🔍 AUTH DEBUG: User found:', {
      id: user._id,
      email: user.email,
      name: user.name
    });
    
    // Attach user info to request
    req.user = {
      id: decoded.user.id,
      email: user.email,
      name: user.name
    };
    
    console.log('🔍 AUTH DEBUG: req.user set to:', req.user);
    
    next();
    
  } catch (error) {
    console.error('🔍 AUTH DEBUG: Auth middleware error:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        message: 'Your session has expired. Please log in again.',
        code: 'TOKEN_EXPIRED',
        expired: true 
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        message: 'Invalid token format.',
        code: 'INVALID_TOKEN'
      });
    }
    
    // Generic token validation error
    return res.status(401).json({ 
      message: 'Token is not valid',
      code: 'TOKEN_INVALID'
    });
  }
};