import { request } from "./request.js";

const API_URL = "https://api.wyzecam.com";

async function setProperty(accessToken, deviceMac, deviceModel, propertyId, propertyValue) {
  const { data } = await request(API_URL + "/app/v2/device/set_property", {
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
      ts: Date.now(),
      device_mac: deviceMac,
      device_model: deviceModel,
      pid: propertyId,
      pvalue: propertyValue
    })
  });

  if (data.code !== "1" && data.code !== 1) {
    throw new Error("Failed to set property: " + (data.msg || JSON.stringify(data)));
  }

  return data;
}

export async function turnOn(accessToken, deviceMac, deviceModel = "WLPP1") {
  return setProperty(accessToken, deviceMac, deviceModel, "P3", "1");
}

export async function turnOff(accessToken, deviceMac, deviceModel = "WLPP1") {
  return setProperty(accessToken, deviceMac, deviceModel, "P3", "0");
}

export async function toggle(accessToken, device) {
  const isOn = device.device_params?.power_switch === 1;
  if (isOn) {
    return turnOff(accessToken, device.mac, device.product_model);
  }
  else {
    return turnOn(accessToken, device.mac, device.product_model);
  }
}

export async function getState(accessToken, deviceMac, deviceModel = "WLPP1") {
  const { data } = await request(API_URL + "/app/v2/device/get_property_list", {
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
      ts: Date.now(),
      device_mac: deviceMac,
      device_model: deviceModel
    })
  });

  if (data.code !== "1" && data.code !== 1) {
    throw new Error("Failed to get property: " + (data.msg || JSON.stringify(data)));
  }

  // Parse property list into object
  const props = {};
  for (const p of data.data?.property_list || []) {
    props[p.pid] = p.value;
  }

  return {
    switch_state: props["P3"] === "1",
    rssi: props["P1601"],
    raw: data.data
  };
}
