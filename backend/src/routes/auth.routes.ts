import { Router } from "express";
import { login, logout, me, register } from "../controllers/auth.controller";
import { validate } from "../middleware/validate";
import { loginSchema, registerSchema } from "../validators/auth.validators";
import { authenticate } from "../middleware/auth";
import rateLimit from "express-rate-limit";

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many attempts, try again later", errorCode: "RATE_LIMITED" },
});

router.post("/register", authLimiter, validate(registerSchema), register);
router.post("/login", authLimiter, validate(loginSchema), login);
router.post("/logout", logout);
router.get("/me", authenticate, me);

export default router;
