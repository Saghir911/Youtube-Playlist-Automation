import React, { useState } from "react";
import "./popup.css";

const YT_PLAYLIST_REGEX = /[?&]list=([a-zA-Z0-9_-]+)/;

const Popup = () => {

  //todo: Simple Youtube Playlist code 
  
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const extractPlaylistId = (url: string): string | null => {
    const match = url.match(YT_PLAYLIST_REGEX);
    return match ? match[1] : null;
  };

  const handleStartAutomation = async () => {
    setError("");
    const playlistId = extractPlaylistId(playlistUrl.trim());
    if (!playlistId) {
      setError("Please enter a valid YouTube playlist URL.");
      return;
    }
    setIsLoading(true);
    const fullPlaylistUrl = `https://www.youtube.com/playlist?list=${playlistId}`;
    try {
      // Send both actions in parallel, but only after validation
      await Promise.all([
        new Promise((resolve) =>
          chrome.runtime.sendMessage(
            { action: "startAutomation", url: fullPlaylistUrl },
            resolve
          )
        )
      ]);
      console.log("Automation started for:", fullPlaylistUrl);
    } catch (err) {
      setError("Failed to start automation.");
    } finally {
      setIsLoading(false);
    }
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
          className={`input${error ? " shake" : ""}`}
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
