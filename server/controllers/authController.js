const jsforce = require("jsforce");

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

  // Save the verifier jsforce generated so we can reuse it in the callback
  req.session.codeVerifier = oauth2.codeVerifier;

  console.log("Saved Code Verifier:", req.session.codeVerifier);

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

  console.log("Retrieved Code Verifier:", req.session.codeVerifier);

  try {
    await conn.authorize(code);

    req.session.accessToken = conn.accessToken;
    req.session.instanceUrl = conn.instanceUrl;
    req.session.refreshToken = conn.refreshToken;

    req.session.save(() => {
      res.redirect(`${process.env.CLIENT_URL}/?login=success`);
    });
  } catch (err) {
    console.error("OAuth callback error:", err);
    res.redirect(`${process.env.CLIENT_URL}/?login=error`);
  }
};

const status = (req, res) => {
  // Prevent the browser from caching this response — a cached 304 here
  // would keep showing a stale "logged out" state even after a real login.
  res.set("Cache-Control", "no-store");

  if (req.session && req.session.accessToken) {
    return res.json({ loggedIn: true, instanceUrl: req.session.instanceUrl });
  }
  return res.json({ loggedIn: false });
};

const logout = (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ loggedOut: true });
  });
};

module.exports = {
  login,
  callback,
  status,
  logout,
};