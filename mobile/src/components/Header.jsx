import { useState } from "react";
import SettingsModal from "./SettingsModal";
import { CloseIcon } from "./Icons";

export default function Header({ onResetData, theme, onToggleTheme, currentLocation, onLocationChange, onDataReload }) {
  const [showSettings, setShowSettings] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  return (
    <header className="app-header">
      <div className="brand">
        <div className="brand-logo" aria-hidden="true">
          <img src="/logo.png" alt="TriCalendar Logo" className="brand-logo-img" />
        </div>
        <div className="brand-text">
          <h1 className="brand-title">TriCalendar</h1>
        </div>
      </div>

      <div className="header-actions">
        {/* Profile Avatar Button */}
        <button
          type="button"
          className="avatar-btn"
          title="User Profile"
          onClick={() => setShowProfile(true)}
          aria-label="User Profile"
        >
          <div className="avatar-circle">
            <span>TC</span>
          </div>
        </button>

        {/* Settings Button */}
        <button
          type="button"
          className="settings-btn"
          title="Settings & Theme"
          onClick={() => setShowSettings(true)}
          aria-label="Settings"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>

      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          onResetData={onResetData}
          theme={theme}
          onToggleTheme={onToggleTheme}
          currentLocation={currentLocation}
          onLocationChange={onLocationChange}
          onDataReload={onDataReload}
        />
      )}

      {showProfile && (
        <div className="modal-backdrop" onClick={() => setShowProfile(false)}>
          <div className="modal-card profile-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>User Profile</h2>
              <button
                type="button"
                className="close-icon-btn"
                onClick={() => setShowProfile(false)}
                aria-label="Close"
              >
                <CloseIcon size={14} />
              </button>
            </div>
            <div className="profile-body">
              <div className="avatar-large">TC</div>
              <h3>TriCalendar User</h3>
              <p className="profile-meta">Offline Local Account</p>
              <div className="profile-stats">
                <div className="p-stat">
                  <span className="p-num">3</span>
                  <span className="p-lbl">Calendars</span>
                </div>
                <div className="p-stat">
                  <span className="p-num">Offline</span>
                  <span className="p-lbl">Storage</span>
                </div>
                <div className="p-stat">
                  <span className="p-num">SQLite</span>
                  <span className="p-lbl">Engine</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
