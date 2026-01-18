# wyzer-api

Wyze API client for Node.js. Control plugs, switches, and thermostats.

## Setup

1. Copy `.env.local.example` to `.env.local`
2. Fill in your Wyze email
3. Get API credentials from https://developer-api-console.wyze.com/
4. Run the password script to hash your password:

```bash
./set-password.sh
```

This prompts for your Wyze password and stores a triple MD5 hash in `.env.local`. Your plain text password is never stored.

## Usage

```javascript
import Wyzer from "wyzer-api";

const wyze = new Wyzer();
await wyze.login();

// List devices
const devices = await wyze.getDevices();

// Control plug
await wyze.plugOn(deviceMac, deviceModel);
await wyze.plugOff(deviceMac, deviceModel);

// Control switch
await wyze.switchOn(deviceMac, deviceModel);
await wyze.switchOff(deviceMac, deviceModel);

// Thermostat
const data = await wyze.getThermostat(deviceMac);
await wyze.setHeatTemp(deviceMac, 68, deviceModel);
await wyze.setCoolTemp(deviceMac, 72, deviceModel);
await wyze.setThermostatMode(deviceMac, "auto", deviceModel);
await wyze.setFanMode(deviceMac, "auto", deviceModel);
```

## Environment Variables

```
WYZE_EMAIL=your-email@example.com
WYZE_PASSWORD_HASH=your-triple-md5-hashed-password
WYZE_KEY_ID=your-key-id
WYZE_API_KEY=your-api-key
WYZE_API_KEY_EXPIRES=YYYY-MM-DD
WYZE_AUTH_API_KEY=WMXHYf79Nr5gIlt3r0r7p9Tcw5bvs6BB4U8O8nGJ
```

## License

ISC
