function LoginButton() {
  const handleLogin = () => {
    window.location.href = "http://localhost:3000/login";
  };

  return (
    <div style={{ textAlign: "center", marginTop: "100px" }}>
      <button
        onClick={handleLogin}
        style={{
          padding: "12px 24px",
          fontSize: "18px",
          cursor: "pointer",
          backgroundColor: "#0176d3",
          color: "white",
          border: "none",
          borderRadius: "6px",
        }}
      >
        Login with Salesforce
      </button>
    </div>
  );
}

export default LoginButton;