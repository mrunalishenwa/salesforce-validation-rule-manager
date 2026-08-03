function ValidationRules({ rules, onToggle, onToggleAll }) {
  if (!rules || rules.length === 0) {
    return <p>No validation rules loaded yet. Click "Get Validation Rules" above.</p>;
  }

  const dirtyCount = rules.filter((r) => r.active !== r.pendingActive).length;

  return (
    <div>
      <div style={{ marginBottom: "10px" }}>
        <button onClick={() => onToggleAll(true)} style={{ marginRight: "8px" }}>
          Enable All
        </button>
        <button onClick={() => onToggleAll(false)}>Disable All</button>
        {dirtyCount > 0 && (
          <span style={{ marginLeft: "12px", color: "#b45309" }}>
            {dirtyCount} unsaved change{dirtyCount > 1 ? "s" : ""} — click "Deploy Changes" to apply
          </span>
        )}
      </div>

      <table border="1" cellPadding="10">
        <thead>
          <tr>
            <th>Validation Rule</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {rules.map((rule) => {
            const isDirty = rule.active !== rule.pendingActive;
            return (
              <tr key={rule.id} style={isDirty ? { backgroundColor: "#fff7e6" } : {}}>
                <td>{rule.name}</td>
                <td>{rule.pendingActive ? "Active" : "Inactive"}</td>
                <td>
                  <button onClick={() => onToggle(rule.id)}>Toggle</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default ValidationRules;
