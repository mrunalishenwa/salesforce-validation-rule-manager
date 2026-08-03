const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

// Redirect the browser to the backend, which kicks off the Salesforce OAuth flow
export const loginToSalesforce = () => {
  window.location.href = `${API_URL}/login`;
};

// Check whether the current session is already authenticated with Salesforce
export const getAuthStatus = async () => {
  const res = await fetch(`${API_URL}/auth/status`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to check auth status");
  return res.json(); // { loggedIn: boolean, instanceUrl?: string }
};

// Fetch all validation rules on the Account object via the Tooling API
export const getValidationRules = async () => {
  const res = await fetch(`${API_URL}/validation-rules`, {
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to fetch validation rules");
  }
  const data = await res.json();
  return data.rules;
};

// Push staged active/inactive changes to Salesforce
// changes: [{ id, active }]
export const deployChanges = async (changes) => {
  const res = await fetch(`${API_URL}/validation-rules/deploy`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ changes }),
  });
  const data = await res.json();
  if (!res.ok && res.status !== 207) {
    throw new Error(data.error || "Failed to deploy changes");
  }
  return data;
};

export const logout = async () => {
  const res = await fetch(`${API_URL}/logout`, {
    method: "POST",
    credentials: "include",
  });
  return res.json();
};
