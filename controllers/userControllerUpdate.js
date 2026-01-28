  // controllers/userControllerUpdate.js

import asyncHandler from '../middleware/asyncHandler.js';
import User from '../models/userModel.js';
import generateToken from '../utils/generateToken.js';

const authUserWithSuperAdminDetection = asyncHandler(async (req, res) => {
  const { emailOrPhone, password } = req.body;

  const user = await User.findOne({
    $or: [{ email: emailOrPhone }, { phone: emailOrPhone }]
  });

  if (user && (await user.matchPassword(password))) {
    const superAdminEmail = process.env.ADMIN_MAIL;
    
    if (user.email === superAdminEmail && user.role !== 'superAdmin') {
      user.role = 'superAdmin';
      await user.save();
    }

    const token = generateToken(res, user._id);

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      token: token,
      driverId: user.driverId,
      vehicleInfo: user.vehicleInfo,
      subscription: user.subscription
    });
  } else {
    res.status(401);
    throw new Error('Email ou mot de passe incorrect');
  }
});

export { authUserWithSuperAdminDetection };
