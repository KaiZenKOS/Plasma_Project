import "dotenv/config";
import express from "express";
import cors from "cors";
import { coreRouter } from "./routes/core.js";
import { publicRouter } from "./routes/public.js";
import { tontineRouter } from "./routes/tontine.js";
import { config } from "./config.js";

const app = express();
app.use(
  cors({
    origin: "http://localhost:5173",
  }),
);
app.use(express.json());

// Routes modulaires Plug & Play
app.use("/api", publicRouter);
app.use("/api/core", coreRouter);
app.use("/api/tontine", tontineRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "plasma-backend" });
});

app.listen(config.port, () => {
  console.log(`Plasma Backend listening on port ${config.port}`);
});
