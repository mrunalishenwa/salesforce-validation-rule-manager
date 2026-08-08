const crypto = require("crypto");

// In-memory store mapping opaque tokens -> Salesforce session data.
// This avoids relying on cross-site cookies (which Brave, Safari, and
// increasingly Chrome block by default) for authenticated API calls.
// Good enough for a single-instance free-tier deployment; for real
// production use you'd back this with Redis or similar.
const store = new Map();

function createToken(data) {
  const token = crypto.randomBytes(32).toString("hex");
  store.set(token, data);
  return token;
}

function getSession(token) {
  return store.get(token) || null;
}

function deleteToken(token) {
  store.delete(token);
}

module.exports = { createToken, getSession, deleteToken };
