/**
 * Worker Assurance Paramétrique (Mock).
 * CRON : vérification météo via OpenWeatherMap (free tier) et simulation payoutInsurance.
 */
import cron from "node-cron";
import { config } from "../config.js";

const OPENWEATHER_URL = "https://api.openweathermap.org/data/2.5/weather";

async function fetchWeather(city: string): Promise<{ temp?: number; condition?: string } | null> {
  const key = config.insurance.openWeatherApiKey;
  if (!key) {
    console.log("Insurance worker: OPENWEATHER_API_KEY not set, using mock data.");
    return { temp: 15, condition: "Clear" };
  }
  try {
    const url = `${OPENWEATHER_URL}?q=${encodeURIComponent(city)}&appid=${key}&units=metric`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as { main?: { temp?: number }; weather?: Array<{ main?: string }> };
    return {
      temp: data.main?.temp,
      condition: data.weather?.[0]?.main,
    };
  } catch (e) {
    console.error("OpenWeather fetch error:", e);
    return null;
  }
}

/**
 * Mock: si condition météo déclenche un critère (ex: temp < 0 ou temp > 40), on simule un payout.
 */
function payoutInsurance(_policyId: string, _amount: number, reason: string) {
  console.log(`[Insurance Mock] payoutInsurance called: ${reason}`);
  // En production : appeler le smart contract ou une API d'assurance.
}

async function runCheck() {
  const weather = await fetchWeather("London");
  if (!weather) return;
  const { temp = 15, condition } = weather;
  if (temp < 0) {
    payoutInsurance("mock-frost-1", 100, `Frost trigger: temp=${temp}°C`);
  } else if (temp > 40) {
    payoutInsurance("mock-heat-1", 100, `Heat trigger: temp=${temp}°C`);
  } else if (condition === "Rain" || condition === "Thunderstorm") {
    // Exemple : pluie extrême pourrait déclencher
    console.log(`[Insurance] Weather: ${condition}, temp=${temp}°C - no payout trigger.`);
  }
}

function main() {
  const schedule = config.insurance.cronSchedule;
  console.log(`Insurance worker started. Cron: ${schedule}`);
  cron.schedule(schedule, runCheck);
  runCheck(); // run once at startup
}

main();
