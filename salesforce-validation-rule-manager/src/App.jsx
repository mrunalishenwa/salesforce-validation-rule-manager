import { useEffect, useState } from "react";
import LoginButton from "./components/LoginButton";
import ValidationRules from "./components/ValidationRules";
import {
  getAuthStatus,
  getValidationRules,
  deployChanges,
  logout,
} from "./services/salesforce";

const TOKEN_STORAGE_KEY = "sf_token";

function App() {
  const [token, setToken] = useState(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [instanceUrl, setInstanceUrl] = useState(null);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [message, setMessage] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // On load: pick up a token either from the OAuth redirect URL (fresh
  // login) or from sessionStorage (returning visit within this tab).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get("token");
    const loginResult = params.get("login");

    let activeToken = null;

    if (loginResult === "success" && urlToken) {
      activeToken = urlToken;
      window.sessionStorage.setItem(TOKEN_STORAGE_KEY, urlToken);
      setMessage("Logged in to Salesforce successfully.");
      window.history.replaceState({}, "", "/");
    } else if (loginResult === "error") {
      setMessage("Salesforce login failed. Please try again.");
      window.history.replaceState({}, "", "/");
    } else {
      activeToken = window.sessionStorage.getItem(TOKEN_STORAGE_KEY);
    }

    if (activeToken) {
      setToken(activeToken);
      getAuthStatus(activeToken)
        .then((data) => {
          setLoggedIn(data.loggedIn);
          setInstanceUrl(data.instanceUrl || null);
          if (!data.loggedIn) {
            window.sessionStorage.removeItem(TOKEN_STORAGE_KEY);
          }
        })
        .catch(() => setLoggedIn(false))
        .finally(() => setCheckingAuth(false));
    } else {
      setCheckingAuth(false);
    }
  }, []);

  const handleGetRules = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const fetchedRules = await getValidationRules(token);
      // pendingActive mirrors active until the user stages a change
      setRules(fetchedRules.map((r) => ({ ...r, pendingActive: r.active })));
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (id) => {
    setRules((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, pendingActive: !r.pendingActive } : r
      )
    );
  };

  const handleToggleAll = (active) => {
    setRules((prev) => prev.map((r) => ({ ...r, pendingActive: active })));
  };

  const handleDeploy = async () => {
    const changes = rules
      .filter((r) => r.active !== r.pendingActive)
      .map((r) => ({ fullName: r.fullName, active: r.pendingActive }));

    if (changes.length === 0) {
      setMessage("No changes to deploy.");
      return;
    }

    setDeploying(true);
    setMessage(null);
    try {
      await deployChanges(token, changes);
      setRules((prev) => prev.map((r) => ({ ...r, active: r.pendingActive })));
      setMessage("Changes deployed to Salesforce successfully.");
    } catch (err) {
      setMessage(err.message);
    } finally {
      setDeploying(false);
    }
  };

  const handleLogout = async () => {
    await logout(token);
    window.sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    setLoggedIn(false);
    setRules([]);
  };

  if (checkingAuth) {
    return (
      <div style={{ padding: "30px", fontFamily: "Arial", textAlign: "center" }}>
        Checking login status...
      </div>
    );
  }

  return (
    <div style={{ padding: "30px", fontFamily: "Arial", maxWidth: "800px", margin: "0 auto" }}>
      <h1>Salesforce Validation Rule Manager</h1>

      {message && (
        <div style={{ padding: "10px", marginBottom: "16px", background: "#eef", borderRadius: "4px" }}>
          {message}
        </div>
      )}

      {!loggedIn ? (
        <LoginButton />
      ) : (
        <>
          <p>
            Connected to Salesforce{instanceUrl ? `: ${instanceUrl}` : ""}{" "}
            <button onClick={handleLogout} style={{ marginLeft: "10px" }}>
              Logout
            </button>
          </p>

          <button onClick={handleGetRules} disabled={loading}>
            {loading ? "Loading..." : "Get Validation Rules"}
          </button>

          <br />
          <br />

          <ValidationRules rules={rules} onToggle={handleToggle} onToggleAll={handleToggleAll} />

          <br />

          <button onClick={handleDeploy} disabled={deploying || rules.length === 0}>
            {deploying ? "Deploying..." : "Deploy Changes"}
          </button>
        </>
      )}
    </div>
  );
}

export default App;
