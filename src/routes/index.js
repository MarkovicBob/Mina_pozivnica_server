import { Router } from "express";
import { publicRouter } from "./public.routes.js";
import { adminRouter } from "./admin.routes.js";

export const routes = Router();
routes.use(publicRouter);
routes.use(adminRouter);
