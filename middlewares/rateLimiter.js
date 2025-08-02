import rateLimit from "express-rate-limit";

export const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  keyGenerator: (req) => req.connection.remoteAddress,
  message: "So many requests. You are suspicious 0_0",
});
