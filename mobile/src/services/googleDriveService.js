import { Capacitor, registerPlugin } from "@capacitor/core";

const CalendarEngine = registerPlugin("CalendarEngine");

/**
 * Google Drive Backup & Restore Service for TriCalendar
 *
 * Supports native Google Play Services Auth on Android (no browser redirect, no loopback)
 * and OAuth2 implicit flow on standard Web.
 * Scope: 'https://www.googleapis.com/auth/drive.file'
 */

const STORAGE_KEYS = {
  CLIENT_ID: "tricalendar_gdrive_client_id",
  ACCESS_TOKEN: "tricalendar_gdrive_token",
  TOKEN_EXPIRY: "tricalendar_gdrive_token_expiry",
  FOLDER_NAME: "tricalendar_gdrive_folder_name",
  FOLDER_ID: "tricalendar_gdrive_folder_id",
  FILE_ID: "tricalendar_gdrive_file_id",
  LAST_BACKUP: "tricalendar_gdrive_last_backup",
  AUTO_BACKUP: "tricalendar_gdrive_auto_backup",
  USER_EMAIL: "tricalendar_gdrive_user_email",
};

export const BACKUP_FILE_NAME = "tricalendar-backup.json";
export const DEFAULT_FOLDER_NAME = "TriCalendar Backoff";

// TriCalendar Google OAuth2 Client ID
export const DEFAULT_CLIENT_ID = "673136995980-t54dg6su1gknhr083sb69nadc9fus6g3.apps.googleusercontent.com";

export function getStoredConfig() {
  return {
    clientId: localStorage.getItem(STORAGE_KEYS.CLIENT_ID) || DEFAULT_CLIENT_ID,
    folderName: localStorage.getItem(STORAGE_KEYS.FOLDER_NAME) || DEFAULT_FOLDER_NAME,
    folderId: localStorage.getItem(STORAGE_KEYS.FOLDER_ID) || null,
    fileId: localStorage.getItem(STORAGE_KEYS.FILE_ID) || null,
    lastBackup: localStorage.getItem(STORAGE_KEYS.LAST_BACKUP) || null,
    autoBackup: localStorage.getItem(STORAGE_KEYS.AUTO_BACKUP) !== "false",
    userEmail: localStorage.getItem(STORAGE_KEYS.USER_EMAIL) || null,
    isConnected: Boolean(getValidAccessToken() || (Capacitor.isNativePlatform() && localStorage.getItem(STORAGE_KEYS.USER_EMAIL)))
  };
}

export function saveStoredConfig(config) {
  if (config.clientId !== undefined) localStorage.setItem(STORAGE_KEYS.CLIENT_ID, config.clientId);
  if (config.folderName !== undefined) localStorage.setItem(STORAGE_KEYS.FOLDER_NAME, config.folderName);
  if (config.folderId !== undefined) {
    if (config.folderId) localStorage.setItem(STORAGE_KEYS.FOLDER_ID, config.folderId);
    else localStorage.removeItem(STORAGE_KEYS.FOLDER_ID);
  }
  if (config.fileId !== undefined) {
    if (config.fileId) localStorage.setItem(STORAGE_KEYS.FILE_ID, config.fileId);
    else localStorage.removeItem(STORAGE_KEYS.FILE_ID);
  }
  if (config.lastBackup !== undefined) {
    if (config.lastBackup) localStorage.setItem(STORAGE_KEYS.LAST_BACKUP, config.lastBackup);
    else localStorage.removeItem(STORAGE_KEYS.LAST_BACKUP);
  }
  if (config.autoBackup !== undefined) localStorage.setItem(STORAGE_KEYS.AUTO_BACKUP, String(config.autoBackup));
  if (config.userEmail !== undefined) {
    if (config.userEmail) localStorage.setItem(STORAGE_KEYS.USER_EMAIL, config.userEmail);
    else localStorage.removeItem(STORAGE_KEYS.USER_EMAIL);
  }
}

