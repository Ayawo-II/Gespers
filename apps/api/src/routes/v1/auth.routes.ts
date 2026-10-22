import { Router } from "express";
import {
  changePassword,
  getMe,
  login,
  logout,
} from "../../controllers/auth.controller.js";
import { requireAuth } from "../../middlewares/authenticate.js";

export const authRoutes = Router();

authRoutes.post("/login", login);
authRoutes.get("/me", requireAuth, getMe);
authRoutes.post("/logout", logout);
authRoutes.post("/change-password", requireAuth, changePassword);
