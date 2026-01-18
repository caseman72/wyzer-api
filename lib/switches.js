import { createOliveSignatureJson } from "./crypto.js";
import { request } from "./request.js";

const SIRIUS_URL = "https://wyze-sirius-service.wyzecam.com";

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

  const { data } = await request(SIRIUS_URL + "/plugin/sirius/set_iot_prop_by_topic", {
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
    throw new Error("Failed to set switch: " + (data.message || JSON.stringify(data)));
  }

  return data;
}

export async function turnOn(accessToken, deviceMac, deviceModel = "LD_SS1") {
  return setIotProp(accessToken, deviceMac, deviceModel, "switch-power", true);
}

export async function turnOff(accessToken, deviceMac, deviceModel = "LD_SS1") {
  return setIotProp(accessToken, deviceMac, deviceModel, "switch-power", false);
}

export async function getState(accessToken, deviceMac) {
  const keys = "iot_state,switch-power,switch-iot";
  const nonce = String(Date.now());

  const params = new URLSearchParams({
    did: deviceMac,
    keys: keys,
    nonce: nonce
  });

  // Signature for GET uses sorted key=value pairs
  const signPayload = "did=" + deviceMac + "&keys=" + keys + "&nonce=" + nonce;
  const signature = createOliveSignatureJson(signPayload, accessToken);

  const { data } = await request(SIRIUS_URL + "/plugin/sirius/get_iot_prop?" + params.toString(), {
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
    throw new Error("Failed to get switch state: " + (data.message || JSON.stringify(data)));
  }

  return data.data?.props || {};
}
