import React, { useState } from "react";
import { supabase } from "./services/supabase";

export default function Auth({ onLogin }) {
  const [mode, setMode] = useState("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      if (mode === "signup") {
        if (!name.trim()) {
          throw new Error("Please enter your name.");
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name.trim() }
          }
        });

        if (error) throw error;

        if (data.session) {
          onLogin(data.session.user);
        } else {
          setMessage("Account created!");
        }
      } else {
        const { data, error } =
          await supabase.auth.signInWithPassword({
            email,
            password
          });

        if (error) throw error;
        onLogin(data.user);
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "grid",
      placeItems: "center",
      background: "#FFF5F2",
      padding: 20
    }}>
      <form onSubmit={handleSubmit} style={{
        width: "100%",
        maxWidth: 400,
        padding: 30,
        borderRadius: 24,
        background: "#FFFFFF",
        boxShadow: "0 8px 35px #e8b6c655"
      }}>
        <h1 style={{ color: "#D85C91", textAlign: "center" }}>
          🌸 Bloom
        </h1>

        <h2 style={{ textAlign: "center", color: "#493447" }}>
          {mode === "signup" ? "Create your account" : "Welcome back"}
        </h2>

        <p style={{ textAlign: "center", color: "#887987" }}>
          Your cycle, your rhythm, your wellness.
        </p>

        {mode === "signup" && (
          <input
            placeholder="Your name"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            style={fieldStyle}
          />
        )}

        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          style={fieldStyle}
        />

        <input
          type="password"
          placeholder="Password (minimum 6 characters)"
          value={password}
          onChange={e => setPassword(e.target.value)}
          minLength={6}
          required
          style={fieldStyle}
        />

        {message && (
          <p role="status" style={{ color: "#C34D75", fontSize: 14 }}>
            {message}
          </p>
        )}

        <button disabled={loading} type="submit" style={buttonStyle}>
          {loading
            ? "Please wait..."
            : mode === "signup" ? "Create Account 🌷" : "Login"}
        </button>

        <p style={{ textAlign: "center", marginTop: 22 }}>
          {mode === "signup"
            ? "Already have an account? "
            : "New to Bloom? "}
          <button
            type="button"
            onClick={() => {
              setMode(mode === "signup" ? "login" : "signup");
              setMessage("");
            }}
            style={{
              border: 0,
              background: "none",
              color: "#D85C91",
              cursor: "pointer",
              fontWeight: 700
            }}
          >
            {mode === "signup" ? "Login" : "Sign up"}
          </button>
        </p>
      </form>
    </div>
  );
}

const fieldStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: 14,
  marginTop: 14,
  borderRadius: 12,
  border: "1px solid #F0D6E2",
  outlineColor: "#D85C91"
};

const buttonStyle = {
  width: "100%",
  padding: 15,
  marginTop: 20,
  border: 0,
  borderRadius: 14,
  background: "#E96A9B",
  color: "white",
  fontWeight: 700,
  cursor: "pointer"
};