export function getValidAccessToken() {
  const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  const expiry = Number(localStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRY) || 0);
  if (!token) return null;
  // If expired or expiring within 60 seconds
  if (Date.now() >= expiry - 60000) {
    return null;
  }
  return token;
}

export function setAccessToken(token, expiresInSeconds = 3600) {
  if (!token) {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRY);
    return;
  }
  localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
  localStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRY, String(Date.now() + expiresInSeconds * 1000));
}

/**
 * Ensures an active access token is available, silently refreshing via Android Google Play Services if needed.
 */
export async function ensureValidAccessToken() {
  const active = getValidAccessToken();
  if (active) return active;

  if (Capacitor.isNativePlatform()) {
    try {
      const res = await CalendarEngine.getGoogleAccessToken();
      if (res && res.accessToken) {
        setAccessToken(res.accessToken, 3600);
        if (res.email) saveStoredConfig({ userEmail: res.email });
        return res.accessToken;
      }
    } catch (e) {
      console.warn("Silent token refresh failed:", e);
    }
  }
  return null;
}

export async function disconnectGoogleDrive() {
  localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRY);
  localStorage.removeItem(STORAGE_KEYS.FOLDER_ID);
  localStorage.removeItem(STORAGE_KEYS.FILE_ID);
  localStorage.removeItem(STORAGE_KEYS.USER_EMAIL);

  if (Capacitor.isNativePlatform()) {
    try {
      await CalendarEngine.signOutGoogle();
    } catch (e) {
      console.warn("Error signing out of native Google Play Services:", e);
    }
  }
}

/**
 * Connect to Google Drive.
 * On Android: Uses Google Play Services Native Account Picker (bypasses loopback/browser restrictions entirely).
 * On Web: Falls back to browser redirect flow.
 */
export async function connectGoogleDrive() {
  if (Capacitor.isNativePlatform()) {
    const res = await CalendarEngine.signInWithGoogle();
    if (res && res.accessToken) {
      setAccessToken(res.accessToken, 3600);
      if (res.email) {
        saveStoredConfig({ userEmail: res.email });
      }
      return { success: true, email: res.email, displayName: res.displayName };
    }
    throw new Error("No access token returned from Google Sign-In");
  } else {
    initiateGoogleAuthWeb();
    return { pending: true };
  }
}

/**
 * Web fallback for OAuth2 redirect
 */
export function initiateGoogleAuthWeb(clientId = DEFAULT_CLIENT_ID) {
  const finalClientId = clientId || DEFAULT_CLIENT_ID;
  saveStoredConfig({ clientId: finalClientId });

  const redirectUri = window.location.origin + window.location.pathname;
  const scope = encodeURIComponent("https://www.googleapis.com/auth/drive.file");
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(finalClientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${scope}&prompt=select_account`;

  window.location.href = authUrl;
}

/**
 * Kept for backwards compatibility
 */
export const initiateGoogleAuth = connectGoogleDrive;

/**
 * Handle URL hash token on page load if returning from Web OAuth redirect
 */
export function checkAuthRedirectCallback() {
  if (!window.location.hash) return false;
  const hash = window.location.hash.substring(1);
  const params = new URLSearchParams(hash);
  const accessToken = params.get("access_token");
  const expiresIn = params.get("expires_in");

  if (accessToken) {
    setAccessToken(accessToken, expiresIn ? Number(expiresIn) : 3600);
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    return true;
  }
  return false;
}

/**
 * Find or create the dedicated backup folder on Google Drive
 */
export async function getOrCreateFolder(folderName = DEFAULT_FOLDER_NAME) {
  const token = await ensureValidAccessToken();
  if (!token) throw new Error("Google Drive not connected or session expired.");

  // 1. Check if folder already exists (checking specified name, TriCalendar Backoff, or TriCalendar Backup)
  const escapedName = folderName.replace(/'/g, "\\'");
  const query = encodeURIComponent(
    `(name = '${escapedName}' or name = 'TriCalendar Backoff' or name = 'TriCalendar Backup') and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
  );
  const listRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!listRes.ok) {
    const err = await listRes.json().catch(() => ({}));
    throw new Error(err.error?.message || "Failed to search folder on Google Drive");
  }

  const listData = await listRes.json();
  if (listData.files && listData.files.length > 0) {
    const existing = listData.files[0];
    saveStoredConfig({ folderId: existing.id, folderName: existing.name });
    return existing.id;
  }

  // 2. Create folder
  const createRes = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: "application/vnd.google-apps.folder"
    })
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    throw new Error(err.error?.message || "Failed to create folder on Google Drive");
  }

  const createData = await createRes.json();
  saveStoredConfig({ folderId: createData.id, folderName });
  return createData.id;
}

