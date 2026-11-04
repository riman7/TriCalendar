export default function SettingsModal({ onClose, onResetData }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="header-title-row">
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
            <h2>Settings & Storage</h2>
          </div>
          <button type="button" className="close-icon-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="settings-content">
          <section className="setting-group">
            <h3>Offline Architecture</h3>
            <div className="status-badge-row">
              <span className="status-dot green"></span>
              <span className="status-text">SQLite Local Persistence Ready</span>
            </div>
            <p className="setting-desc">
              TriCalendar operates completely offline. No cloud credentials or internet connectivity required.
            </p>
          </section>

          <section className="setting-group">
            <h3>Tri-Calendar Engine</h3>
            <ul className="engine-features-list">
              <li>
                <strong>Gregorian (AD):</strong> Standard international civil calendar.
              </li>
              <li>
                <strong>Bikram Sambat (BS):</strong> Official Nepali calendar with solar transits.
              </li>
              <li>
                <strong>Lunar Tithi:</strong> Hindu tithis (Pratipada to Purnima/Amavasya).
              </li>
            </ul>
          </section>

          <section className="setting-group danger-zone">
            <h3>Data Reset</h3>
            <p className="setting-desc">
              Restore initial mock events and occurrences provided in <code>mockData.js</code>.
            </p>
            <button
              type="button"
              className="danger-btn"
              onClick={() => {
                if (window.confirm("Reset all events to default mock data?")) {
                  onResetData();
                  onClose();
                }
              }}
            >
              Reset Mock Data
            </button>
          </section>
        </div>

        <div className="modal-footer">
          <button type="button" className="primary-btn" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
