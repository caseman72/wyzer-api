import crypto from "crypto";

// Triple MD5 hash for password
export function hashPassword(password) {
  const hash1 = crypto.createHash("md5").update(password).digest("hex");
  const hash2 = crypto.createHash("md5").update(hash1).digest("hex");
  const hash3 = crypto.createHash("md5").update(hash2).digest("hex");
  return hash3;
}

// HMAC-MD5 signature for Olive API (switches, thermostats)
export function createOliveSignature(payload, accessToken) {
  const secret = "wyze_app_secret_key_132";
  const secretKey = crypto.createHash("md5").update(accessToken + secret).digest("hex");
  
  let body;
  if (typeof payload === "object") {
    body = Object.keys(payload)
      .sort()
      .map(key => `${key}=${payload[key]}`)
      .join("&");
  }
  else {
    body = payload;
  }
  
  return crypto.createHmac("md5", secretKey).update(body).digest("hex");
}

// Signature for JSON payloads
export function createOliveSignatureJson(jsonString, accessToken) {
  const secret = "wyze_app_secret_key_132";
  const secretKey = crypto.createHash("md5").update(accessToken + secret).digest("hex");
  return crypto.createHmac("md5", secretKey).update(jsonString).digest("hex");
}
