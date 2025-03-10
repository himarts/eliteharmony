import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config()


export const extractUserIdFromToken = (req) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      throw new Error("No token provided");
    }
console.log(token)
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.lof(decoded)
    return decoded.userId;
  } catch (error) {
    throw new Error("Invalid or expired token");
  }
};
