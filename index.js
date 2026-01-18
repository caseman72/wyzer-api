import { config } from "dotenv";
import { login, refreshToken } from "./lib/auth.js";
import { loadTokens, saveTokens, isTokenExpired, decodeJwt } from "./lib/tokens.js";
import { getRateLimitStatus, RateLimitError } from "./lib/request.js";
import { getDeviceList } from "./lib/devices.js";
import { loadDeviceCache, saveDeviceCache, clearDeviceCache, getCacheAge } from "./lib/deviceCache.js";
import * as plugs from "./lib/plugs.js";
import * as switches from "./lib/switches.js";
import * as thermostat from "./lib/thermostat.js";

// Load .env.local
config({ path: ".env.local" });

class Wyzer {
  constructor(options = {}) {
    this.email = options.email || process.env.WYZE_EMAIL;
    this.keyId = options.keyId || process.env.WYZE_KEY_ID;
    this.apiKey = options.apiKey || process.env.WYZE_API_KEY;
    this.apiKeyExpires = options.apiKeyExpires || process.env.WYZE_API_KEY_EXPIRES;
    this.authApiKey = options.authApiKey || process.env.WYZE_AUTH_API_KEY;
    this.tokenPath = options.tokenPath || ".";
    this.accessToken = null;
    this.refreshToken = null;
    this.userId = null;

    // Support pre-hashed password (WYZE_PASSWORD_HASH) or plain password
    if (options.passwordHash || process.env.WYZE_PASSWORD_HASH) {
      this.password = options.passwordHash || process.env.WYZE_PASSWORD_HASH;
      this.preHashed = true;
    }
    else {
      this.password = options.password || process.env.WYZE_PASSWORD;
      this.preHashed = false;
    }
  }

  async login() {
    // Check API key expiry
    this.checkApiKeyExpiry();

    // Try to load cached tokens first
    const cached = loadTokens(this.tokenPath);

    if (cached) {
      // Check if access token is still valid
      if (!isTokenExpired(cached.accessToken)) {
        this.accessToken = cached.accessToken;
        this.refreshToken = cached.refreshToken;
        this.userId = decodeJwt(cached.accessToken)?.user_id;
        console.log("Using cached access token");
        return { accessToken: this.accessToken, refreshToken: this.refreshToken, userId: this.userId };
      }

      // Access token expired, try refresh token
      if (!isTokenExpired(cached.refreshToken)) {
        console.log("Access token expired, refreshing...");
        try {
          this.refreshToken = cached.refreshToken;
          const result = await this.refresh();
          this.userId = decodeJwt(this.accessToken)?.user_id;
          saveTokens(this.accessToken, this.refreshToken, this.tokenPath);
          return { accessToken: this.accessToken, refreshToken: this.refreshToken, userId: this.userId };
        }
        catch (err) {
          console.log("Refresh failed, doing full login:", err.message);
        }
      }
      else {
        console.log("Refresh token expired, doing full login");
      }
    }

    // Full login
    console.log("Logging in...");
    const result = await login(this.email, this.password, this.keyId, this.apiKey, this.authApiKey, { preHashed: this.preHashed });
    this.accessToken = result.accessToken;
    this.refreshToken = result.refreshToken;
    this.userId = result.userId;

    // Cache tokens
    saveTokens(this.accessToken, this.refreshToken, this.tokenPath);

    return result;
  }

  async refresh() {
    const result = await refreshToken(this.refreshToken);
    this.accessToken = result.accessToken;
    this.refreshToken = result.refreshToken;
    return result;
  }

  // Devices (cached)
  async getDevices(forceRefresh = false) {
    if (!forceRefresh) {
      const cached = loadDeviceCache(this.tokenPath);
      if (cached) {
        console.log("Using cached device list");
        return cached;
      }
    }

    console.log("Fetching device list from API...");
    const devices = await getDeviceList(this.accessToken);
    saveDeviceCache(devices, this.tokenPath);
    return devices;
  }

  async refreshDevices() {
    return this.getDevices(true);
  }

  clearDeviceCache() {
    clearDeviceCache(this.tokenPath);
  }

