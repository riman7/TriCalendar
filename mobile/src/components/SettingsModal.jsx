import { useState, useEffect, useRef } from "react";
import { SunIcon, MoonIcon, CloseIcon } from "./Icons";
import {
  getSupportedCalendarCities,
  getCalendarLocation,
  setCalendarLocation,
  getDeviceCalendarLocation
} from "../utils/calendarUtils";
import {
  getStoredConfig,
  saveStoredConfig,
  initiateGoogleAuth,
  disconnectGoogleDrive,
  uploadBackupToDrive,
  downloadBackupFromDrive,
  BACKUP_FILE_NAME
} from "../services/googleDriveService";
import {
  createBackupPayload,
  importBackupPayload,
  downloadLocalBackupFile
} from "../services/backupService";

const POPULAR_CITIES = [
  { name: "KATHMANDU", displayName: "Kathmandu", region: "NEPAL" },
  { name: "POKHARA", displayName: "Pokhara", region: "NEPAL" },
  { name: "BIRATNAGAR", displayName: "Biratnagar", region: "NEPAL" },
  { name: "LALITPUR", displayName: "Lalitpur", region: "NEPAL" },
  { name: "BHAKTAPUR", displayName: "Bhaktapur", region: "NEPAL" },
  { name: "BIRGUNJ", displayName: "Birgunj", region: "NEPAL" },
  { name: "DHARAN", displayName: "Dharan", region: "NEPAL" },
  { name: "JANAKPUR", displayName: "Janakpur", region: "NEPAL" },
  { name: "DELHI", displayName: "Delhi", region: "INDIA" },
  { name: "MUMBAI", displayName: "Mumbai", region: "INDIA" },
  { name: "KOLKATA", displayName: "Kolkata", region: "INDIA" },
  { name: "VARANASI", displayName: "Varanasi", region: "INDIA" },
  { name: "NEW_YORK", displayName: "New York", region: "US" },
  { name: "LONDON", displayName: "London", region: "UK" },
  { name: "SYDNEY", displayName: "Sydney", region: "AUSTRALIA" },
  { name: "TOKYO", displayName: "Tokyo", region: "JAPAN" },
];

