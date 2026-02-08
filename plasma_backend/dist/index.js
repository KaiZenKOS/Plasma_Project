"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const core_js_1 = require("./routes/core.js");
const public_js_1 = require("./routes/public.js");
const tontine_js_1 = require("./routes/tontine.js");
const eas_js_1 = require("./routes/eas.js");
const config_js_1 = require("./config.js");
const app = (0, express_1.default)();
app.use((0, cors_1.default)({
    origin: "http://localhost:5173",
}));
app.use(express_1.default.json());
// Routes modulaires Plug & Play
app.use("/api", public_js_1.publicRouter);
app.use("/api/core", core_js_1.coreRouter);
app.use("/api/tontine", tontine_js_1.tontineRouter);
app.use("/api/eas", eas_js_1.easRouter);
app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "plasma-backend" });
});
app.listen(config_js_1.config.port, () => {
    console.log(`Plasma Backend listening on port ${config_js_1.config.port}`);
});
