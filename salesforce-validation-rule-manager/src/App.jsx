import { useEffect, useState } from "react";
import LoginButton from "./components/LoginButton";
import ValidationRules from "./components/ValidationRules";
import {
  getAuthStatus,
  getValidationRules,
  deployChanges,
  logout,
} from "./services/salesforce";

function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [instanceUrl, setInstanceUrl] = useState(null);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [message, setMessage] = useState(null);

  // On load, check if we're already authenticated (e.g. after the OAuth redirect back)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("login") === "success") {
      setMessage("Logged in to Salesforce successfully.");
      window.history.replaceState({}, "", "/");
    } else if (params.get("login") === "error") {
      setMessage("Salesforce login failed. Please try again.");
      window.history.replaceState({}, "", "/");
    }

    getAuthStatus()
      .then((data) => {
        setLoggedIn(data.loggedIn);
        setInstanceUrl(data.instanceUrl || null);
      })
      .catch(() => setLoggedIn(false));
  }, []);

  const handleGetRules = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const fetchedRules = await getValidationRules();
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
      await deployChanges(changes);
      setRules((prev) => prev.map((r) => ({ ...r, active: r.pendingActive })));
      setMessage("Changes deployed to Salesforce successfully.");
    } catch (err) {
      setMessage(err.message);
    } finally {
      setDeploying(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setLoggedIn(false);
    setRules([]);
  };

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
