import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler.js";
import { router } from "./routes/index.js";

export const app = express();

app.use(cors({ origin: env.webOrigin, credentials: true }));
app.use(express.json());

app.use(router);

app.use(notFoundHandler);
app.use(errorHandler);
