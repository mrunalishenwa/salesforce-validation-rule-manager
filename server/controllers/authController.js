const jsforce = require("jsforce");
const tokenStore = require("../tokenStore");

const login = async (req, res) => {
  // useVerifier: true tells jsforce to generate its own PKCE code_verifier
  // internally, and to automatically include the matching code_challenge
  // in the authorization URL below.
  const oauth2 = new jsforce.OAuth2({
    loginUrl: process.env.SALESFORCE_LOGIN_URL,
    clientId: process.env.SALESFORCE_CLIENT_ID,
    clientSecret: process.env.SALESFORCE_CLIENT_SECRET,
    redirectUri: process.env.SALESFORCE_REDIRECT_URI,
    useVerifier: true,
  });

  // Save the verifier jsforce generated so we can reuse it in the callback.
  // This still uses the cookie-based session, which is fine here because
  // login -> Salesforce -> callback is a same top-level-navigation flow,
  // not a cross-site fetch/XHR call (those are what get cookie-blocked).
  req.session.codeVerifier = oauth2.codeVerifier;

  const authUrl = oauth2.getAuthorizationUrl({
    scope: "api refresh_token",
  });

  req.session.save(() => {
    res.redirect(authUrl);
  });
};

const callback = async (req, res) => {
  const { code } = req.query;

  const conn = new jsforce.Connection({
    oauth2: {
      loginUrl: process.env.SALESFORCE_LOGIN_URL,
      clientId: process.env.SALESFORCE_CLIENT_ID,
      clientSecret: process.env.SALESFORCE_CLIENT_SECRET,
      redirectUri: process.env.SALESFORCE_REDIRECT_URI,
    },
  });

  // jsforce's Connection constructor does NOT accept codeVerifier via the
  // oauth2 config object — it must be set directly on the oauth2 instance,
  // otherwise it's silently dropped and the token exchange fails.
  conn.oauth2.codeVerifier = req.session.codeVerifier;

  try {
    await conn.authorize(code);

    // Instead of relying on a cross-site session cookie (which browsers
    // like Brave/Safari block by default), issue an opaque bearer token
    // the frontend will store itself and send back in an Authorization
    // header on every subsequent API call.
    const token = tokenStore.createToken({
      accessToken: conn.accessToken,
      instanceUrl: conn.instanceUrl,
      refreshToken: conn.refreshToken,
    });

    res.redirect(`${process.env.CLIENT_URL}/?login=success&token=${token}`);
  } catch (err) {
    console.error("OAuth callback error:", err);
    res.redirect(`${process.env.CLIENT_URL}/?login=error`);
  }
};

// Pulls the bearer token out of the Authorization header, if present
function getTokenFromHeader(req) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length);
}

const status = (req, res) => {
  res.set("Cache-Control", "no-store");

  const token = getTokenFromHeader(req);
  const session = token ? tokenStore.getSession(token) : null;

  if (session) {
    return res.json({ loggedIn: true, instanceUrl: session.instanceUrl });
  }
  return res.json({ loggedIn: false });
};

const logout = (req, res) => {
  const token = getTokenFromHeader(req);
  if (token) tokenStore.deleteToken(token);
  res.json({ loggedOut: true });
};

module.exports = {
  login,
  callback,
  status,
  logout,
  getTokenFromHeader,
};
