import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Link, useNavigate } from "react-router-dom";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Load saved credentials on component mount
  useEffect(() => {
    const savedEmail = localStorage.getItem('remembered_email');
    const savedPassword = localStorage.getItem('remembered_password');
    const wasRemembered = localStorage.getItem('remember_me') === 'true';
    
    if (wasRemembered && savedEmail && savedPassword) {
      setEmail(savedEmail);
      setPassword(savedPassword);
      setRememberMe(true);
      console.log('🔐 Loaded saved credentials for remember me functionality');
    }
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      setError("");
      setLoading(true);
      
      // Save or clear credentials based on remember me checkbox
      if (rememberMe) {
        localStorage.setItem('remembered_email', email);
        localStorage.setItem('remembered_password', password);
        localStorage.setItem('remember_me', 'true');
      } else {
        localStorage.removeItem('remembered_email');
        localStorage.removeItem('remembered_password');
        localStorage.removeItem('remember_me');
      }
      
      await login(email, password, rememberMe);
      navigate("/dashboard");
    } catch (error) {
      setError("Failed to log in: " + error.message);
    }

    setLoading(false);
  }

  return (
    <div style={{ maxWidth: "400px", margin: "50px auto", padding: "20px" }}>
      <h2>🔐 Login to Course Maker</h2>
      {error && (
        <div style={{ color: "red", marginBottom: "10px" }}>{error}</div>
      )}
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "15px" }}>
          <label>Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: "100%", padding: "8px", marginTop: "5px" }}
          />
        </div>
        <div style={{ marginBottom: "15px" }}>
          <label>Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: "100%", padding: "8px", marginTop: "5px" }}
          />
        </div>
        <div style={{ marginBottom: "15px", display: "flex", alignItems: "center" }}>
          <input
            type="checkbox"
            id="rememberMe"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            style={{ marginRight: "8px" }}
          />
          <label htmlFor="rememberMe" style={{ fontSize: "14px", cursor: "pointer" }}>
            Remember me on this computer
          </label>
        </div>
        <button
          disabled={loading}
          type="submit"
          style={{
            width: "100%",
            padding: "10px",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "4px",
          }}
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
      <div style={{ textAlign: "center", marginTop: "15px" }}>
        Need an account? <Link to="/register">Sign up</Link>
      </div>
    </div>
  );
}

export default Login;
