import { Router } from "express";
import { authRoutes } from "./auth.routes.js";

export const apiV1Router = Router();

apiV1Router.use("/auth", authRoutes);
