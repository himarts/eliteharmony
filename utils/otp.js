// utils/otp.js
export const generateOtp = () => {
    return Math.floor(100000 + Math.random() * 900000); // 6-digit OTP
  };
  