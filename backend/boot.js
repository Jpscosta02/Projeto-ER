// backend/boot.js
const bootId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
module.exports = { bootId };
