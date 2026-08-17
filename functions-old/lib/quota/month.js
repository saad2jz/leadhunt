"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.utcMonthKey = utcMonthKey;
function utcMonthKey(date = new Date()) {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}
