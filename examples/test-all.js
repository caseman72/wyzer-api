import Wyzer from "../index.js";

const wyze = new Wyzer();

async function main() {
  console.log("=== Wyzer API Test ===\n");

  // 1. Login
  console.log("1. Logging in...");
  await wyze.login();
  console.log("   Logged in as:", wyze.userId, "\n");

  // 2. Get devices
  console.log("2. Getting device list...");
  const devices = await wyze.getDevices();
  console.log("   Found", devices.length, "devices:\n");

  devices.forEach(d => {
    console.log("   -", d.nickname, "(" + d.product_type + ")", d.mac);
  });
  console.log("");

  // 3. Test plug (Office Salt Lamps)
  console.log("3. Testing plug control (Office Salt Lamps)...");
  const plug = await wyze.getDevice("Office Salt Lamps");
  if (plug) {
    console.log("   Found plug:", plug.mac);
    console.log("   Turning OFF...");
    await wyze.plugOff(plug.mac, plug.product_model);
    console.log("   Waiting 2 seconds...");
    await sleep(2000);
    console.log("   Turning ON...");
    await wyze.plugOn(plug.mac, plug.product_model);
    console.log("   Done!\n");
  }

  // 4. Test switch (Bedroom Fan Switch)
  console.log("4. Testing switch control (Bedroom Fan Switch)...");
  const sw = await wyze.getDevice("Bedroom Fan Switch");
  if (sw) {
    console.log("   Found switch:", sw.mac);
    console.log("   Turning OFF...");
    await wyze.switchOff(sw.mac, sw.product_model);
    console.log("   Waiting 2 seconds...");
    await sleep(2000);
    console.log("   Turning ON...");
    await wyze.switchOn(sw.mac, sw.product_model);
    console.log("   Done!\n");
  }

  // 5. Test thermostat
  console.log("5. Getting thermostat data (Living Room)...");
  const thermo = await wyze.getDevice("Living Room");
  if (thermo && thermo.product_type === "Thermostat") {
    console.log("   Found thermostat:", thermo.mac);
    const data = await wyze.getThermostat(thermo.mac);
    console.log("   Current temp:", data.temperature + "°" + data.tempUnit);
    console.log("   Humidity:", data.humidity + "%");
    console.log("   Mode:", data.mode);
    console.log("   Heat setpoint:", data.heatSetpoint + "°");
    console.log("   Working state:", data.workingState);
    console.log("   Done!\n");
  }

  console.log("=== All tests passed! ===");
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

main().catch(console.error);
