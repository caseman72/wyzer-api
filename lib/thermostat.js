import { createOliveSignature, createOliveSignatureJson } from "./crypto.js";
import { request } from "./request.js";

const EARTH_URL = "https://wyze-earth-service.wyzecam.com";

export async function getData(accessToken, deviceMac) {
  const keys = "temperature,humidity,mode_sys,heat_sp,cool_sp,fan_mode,working_state,temp_unit,iot_state,current_scenario,dev_hold";
  const nonce = String(Date.now());

  const params = {
    did: deviceMac,
    keys: keys,
    nonce: nonce
  };

  const signature = createOliveSignature(params, accessToken);

  const url = EARTH_URL + "/plugin/earth/get_iot_prop?" + new URLSearchParams(params).toString();

  const { data } = await request(url, {
    method: "GET",
    headers: {
      "User-Agent": "wyzer-api/1.0.0",
      "appid": "9319141212m2ik",
      "appinfo": "wyze_android_2.19.14",
      "phoneid": "wyzer-api",
      "access_token": accessToken,
      "signature2": signature
    }
  });

  if (data.code !== 1) {
    throw new Error("Failed to get thermostat data: " + (data.message || JSON.stringify(data)));
  }

  const props = data.data?.props || {};

  return {
    temperature: parseFloat(props.temperature),
    humidity: parseInt(props.humidity),
    mode: props.mode_sys,
    heatSetpoint: parseInt(props.heat_sp),
    coolSetpoint: parseInt(props.cool_sp),
    fanMode: props.fan_mode,
    workingState: props.working_state,
    tempUnit: props.temp_unit,
    connected: props.iot_state === "connected",
    scenario: props.current_scenario,
    hold: props.dev_hold === "1"
  };
}

async function setIotProp(accessToken, deviceMac, deviceModel, propKey, value) {
  const payload = {
    did: deviceMac,
    model: deviceModel,
    props: {
      [propKey]: value
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
      "User-Agent": "wyzer-api/1.0.0",
      "appid": "9319141212m2ik",
      "appinfo": "wyze_android_2.19.14",
      "phoneid": "wyzer-api",
      "access_token": accessToken,
      "signature2": signature
    },
    body: payloadStr
  });

  if (data.code !== 1) {
    throw new Error("Failed to set thermostat: " + (data.message || JSON.stringify(data)));
  }

  return data;
}

export async function setHeatTemp(accessToken, deviceMac, temp, deviceModel = "CO_EA1") {
  return setIotProp(accessToken, deviceMac, deviceModel, "heat_sp", String(temp));
}

export async function setCoolTemp(accessToken, deviceMac, temp, deviceModel = "CO_EA1") {
  return setIotProp(accessToken, deviceMac, deviceModel, "cool_sp", String(temp));
}

export async function setMode(accessToken, deviceMac, mode, deviceModel = "CO_EA1") {
  // mode: "heat", "cool", "auto", "off"
  return setIotProp(accessToken, deviceMac, deviceModel, "mode_sys", mode);
}

export async function setFanMode(accessToken, deviceMac, mode, deviceModel = "CO_EA1") {
  // mode: "auto", "on", "circ"
  return setIotProp(accessToken, deviceMac, deviceModel, "fan_mode", mode);
}

export async function setHold(accessToken, deviceMac, hold, deviceModel = "CO_EA1") {
  return setIotProp(accessToken, deviceMac, deviceModel, "dev_hold", hold ? "1" : "0");
}
