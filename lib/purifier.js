import { createOliveSignature, createOliveSignatureJson } from "./crypto.js";
import { request } from "./request.js";
import { turnOn as legacyTurnOn, turnOff as legacyTurnOff, getState as legacyGetState } from "./plugs.js";

const EARTH_URL = "https://wyze-earth-service.wyzecam.com";

export const FAN_MODES = ["auto", "sleep", "min", "mid", "max", "turbo"];

function oliveHeaders(accessToken, signature) {
  return {
    "User-Agent": "wyzer-api/1.0.0",
    "appid": "9319141212m2ik",
    "appinfo": "wyze_android_2.19.14",
    "phoneid": "wyzer-api",
    "access_token": accessToken,
    "signature2": signature
  };
}

export async function getData(accessToken, deviceMac) {
  const params = {
    did: deviceMac,
    keys: "iot_state,fan_mode,app_version,sn,wifi_mac",
    nonce: String(Date.now())
  };

  const signature = createOliveSignature(params, accessToken);
  const url = EARTH_URL + "/plugin/earth/get_iot_prop?" + new URLSearchParams(params).toString();

  const { data } = await request(url, {
    method: "GET",
    headers: oliveHeaders(accessToken, signature)
  });

  if (data.code !== 1) {
    throw new Error("Failed to get purifier data: " + (data.message || JSON.stringify(data)));
  }

  const props = data.data?.props || {};

  return {
    fanMode: props.fan_mode,
    connected: props.iot_state === "connected",
    sn: props.sn,
    wifiMac: props.wifi_mac,
    appVersion: props.app_version
  };
}

export async function getAqi(accessToken, deviceMac, deviceModel = "CO_AP1") {
  const params = {
    deviceId: deviceMac,
    deviceModel: deviceModel,
    propNames: "aqi",
    nonce: String(Date.now())
  };

  const signature = createOliveSignature(params, accessToken);
  const url = EARTH_URL + "/plugin/earth/get_air_prop?" + new URLSearchParams(params).toString();

  const { data } = await request(url, {
    method: "GET",
    headers: oliveHeaders(accessToken, signature)
  });

  if (data.code !== 1) {
    throw new Error("Failed to get purifier AQI: " + (data.message || JSON.stringify(data)));
  }

  const aqi = parseInt(data.data?.settings?.aqi, 10);
  return Number.isNaN(aqi) ? null : aqi;
}

export async function setFanMode(accessToken, deviceMac, mode, deviceModel = "CO_AP1") {
  // mode: "auto", "sleep", "min", "mid", "max", "turbo"
  if (!FAN_MODES.includes(mode)) {
    throw new Error("Invalid fan mode: " + mode + " (expected " + FAN_MODES.join(", ") + ")");
  }

  const payload = {
    did: deviceMac,
    model: deviceModel,
    props: {
      fan_mode: mode
    },
    is_sub_device: 0,
    nonce: String(Date.now())
  };

  const payloadStr = JSON.stringify(payload);
  const signature = createOliveSignatureJson(payloadStr, accessToken);

  const { data } = await request(EARTH_URL + "/plugin/earth/set_iot_prop_by_topic", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...oliveHeaders(accessToken, signature)
    },
    body: payloadStr
  });

  if (data.code !== 1) {
    throw new Error("Failed to set purifier fan mode: " + (data.message || JSON.stringify(data)));
  }

  return data;
}

// Power uses the legacy set_property/get_property_list API (P3), same as plugs
export async function turnOn(accessToken, deviceMac, deviceModel = "CO_AP1") {
  return legacyTurnOn(accessToken, deviceMac, deviceModel);
}

export async function turnOff(accessToken, deviceMac, deviceModel = "CO_AP1") {
  return legacyTurnOff(accessToken, deviceMac, deviceModel);
}

export async function getState(accessToken, deviceMac, deviceModel = "CO_AP1") {
  return legacyGetState(accessToken, deviceMac, deviceModel);
}
