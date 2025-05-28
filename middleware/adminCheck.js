
// File: middleware/adminCheck.js
const User = require('../models/user/user');

module.exports = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin privileges required' });
    }
    
    next();
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};