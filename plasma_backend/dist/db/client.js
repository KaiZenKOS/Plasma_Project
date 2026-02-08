"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
exports.query = query;
const pg_1 = __importDefault(require("pg"));
const config_js_1 = require("../config.js");
const pool = new pg_1.default.Pool(config_js_1.config.database);
exports.pool = pool;
async function query(text, params) {
    return pool.query(text, params);
}
