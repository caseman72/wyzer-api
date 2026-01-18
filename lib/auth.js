import { hashPassword } from "./crypto.js";

const AUTH_URL = "https://auth-prod.api.wyze.com";

export async function login(email, password, keyId, apiKey, authApiKey, { preHashed = false } = {}) {
  const hashedPassword = preHashed ? password : hashPassword(password);

  const response = await fetch(AUTH_URL + "/api/user/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": authApiKey,
      "apikey": apiKey,
      "keyid": keyId,
      "User-Agent": "wyzer-api/1.0.0"
    },
    body: JSON.stringify({
      email,
      password: hashedPassword
    })
  });

  const data = await response.json();

  if (!data.access_token) {
    throw new Error("Login failed: " + (data.message || JSON.stringify(data)));
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    userId: data.user_id
  };
}

export async function refreshToken(currentRefreshToken) {
  const response = await fetch("https://api.wyzecam.com/app/user/refresh_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "wyzer-api/1.0.0"
    },
    body: JSON.stringify({
      refresh_token: currentRefreshToken,
      app_ver: "wyzer-api",
      phone_id: "wyzer-api",
      ts: Date.now()
    })
  });

  const data = await response.json();

  if (data.code !== 1 || !data.data?.access_token) {
    throw new Error("Token refresh failed: " + (data.msg || JSON.stringify(data)));
  }

  return {
    accessToken: data.data.access_token,
    refreshToken: data.data.refresh_token
  };
}