/**
 * Uploads database backup JSON payload to Google Drive
 */
export async function uploadBackupToDrive(jsonData, folderName = DEFAULT_FOLDER_NAME) {
  const token = await ensureValidAccessToken();
  if (!token) throw new Error("Google Drive is not connected.");

  const folderId = await getOrCreateFolder(folderName);

  // Check if file already exists in folder
  const fileQuery = encodeURIComponent(`name = '${BACKUP_FILE_NAME}' and '${folderId}' in parents and trashed = false`);
  const checkRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${fileQuery}&fields=files(id,name)`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  const checkData = checkRes.ok ? await checkRes.json() : { files: [] };
  const existingFileId = checkData.files?.[0]?.id;

  const contentStr = typeof jsonData === "string" ? jsonData : JSON.stringify(jsonData, null, 2);

  let uploadUrl = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";
  let method = "POST";

  const metadata = {
    name: BACKUP_FILE_NAME,
    mimeType: "application/json"
  };

  if (existingFileId) {
    // Update existing file
    uploadUrl = `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart`;
    method = "PATCH";
  } else {
    metadata.parents = [folderId];
  }

  const boundary = "-------314159265358979323846";
  const delimiter = "\r\n--" + boundary + "\r\n";
  const closeDelim = "\r\n--" + boundary + "--";

  const multipartRequestBody =
    delimiter +
    "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
    JSON.stringify(metadata) +
    delimiter +
    "Content-Type: application/json\r\n\r\n" +
    contentStr +
    closeDelim;

  const uploadRes = await fetch(uploadUrl, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": `multipart/related; boundary=${boundary}`
    },
    body: multipartRequestBody
  });

  if (!uploadRes.ok) {
    const err = await uploadRes.json().catch(() => ({}));
    throw new Error(err.error?.message || "Failed to upload backup file to Google Drive");
  }

  const fileResult = await uploadRes.json();
  const nowStr = new Date().toISOString();
  saveStoredConfig({ fileId: fileResult.id, lastBackup: nowStr });

  return { success: true, fileId: fileResult.id, timestamp: nowStr };
}

/**
 * Downloads backup JSON directly from Google Drive
 */
export async function downloadBackupFromDrive(folderName = DEFAULT_FOLDER_NAME) {
  const token = await ensureValidAccessToken();
  if (!token) throw new Error("Google Drive is not connected.");

  const folderId = await getOrCreateFolder(folderName);

  const query = encodeURIComponent(`name = '${BACKUP_FILE_NAME}' and '${folderId}' in parents and trashed = false`);
  const listRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!listRes.ok) {
    throw new Error("Failed to find backup file in Google Drive");
  }

  const listData = await listRes.json();
  const file = listData.files?.[0];
  if (!file) {
    throw new Error(`No backup file "${BACKUP_FILE_NAME}" found in folder "${folderName}".`);
  }

  const downloadRes = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!downloadRes.ok) {
    throw new Error("Failed to download file content from Google Drive");
  }

  return await downloadRes.json();
}
