import React, { useState, useEffect } from "react";
import "./popup.css";

const URL_REGEX = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;

const Popup = () => {
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (error && URL_REGEX.test(playlistUrl)) {
      setError("");
    }
  }, [playlistUrl, error]);

  const handleStartAutomation = () => {
    if (!URL_REGEX.test(playlistUrl.trim())) {
      setError("Invalid YouTube playlist URL.");
      return;
    }
    setError("");
    setIsLoading(true);
    // Background script or async logic
    setTimeout(() => {
      chrome.runtime.sendMessage({
        action: "startAutomation",
        url: playlistUrl,
      });
      console.log("Automation started for:", playlistUrl);
      setIsLoading(false);
    }, 2000);
  };

  return (
    <div className="glass-card">
      <div className="header">
        <div className="logo-text">
          YT<span className="logo-accent">Auto</span>
        </div>
      </div>

      <div className="input-group">
        <input
          id="playlistUrl"
          type="text"
          value={playlistUrl}
          onChange={(e) => setPlaylistUrl(e.target.value)}
          className={`input ${error ? "shake" : ""}`}
          required
        />
        <label htmlFor="playlistUrl" className={playlistUrl ? "filled" : ""}>
          Paste playlist URL
        </label>
        {error && <span className="error-msg">{error}</span>}
      </div>

      <button
        className="btn"
        onClick={handleStartAutomation}
        disabled={isLoading}
      >
        <span className="btn-text">
          {isLoading ? "Loading..." : "Start Automation"}
        </span>
        <div className="ripple-container"></div>
      </button>
    </div>
  );
};

export default Popup;
