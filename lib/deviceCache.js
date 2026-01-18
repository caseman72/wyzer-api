import fs from "fs";
import path from "path";

const CACHE_FILE = ".devices.json";
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export function getCachePath(basePath = ".") {
  return path.join(basePath, CACHE_FILE);
}

export function loadDeviceCache(basePath = ".") {
  const cachePath = getCachePath(basePath);
  try {
    if (fs.existsSync(cachePath)) {
      const data = JSON.parse(fs.readFileSync(cachePath, "utf8"));

      // Check if cache is still valid
      if (data.savedAt && (Date.now() - data.savedAt) < CACHE_TTL) {
        return data.devices;
      }

      console.log("Device cache expired");
    }
  }
  catch (err) {
    console.error("Failed to load device cache:", err.message);
  }
  return null;
}

export function saveDeviceCache(devices, basePath = ".") {
  const cachePath = getCachePath(basePath);
  const data = {
    devices,
    savedAt: Date.now()
  };
  fs.writeFileSync(cachePath, JSON.stringify(data, null, 2));
}

export function clearDeviceCache(basePath = ".") {
  const cachePath = getCachePath(basePath);
  if (fs.existsSync(cachePath)) {
    fs.unlinkSync(cachePath);
  }
}

export function getCacheAge(basePath = ".") {
  const cachePath = getCachePath(basePath);
  try {
    if (fs.existsSync(cachePath)) {
      const data = JSON.parse(fs.readFileSync(cachePath, "utf8"));
      if (data.savedAt) {
        return Date.now() - data.savedAt;
      }
    }
  }
  catch {
    // ignore
  }
  return null;
}