  getDeviceCacheAge() {
    const age = getCacheAge(this.tokenPath);
    if (age === null) return null;
    return {
      ms: age,
      seconds: Math.floor(age / 1000),
      minutes: Math.floor(age / 60000),
      hours: Math.floor(age / 3600000)
    };
  }

  async getDevice(name) {
    const devices = await this.getDevices();
    return devices.find(d => d.nickname.toLowerCase() === name.toLowerCase());
  }

  async getDeviceByMac(mac) {
    const devices = await this.getDevices();
    return devices.find(d => d.mac === mac);
  }

  async getDevicesByType(type) {
    const devices = await this.getDevices();
    return devices.filter(d => d.product_type.toLowerCase() === type.toLowerCase());
  }

  // Plugs
  async plugOn(deviceMac, deviceModel) {
    return plugs.turnOn(this.accessToken, deviceMac, deviceModel);
  }

  async plugOff(deviceMac, deviceModel) {
    return plugs.turnOff(this.accessToken, deviceMac, deviceModel);
  }

  async getPlugState(deviceMac, deviceModel) {
    return plugs.getState(this.accessToken, deviceMac, deviceModel);
  }

  async isPlugOn(deviceMac, deviceModel) {
    const state = await plugs.getState(this.accessToken, deviceMac, deviceModel);
    return state.switch_state;
  }

  async isPlugOff(deviceMac, deviceModel) {
    const state = await plugs.getState(this.accessToken, deviceMac, deviceModel);
    return !state.switch_state;
  }

  // Wall Switches
  async switchOn(deviceMac, deviceModel) {
    return switches.turnOn(this.accessToken, deviceMac, deviceModel);
  }

  async switchOff(deviceMac, deviceModel) {
    return switches.turnOff(this.accessToken, deviceMac, deviceModel);
  }

  async isSwitchOn(deviceMac) {
    const state = await switches.getState(this.accessToken, deviceMac);
    return state["switch-power"];
  }

  async isSwitchOff(deviceMac) {
    const state = await switches.getState(this.accessToken, deviceMac);
    return !state["switch-power"];
  }

  async getSwitchState(deviceMac) {
    return switches.getState(this.accessToken, deviceMac);
  }

  // Thermostat
  async getThermostat(deviceMac) {
    return thermostat.getData(this.accessToken, deviceMac);
  }

  async setHeatTemp(deviceMac, temp, deviceModel) {
    return thermostat.setHeatTemp(this.accessToken, deviceMac, temp, deviceModel);
  }

  async setCoolTemp(deviceMac, temp, deviceModel) {
    return thermostat.setCoolTemp(this.accessToken, deviceMac, temp, deviceModel);
  }

  async setThermostatMode(deviceMac, mode, deviceModel) {
    return thermostat.setMode(this.accessToken, deviceMac, mode, deviceModel);
  }

  async setFanMode(deviceMac, mode, deviceModel) {
    return thermostat.setFanMode(this.accessToken, deviceMac, mode, deviceModel);
  }

  // Rate limit status
  getRateLimitStatus() {
    return getRateLimitStatus();
  }

  // API key expiry
  getApiKeyStatus() {
    if (!this.apiKeyExpires) {
      return { expires: null, daysRemaining: null, isExpired: false, isExpiringSoon: false };
    }

    const expires = new Date(this.apiKeyExpires);
    const now = new Date();
    const msRemaining = expires.getTime() - now.getTime();
    const daysRemaining = Math.floor(msRemaining / (1000 * 60 * 60 * 24));

    return {
      expires: this.apiKeyExpires,
      daysRemaining,
      isExpired: daysRemaining < 0,
      isExpiringSoon: daysRemaining >= 0 && daysRemaining <= 30
    };
  }

  checkApiKeyExpiry() {
    const status = this.getApiKeyStatus();

    if (status.isExpired) {
      console.error("WARNING: Wyze API key has EXPIRED! Renew at https://developer-api-console.wyze.com/");
    }
    else if (status.isExpiringSoon) {
      console.warn("WARNING: Wyze API key expires in " + status.daysRemaining + " days. Renew at https://developer-api-console.wyze.com/");
    }

    return status;
  }
}

export default Wyzer;
export { Wyzer, RateLimitError };