export default function SettingsModal({
  onClose,
  onResetData,
  theme = "light",
  onToggleTheme,
  currentLocation = "KATHMANDU",
  onLocationChange,
  onDataReload
}) {
  const [cityList, setCityList] = useState(POPULAR_CITIES);
  const [activeCity, setActiveCity] = useState(currentLocation);
  const [isDetecting, setIsDetecting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  // ── Google Drive & Backup State ──
  const [driveConfig, setDriveConfig] = useState(() => getStoredConfig());
  const [isConnectingDrive, setIsConnectingDrive] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [backupStatus, setBackupStatus] = useState("");
  const [showManual, setShowManual] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    async function initLocation() {
      try {
        const [cities, loc] = await Promise.all([
          getSupportedCalendarCities().catch(() => []),
          getCalendarLocation().catch(() => null)
        ]);

        if (!mounted) return;

        if (cities && cities.length > 0) {
          setCityList(cities);
        }

        if (loc?.city) {
          setActiveCity(loc.city);
        }
      } catch (err) {
        console.warn("Failed to load location or cities:", err);
      }
    }

    initLocation();
    return () => { mounted = false; };
  }, []);

  // ── Drive & Backup Handlers ──
  const handleConnectDrive = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    try {
      setIsConnectingDrive(true);
      setBackupStatus("Opening Google sign-in…");
      saveStoredConfig({
        folderName: folderNameInput.trim() || "TriCalendar Backup"
      });
      initiateGoogleAuth();
    } catch (err) {
      setIsConnectingDrive(false);
      setBackupStatus(err.message || "Failed to initiate Google connection");
    }
  };

  const handleDisconnectDrive = () => {
    disconnectGoogleDrive();
    const updated = getStoredConfig();
    setDriveConfig(updated);
    setBackupStatus("Google Drive disconnected.");
  };

  const handleBackupNow = async () => {
    setIsBackingUp(true);
    setBackupStatus("Exporting database…");
    try {
      const payload = await createBackupPayload();
      if (driveConfig.isConnected) {
        setBackupStatus("Uploading to Google Drive…");
        await uploadBackupToDrive(payload, driveConfig.folderName);
        const updated = getStoredConfig();
        setDriveConfig(updated);
        setBackupStatus(`✓ Backed up to Google Drive folder "${driveConfig.folderName}"!`);
      } else {
        // Fallback: download file directly to device
        downloadLocalBackupFile();
        setBackupStatus("✓ Backup file downloaded to your device!");
      }
    } catch (err) {
      console.error("Backup failed:", err);
      setBackupStatus(err.message || "Backup failed.");
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestoreFromDrive = async () => {
    if (!window.confirm("Restore from Google Drive? This will merge events with your current database.")) {
      return;
    }
    setIsRestoring(true);
    setBackupStatus("Fetching backup from Google Drive…");
    try {
      const payload = await downloadBackupFromDrive(driveConfig.folderName);
      const res = await importBackupPayload(payload, "MERGE");
      setBackupStatus(`✓ Successfully restored ${res.count} events from Google Drive!`);
      if (onDataReload) await onDataReload();
    } catch (err) {
      console.error("Restore failed:", err);
      setBackupStatus(err.message || "Failed to restore from Google Drive.");
    } finally {
      setIsRestoring(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsRestoring(true);
    setBackupStatus("Reading backup file…");
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      const res = await importBackupPayload(payload, "MERGE");
      setBackupStatus(`✓ Imported ${res.count} events successfully!`);
      if (onDataReload) await onDataReload();
    } catch (err) {
      console.error("File import failed:", err);
      setBackupStatus("Invalid backup file: " + (err.message || "could not parse JSON."));
    } finally {
      setIsRestoring(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleExportLocalFile = async () => {
    try {
      await downloadLocalBackupFile();
      setBackupStatus("✓ Backup file saved to your device!");
    } catch (err) {
      setBackupStatus("Failed to save backup file: " + err.message);
    }
  };

  const handleCitySelect = async (newCity) => {
    try {
      setActiveCity(newCity);
      setStatusMessage("Updating location…");
      const res = await setCalendarLocation({ city: newCity });
      const finalCity = res?.city || newCity;
      try { localStorage.setItem("tricalendar_location", finalCity); } catch {}
      if (onLocationChange) onLocationChange(finalCity);
      setStatusMessage(`Location set to ${finalCity.replace(/_/g, " ")}`);
    } catch (err) {
      console.error("Failed to set city:", err);
      setStatusMessage("Failed to update location");
    }
  };

  const handleUseDeviceLocation = async () => {
    setIsDetecting(true);
    setStatusMessage("Acquiring device location…");

    try {
      // 1. Try native capacitor plugin GPS/Network location
      let resolvedCity = null;
      try {
        const deviceLoc = await getDeviceCalendarLocation();
        if (deviceLoc?.city) {
          resolvedCity = deviceLoc.city;
        }
      } catch (nativeErr) {
        console.warn("Native device location lookup failed, trying web geolocation fallback", nativeErr);
      }

      // 2. Web Geolocation fallback if native returned null
      if (!resolvedCity && navigator.geolocation) {
        try {
          const pos = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              timeout: 10000,
              enableHighAccuracy: true
            });
          });
          const res = await setCalendarLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude
          });
          if (res?.city) resolvedCity = res.city;
        } catch (geoErr) {
          console.warn("Web geolocation failed or denied:", geoErr);
        }
      }

      // 3. Fall back to Kathmandu if still unresolved
      if (!resolvedCity) {
        resolvedCity = "KATHMANDU";
      }

      setActiveCity(resolvedCity);
      await setCalendarLocation({ city: resolvedCity });
      try { localStorage.setItem("tricalendar_location", resolvedCity); } catch {}
      if (onLocationChange) onLocationChange(resolvedCity);
      setStatusMessage(`Device location resolved to ${resolvedCity.replace(/_/g, " ")}`);
    } catch (err) {
      console.error("Device location error:", err);
      setStatusMessage("Could not determine device location. Defaulted to Kathmandu.");
      setActiveCity("KATHMANDU");
      if (onLocationChange) onLocationChange("KATHMANDU");
    } finally {
      setIsDetecting(false);
    }
  };

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
            <h2>Settings & Preferences</h2>
          </div>
          <button type="button" className="close-icon-btn" onClick={onClose} aria-label="Close">
            <CloseIcon size={14} />
          </button>
        </div>

        <div className="settings-content">
          {/* Location / Panchang City */}
          <section className="setting-group location-setting-group">
            <div className="setting-title-with-badge">
              <h3>Panchang Location</h3>
              <span className="location-current-pill">
                {activeCity ? activeCity.replace(/_/g, " ") : "Kathmandu"}
              </span>
            </div>
            <p className="setting-desc">
              Tithi timings and transition boundaries are computed relative to local sunrise coordinates.
            </p>

            <div className="location-controls-row">
              <button
                type="button"
                className="device-location-btn"
                onClick={handleUseDeviceLocation}
                disabled={isDetecting}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={isDetecting ? "spin-icon" : ""}
                >
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="3" />
                  <line x1="12" y1="2" x2="12" y2="6" />
                  <line x1="12" y1="18" x2="12" y2="22" />
                  <line x1="2" y1="12" x2="6" y2="12" />
                  <line x1="18" y1="12" x2="22" y2="12" />
                </svg>
                <span>{isDetecting ? "Detecting GPS…" : "Use Device Location"}</span>
              </button>
            </div>

            <div className="location-select-wrap">
              <label htmlFor="city-select" className="city-select-label">
                Or select city manually:
              </label>
              <select
                id="city-select"
                className="city-dropdown"
                value={activeCity}
                onChange={(e) => handleCitySelect(e.target.value)}
              >
                {cityList.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.displayName || c.name.replace(/_/g, " ")} {c.region ? `(${c.region})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {statusMessage && (
              <p className="location-status-message">{statusMessage}</p>
            )}
          </section>

          {/* Google Drive Backup & Restore */}
          <section className="setting-group backup-section">
            <div className="setting-group-header">
              <h3>Backup & Restore</h3>
              {driveConfig.isConnected ? (
                <span className="status-badge connected">● Connected to Drive</span>
              ) : (
                <span className="status-badge disconnected">Offline Storage Only</span>
              )}
            </div>

            <p className="setting-desc">
              Backup your events and calendar data to your Google Drive or export a portable backup file.
            </p>

            {/* Google Drive Status & Primary Action Buttons */}
            <div className="backup-actions-grid">
              {driveConfig.isConnected ? (
                <>
                  <div className="drive-connected-card">
                    <div className="drive-card-info">
                      <span className="drive-card-title">Google Drive Folder</span>
                      <span className="drive-folder-name">📁 {driveConfig.folderName}</span>
                      {driveConfig.lastBackup && (
                        <span className="drive-last-backup">
                          Last backup: {new Date(driveConfig.lastBackup).toLocaleString()}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      className="text-btn danger-text-btn"
                      onClick={handleDisconnectDrive}
                    >
                      Disconnect
                    </button>
                  </div>

                  <div className="drive-buttons-row">
                    <button
                      type="button"
                      className="primary-btn backup-btn"
                      onClick={handleBackupNow}
                      disabled={isBackingUp}
                    >
                      {isBackingUp ? "Backing up…" : "Backup Now"}
                    </button>

                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={handleRestoreFromDrive}
                      disabled={isRestoring}
                    >
                      {isRestoring ? "Restoring…" : "Restore from Drive"}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="secondary-btn connect-drive-btn"
                    onClick={handleConnectDrive}
                    disabled={isConnectingDrive}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12.01 1.99c-2.4 0-4.66.95-6.36 2.65L2.83 7.46l4.24 7.34 3.54-6.14 7.07.01-2.12-3.67C14.73 2.76 13.4 1.99 12.01 1.99zM7.07 14.81l-4.24 7.35c1.69 1.69 3.96 2.64 6.36 2.64 1.39 0 2.72-.77 3.55-2.01l2.12-3.67H7.79l-.72-4.31zm13.49-7.35l-3.54 6.14 3.54 6.14 4.24-7.34c.83-1.44.83-3.21 0-4.65l-4.24-7.34z"/>
                    </svg>
                    <span>{isConnectingDrive ? "Connecting…" : "Connect Google Drive"}</span>
                  </button>

                  <button
                    type="button"
                    className="primary-btn backup-btn"
                    onClick={handleBackupNow}
                    disabled={isBackingUp}
                  >
                    Download Local Backup File
                  </button>
                </>
              )}
            </div>

            {/* Offline File Import / Export Section */}
            <div className="file-import-section">
              <span className="sub-label">Import / Export Backup File</span>
              <p className="setting-desc">
                Import a <code>{BACKUP_FILE_NAME}</code> file downloaded from your Google Drive or saved previously.
              </p>

              <div className="file-import-buttons">
                <input
                  type="file"
                  accept=".json,application/json"
                  ref={fileInputRef}
                  style={{ display: "none" }}
                  onChange={handleFileUpload}
                />

                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isRestoring}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <span>Select & Import File</span>
                </button>

                <button
                  type="button"
                  className="secondary-btn"
                  onClick={handleExportLocalFile}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span>Save File to Device</span>
                </button>
              </div>
            </div>

            {/* Backup Status Message Banner */}
            {backupStatus && (
              <div className="backup-status-banner">
                <span>{backupStatus}</span>
              </div>
            )}

            {/* Manual / How to Restore Guide Toggle */}
            <div className="manual-section">
              <button
                type="button"
                className="manual-toggle-btn"
                onClick={() => setShowManual(!showManual)}
              >
                <span>{showManual ? "▾ Hide Restore Guide" : "▸ How to Backup & Restore (Guide)"}</span>
              </button>

              {showManual && (
                <div className="restore-manual-content">
                  <h4>Google Drive Backup & Restore Guide</h4>
                  <ol>
                    <li>
                      <b>Connect Google Drive:</b> Click "Connect Google Drive" and enter the folder name where you wish your backups stored. Sign in with your Google account.
                    </li>
                    <li>
                      <b>Automatic Background Sync:</b> Once connected, every time you add, edit, or delete an event, TriCalendar quietly updates <code>{BACKUP_FILE_NAME}</code> in your Google Drive folder whenever you are online. If you are offline, the app operates completely normally without disruption.
                    </li>
                    <li>
                      <b>Manual Backup:</b> Tap <b>"Backup Now"</b> at any time to immediately push all your database events to Drive.
                    </li>
                    <li>
                      <b>Restoring onto another device:</b>
                      <ul>
                        <li><b>Direct Restore:</b> Connect your Google Drive on the new device, then simply tap <b>"Restore from Drive"</b>.</li>
                        <li><b>File Import:</b> Alternatively, open drive.google.com on any browser, download the <code>{BACKUP_FILE_NAME}</code> file, and click <b>"Select & Import File"</b> in TriCalendar settings. All your events will seamlessly merge back into your calendar!</li>
                      </ul>
                    </li>
                  </ol>
                </div>
              )}
            </div>
          </section>

          {/* Appearance / Theme Toggle */}
          <section className="setting-group">
            <h3>Theme & Appearance</h3>
            <div className="theme-toggle-row">
              <button
                type="button"
                className={`theme-option-btn ${theme === "light" ? "active" : ""}`}
                onClick={() => onToggleTheme && onToggleTheme("light")}
              >
                <SunIcon size={16} className="theme-icon" />
                <span className="theme-label">Light Mode</span>
              </button>
              <button
                type="button"
                className={`theme-option-btn ${theme === "dark" ? "active" : ""}`}
                onClick={() => onToggleTheme && onToggleTheme("dark")}
              >
                <MoonIcon size={16} className="theme-icon" />
                <span className="theme-label">Dark Mode</span>
              </button>
            </div>
          </section>

          <section className="setting-group danger-zone">
            <h3>Data Reset</h3>
            <p className="setting-desc">
              Permanently delete all saved events and occurrences from local storage.
            </p>
            <button
              type="button"
              className="danger-btn"
              onClick={() => {
                onResetData?.();
                onClose();
              }}
            >
              Delete All Events
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
