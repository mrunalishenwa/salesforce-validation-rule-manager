const jsforce = require("jsforce");
const tokenStore = require("../tokenStore");
const { getTokenFromHeader } = require("./authController");

const OBJECT_API_NAME = "Account";

// Build an authenticated jsforce connection from the bearer token
// (sent in the Authorization header, not a cookie — see authController.js
// for why we moved away from cookies for cross-domain deployments).
function getConnection(req) {
  const token = getTokenFromHeader(req);
  const session = token ? tokenStore.getSession(token) : null;
  if (!session) return null;

  return new jsforce.Connection({
    instanceUrl: session.instanceUrl,
    accessToken: session.accessToken,
    version: "60.0",
  });
}

// jsforce's metadata.read()/update() return a single object when given a
// single-element array, and an array when given multiple. Normalize to
// always be an array so calling code doesn't have to care.
function toArray(result) {
  return Array.isArray(result) ? result : [result];
}

// GET /validation-rules  -> list all validation rules on Account
// We use the Tooling API here purely to discover which rules exist and
// their current Active state (fast, simple SOQL query).
const getValidationRules = async (req, res) => {
  const conn = getConnection(req);
  if (!conn) return res.status(401).json({ error: "Not authenticated" });

  try {
    const result = await conn.tooling.query(
      `SELECT Id, ValidationName, Active, ErrorMessage, Description
       FROM ValidationRule
       WHERE EntityDefinition.QualifiedApiName = '${OBJECT_API_NAME}'
       ORDER BY ValidationName`
    );

    const rules = result.records.map((r) => ({
      id: r.Id,
      name: r.ValidationName,
      fullName: `${OBJECT_API_NAME}.${r.ValidationName}`,
      active: r.Active,
      errorMessage: r.ErrorMessage,
      description: r.Description,
    }));

    res.json({ rules });
  } catch (err) {
    console.error("Error fetching validation rules:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// PATCH /validation-rules/deploy -> bulk update Active state for a set of rules
// body: { changes: [{ fullName, active }, ...] }
//
// NOTE: Validation rules must be read/written through the SOAP-based
// Metadata API (conn.metadata.read/update), not the Tooling API's REST
// shortcut — the Tooling API's compound Metadata field is unreliable for
// ValidationRule and tends to omit required sub-fields like the formula,
// which Salesforce then rejects on update. This is effectively the same
// "deploy" mechanism the Salesforce CLI/Ant Migration Tool use.
const deployValidationRules = async (req, res) => {
  const conn = getConnection(req);
  if (!conn) return res.status(401).json({ error: "Not authenticated" });

  const { changes } = req.body;
  if (!Array.isArray(changes) || changes.length === 0) {
    return res.status(400).json({ error: "No changes provided" });
  }

  try {
    const fullNames = changes.map((c) => c.fullName);

    // 1. Read the full current metadata for each rule we're about to change
    const currentMetadata = toArray(
      await conn.metadata.read("ValidationRule", fullNames)
    );

    // 2. Flip the active flag on each, leaving every other field untouched
    const updatedMetadata = currentMetadata.map((meta) => {
      const change = changes.find((c) => c.fullName === meta.fullName);
      return {
        ...meta,
        active: change.active ? "true" : "false",
      };
    });

    // 3. Push the updated metadata back to the org (this is the "deploy")
    const updateResult = toArray(
      await conn.metadata.update("ValidationRule", updatedMetadata)
    );

    const results = updateResult.map((r, i) => ({
      fullName: updatedMetadata[i].fullName,
      success: r.success,
      errors: r.success ? undefined : r.errors,
    }));

    const failed = results.filter((r) => !r.success);
    if (failed.length > 0) {
      console.error("Some validation rule updates failed:", failed);
      return res.status(207).json({ message: "Some updates failed", results });
    }

    res.json({ message: "Validation rules deployed successfully", results });
  } catch (err) {
    console.error("Error deploying validation rules:", err.message);
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getValidationRules,
  deployValidationRules,
};
