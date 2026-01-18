import { request } from "./request.js";

const API_URL = "https://api.wyzecam.com";

export async function getDeviceList(accessToken) {
  const { data } = await request(API_URL + "/app/v2/home_page/get_object_list", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "wyzer-api/1.0.0"
    },
    body: JSON.stringify({
      access_token: accessToken,
      app_name: "com.hualai.WyzeCam",
      app_ver: "wyzer-api",
      app_version: "wyzer-api",
      phone_id: "wyzer-api",
      phone_system_type: "1",
      sc: "wyzer-api",
      sv: "wyzer-api",
      ts: Date.now()
    })
  });

  if (data.code !== "1" && data.code !== 1) {
    throw new Error("Failed to get devices: " + (data.msg || JSON.stringify(data)));
  }

  return data.data.device_list || [];
}

export async function getDeviceByName(accessToken, name) {
  const devices = await getDeviceList(accessToken);
  return devices.find(d => d.nickname.toLowerCase() === name.toLowerCase());
}

export async function getDeviceByMac(accessToken, mac) {
  const devices = await getDeviceList(accessToken);
  return devices.find(d => d.mac === mac);
}

export async function getDevicesByType(accessToken, type) {
  const devices = await getDeviceList(accessToken);
  return devices.filter(d => d.product_type.toLowerCase() === type.toLowerCase());
}
