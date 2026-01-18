import fs from "fs";
import path from "path";

const TOKEN_FILE = ".tokens.json";

export function getTokenPath(basePath = ".") {
  return path.join(basePath, TOKEN_FILE);
}

export function loadTokens(basePath = ".") {
  const tokenPath = getTokenPath(basePath);
  try {
    if (fs.existsSync(tokenPath)) {
      const data = JSON.parse(fs.readFileSync(tokenPath, "utf8"));
      return data;
    }
  }
  catch (err) {
    console.error("Failed to load tokens:", err.message);
  }
  return null;
}

export function saveTokens(accessToken, refreshToken, basePath = ".") {
  const tokenPath = getTokenPath(basePath);
  const data = {
    accessToken,
    refreshToken,
    savedAt: Date.now()
  };
  fs.writeFileSync(tokenPath, JSON.stringify(data, null, 2));
}

export function clearTokens(basePath = ".") {
  const tokenPath = getTokenPath(basePath);
  if (fs.existsSync(tokenPath)) {
    fs.unlinkSync(tokenPath);
  }
}

// Decode JWT to check expiration (without verifying signature)
export function decodeJwt(token) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], "base64").toString());
    return payload;
  }
  catch {
    return null;
  }
}

export function isTokenExpired(token, bufferSeconds = 300) {
  const payload = decodeJwt(token);
  if (!payload || !payload.exp) return true;

  // Check if token expires within buffer time (default 5 minutes)
  const expiresAt = payload.exp * 1000;
  const now = Date.now();
  return now >= (expiresAt - bufferSeconds * 1000);
}
