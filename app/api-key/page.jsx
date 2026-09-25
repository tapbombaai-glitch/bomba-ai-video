"use client";

import { useState } from "react";

export default function ApiKeyPage() {
  const [email, setEmail] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function generateApiKey() {
    setMessage("");
    setApiKey("");

    if (!email.trim()) {
      setMessage("Please enter your email address.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/keys/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Unable to create API Key.");
      }

      setApiKey(data.key);
      setMessage(
        "Your BOMBA API Key has been created successfully."
      );
    } catch (error) {
      setMessage(
        error?.message || "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  async function copyApiKey() {
    if (!apiKey) return;

    try {
      await navigator.clipboard.writeText(apiKey);
      setMessage("API Key copied successfully! 📋");
    } catch {
      setMessage("Unable to copy automatically. Please copy the key manually.");
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#050505",
        color: "#ffffff",
        padding: "40px 20px",
        fontFamily:
          "Arial, Helvetica, sans-serif",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: "520px",
          marginTop: "40px",
        }}
      >
        <div
          style={{
            textAlign: "center",
            marginBottom: "35px",
          }}
        >
          <div
            style={{
              fontSize: "42px",
              fontWeight: "900",
              color: "#FFD43B",
              letterSpacing: "2px",
            }}
          >
            BOMBA
          </div>

          <div
            style={{
              marginTop: "8px",
              fontSize: "14px",
              letterSpacing: "3px",
              color: "#aaaaaa",
            }}
          >
            API KEY
          </div>
        </div>

        <div
          style={{
            background: "#111111",
            border: "1px solid #292929",
            borderRadius: "20px",
            padding: "28px",
            boxShadow:
              "0 15px 50px rgba(0,0,0,0.35)",
          }}
        >
          <h1
            style={{
              marginTop: 0,
              marginBottom: "10px",
              fontSize: "25px",
            }}
          >
            Get Your BOMBA API Key
          </h1>

          <p
            style={{
              color: "#aaaaaa",
              lineHeight: "1.6",
              marginBottom: "25px",
            }}
          >
            Enter your email address to generate your
            BOMBA API Key.
          </p>

          <label
            style={{
              display: "block",
              marginBottom: "8px",
              fontSize: "14px",
              color: "#dddddd",
            }}
          >
            Email Address
          </label>

          <input
            type="email"
            value={email}
            onChange={(event) =>
              setEmail(event.target.value)
            }
            placeholder="you@example.com"
            disabled={loading}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "15px",
              borderRadius: "12px",
              border: "1px solid #333333",
              background: "#080808",
              color: "#ffffff",
              outline: "none",
              fontSize: "16px",
              marginBottom: "16px",
            }}
          />

          <button
            onClick={generateApiKey}
            disabled={loading}
            style={{
              width: "100%",
              padding: "15px",
              border: "none",
              borderRadius: "12px",
              background: loading
                ? "#8d7920"
                : "#FFD43B",
              color: "#000000",
              fontWeight: "800",
              fontSize: "16px",
              cursor: loading
                ? "not-allowed"
                : "pointer",
            }}
          >
            {loading
              ? "GENERATING..."
              : "GENERATE API KEY"}
          </button>

          {apiKey && (
            <div
              style={{
                marginTop: "25px",
                padding: "18px",
                borderRadius: "14px",
                background: "#080808",
                border: "1px solid #FFD43B",
              }}
            >
              <div
                style={{
                  fontSize: "13px",
                  color: "#aaaaaa",
                  marginBottom: "8px",
                }}
              >
                YOUR BOMBA API KEY
              </div>

              <div
                style={{
                  wordBreak: "break-all",
                  color: "#FFD43B",
                  fontSize: "15px",
                  fontWeight: "700",
                  marginBottom: "14px",
                }}
              >
                {apiKey}
              </div>

              <button
                onClick={copyApiKey}
                style={{
                  width: "100%",
                  padding: "13px",
                  borderRadius: "10px",
                  border: "1px solid #FFD43B",
                  background: "transparent",
                  color: "#FFD43B",
                  fontWeight: "800",
                  fontSize: "15px",
                  cursor: "pointer",
                }}
              >
                📋 COPY API KEY
              </button>
            </div>
          )}

          {message && (
            <div
              style={{
                marginTop: "18px",
                padding: "12px",
                borderRadius: "10px",
                background: "#181818",
                color: "#dddddd",
                fontSize: "14px",
                lineHeight: "1.5",
              }}
            >
              {message}
            </div>
          )}
        </div>

        <div
          style={{
            textAlign: "center",
            marginTop: "25px",
            color: "#666666",
            fontSize: "13px",
          }}
        >
          BOMBA AI · Automate. Grow. Earn.
        </div>
      </section>
    </main>
  );
}