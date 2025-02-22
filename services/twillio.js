// services/twilio.js
import User from '../models/user.js';
import { generateOtp } from '../utils/otp.js';



export const storeOtp = async (phone, otp) => {
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 5); // OTP expires in 5 minutes

  const otpRecord = new User({
    phone,
    otp,
    expiresAt,
  });

  await otpRecord.save();
};

export const verifyOtp = async (phone, receivedOtp) => {
  const otpRecord = await User.findOne({ phone });

  if (!otpRecord) {
    throw new Error('No OTP found for this phone number.');
  }

  if (new Date() > otpRecord.expiresAt) {
    throw new Error('OTP has expired.');
  }

  if (otpRecord.otp !== receivedOtp) {
    throw new Error('Invalid OTP.');
  }

  // OTP is valid, delete it after verification
  await User.deleteOne({ phone });

  return true;
};
