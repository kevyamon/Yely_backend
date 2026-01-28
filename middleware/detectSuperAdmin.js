// middleware/detectSuperAdmin.js

import User from '../models/userModel.js';

const autoPromoteToSuperAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return next();
    }

    const superAdminEmail = process.env.ADMIN_MAIL;
    
    if (req.user.email === superAdminEmail && req.user.role !== 'superAdmin') {
      const user = await User.findById(req.user._id);
      user.role = 'superAdmin';
      await user.save();
      
      req.user.role = 'superAdmin';
      console.log(`✅ Auto-promotion SuperAdmin : ${user.email}`);
    }

    next();

  } catch (error) {
    console.error('❌ Erreur auto-promotion SuperAdmin:', error);
    next();
  }
};

export { autoPromoteToSuperAdmin }; 
