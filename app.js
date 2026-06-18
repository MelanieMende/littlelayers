const form = document.querySelector("#layersForm");
const birthdateInput = document.querySelector("#birthdate");
const roomTempInput = document.querySelector("#roomTemp");
const roomTempOutput = document.querySelector("#roomTempOutput");
const locationInput = document.querySelector("#locationInput");
const locateButton = document.querySelector("#locateButton");
const autoWeatherButton = document.querySelector("#autoWeather");
const manualWeatherButton = document.querySelector("#manualWeather");
const autoWeatherFields = document.querySelector("#autoWeatherFields");
const manualWeatherFields = document.querySelector("#manualWeatherFields");
const outsideTempInput = document.querySelector("#outsideTemp");
const outsideTempOutput = document.querySelector("#outsideTempOutput");
const windRainInput = document.querySelector("#windRain");
const statusText = document.querySelector("#statusText");
const agePill = document.querySelector("#agePill");
const insideList = document.querySelector("#insideList");
const outsideList = document.querySelector("#outsideList");
const nightList = document.querySelector("#nightList");
const timelineSummary = document.querySelector("#timelineSummary");
const weatherTimelineList = document.querySelector("#weatherTimelineList");

const STORAGE_KEY = "littlelayers.settings";

const state = {
  weatherMode: "auto",
  weather: null,
  coords: null,
  locationName: "",
};

let locationTimer = null;

const defaultInside = [
  "Body oder Unterhemd als Basis.",
  "Leichte Hose oder Leggings.",
  "Eine zusätzliche Schicht bereitlegen, falls Hände oder Nacken kühl wirken.",
];

const defaultOutside = [
  "Standort erlauben oder Außentemperatur manuell setzen.",
  "Für Kinderwagen oder Trage eine Schicht weniger am Körper prüfen, wenn es sehr warm wird.",
];

const defaultNight = [
  "Schlafsack nach Raumtemperatur wählen.",
  "Keine Mütze im Bett.",
  "Nacken oder Brust nach dem Einschlafen prüfen.",
];

function saveSettings() {
  const payload = {
    birthdate: birthdateInput.value,
    roomTemp: roomTempInput.value,
    location: locationInput.value,
    outsideTemp: outsideTempInput.value,
    windRain: windRainInput.checked,
    weatherMode: state.weatherMode,
    coords: state.coords,
    locationName: state.locationName,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function loadSettings() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    renderRecommendations();
    return;
  }

  try {
    const payload = JSON.parse(saved);
    birthdateInput.value = payload.birthdate || "";
    roomTempInput.value = payload.roomTemp || "19";
    locationInput.value = payload.location || "";
    outsideTempInput.value = payload.outsideTemp || "18";
    windRainInput.checked = Boolean(payload.windRain);
    state.weatherMode = payload.weatherMode || "auto";
    state.coords = payload.coords || null;
    state.locationName = payload.locationName || "";
    setWeatherMode(state.weatherMode);
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }

  updateOutputs();
  renderRecommendations();
}

function updateOutputs() {
  roomTempOutput.textContent = `${formatNumber(roomTempInput.value)} °C`;
  outsideTempOutput.textContent = `${formatNumber(outsideTempInput.value)} °C`;
}

function formatNumber(value) {
  return Number(value).toLocaleString("de-DE", { maximumFractionDigits: 1 });
}

function setWeatherMode(mode) {
  state.weatherMode = mode;
  const isAuto = mode === "auto";
  autoWeatherButton.classList.toggle("active", isAuto);
  manualWeatherButton.classList.toggle("active", !isAuto);
  autoWeatherFields.classList.toggle("hidden", !isAuto);
  manualWeatherFields.classList.toggle("hidden", isAuto);
  saveSettings();
  renderRecommendations();
}

function getAgeMonths() {
  if (!birthdateInput.value) return null;
  const birthdate = new Date(`${birthdateInput.value}T12:00:00`);
  if (Number.isNaN(birthdate.getTime())) return null;

  const today = new Date();
  if (birthdate > today) return null;

  let months = (today.getFullYear() - birthdate.getFullYear()) * 12;
  months += today.getMonth() - birthdate.getMonth();
  if (today.getDate() < birthdate.getDate()) months -= 1;
  return Math.max(months, 0);
}

function ageLabel(months) {
  if (months === null) return "Alter offen";
  if (months < 1) return "Neugeboren";
  if (months < 24) return `${months} Monate`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return rest ? `${years} J. ${rest} M.` : `${years} Jahre`;
}

function ageGroup(months) {
  if (months === null || months < 3) return "newborn";
  if (months < 12) return "baby";
  if (months < 36) return "toddler";
  return "child";
}

function getWeather() {
  if (state.weatherMode === "manual") {
    return {
      temp: Number(outsideTempInput.value),
      windRain: windRainInput.checked,
      label: "manuell",
    };
  }
  return state.weather;
}

function indoorRecommendation(roomTemp, group) {
  if (!birthdateInput.value) return defaultInside;

  const warmerBase = group === "newborn" ? "Langarmbody" : "Body oder dünnes Langarmshirt";
  if (roomTemp >= 24) return ["Kurzarmbody oder dünnes T-Shirt.", "Leichte Shorts, dünne Hose oder nur Windel bei ruhigem Spiel.", "Direkte Sonne am Fenster vermeiden."];
  if (roomTemp >= 21) return ["Kurz- oder Langarmbody.", "Dünne Hose oder Leggings.", "Bei Babys im Liegen eine leichte zusätzliche Schicht griffbereit halten."];
  if (roomTemp >= 18) return [warmerBase, "Dünne Hose und Socken.", "Für Neugeborene eine weiche Strickjacke bereitlegen."];
  return ["Langarmbody plus dünner Pullover.", "Hose, Socken und bei Babys ggf. leichte Jacke.", "Regelmäßig prüfen, ob Nacken warm bleibt."];
}

function outsideRecommendation(weather, group) {
  if (!birthdateInput.value || !weather) return defaultOutside;

  const temp = weather.temp;
  const extra = weather.windRain ? "Wasser- oder windabweisende Außenschicht ergänzen." : "Schatten, Wind und Aktivität mitdenken.";
  const carrierNote = group === "newborn" || group === "baby" ? "In Trage oder Kinderwagen Wärmestau prüfen." : "Bei viel Bewegung eine Schicht zum Ausziehen einplanen.";

  if (temp >= 28) return ["Kurzarmbody oder T-Shirt.", "Leichte, helle Hose oder UV-Kleidung.", "Sonnenhut und Schatten; keine zusätzliche Decke.", carrierNote];
  if (temp >= 22) return ["Kurz- oder Langarmbody.", "Leichte Hose.", "Dünne Jacke für Schatten oder Wind.", carrierNote];
  if (temp >= 16) return ["Langarmbody oder Shirt.", "Hose, Socken und leichte Jacke.", extra, carrierNote];
  if (temp >= 8) return ["Langarmbody, Pullover und Hose.", "Gefütterte Jacke oder Overall.", "Mütze, warme Socken und ggf. Handschuhe.", extra];
  if (temp >= 0) return ["Warme Basisschicht plus Pullover.", "Winteroverall oder gefütterte Jacke mit warmer Hose.", "Mütze, Schal, Handschuhe und warme Schuhe.", "Pausen drinnen einplanen."];
  return ["Mehrere warme Schichten statt einer sehr dicken.", "Winteroverall, Mütze, Schal, Handschuhe und warme Schuhe.", "Draußen kurz halten und Haut vor Kälte schützen."];
}

function nightRecommendation(roomTemp, group) {
  if (!birthdateInput.value) return defaultNight;

  const newbornNote = group === "newborn" ? "Bei Neugeborenen besonders engmaschig prüfen, ob sie zu warm oder zu kühl sind." : "Nach etwa 20 Minuten Schlaf Nacken oder Brust prüfen.";
  if (roomTemp >= 24) return ["0.5 TOG Schlafsack oder sehr leichter Schlafsack.", "Kurzarmbody oder nur Windel, je nach Kind.", "Keine zusätzliche Decke.", newbornNote];
  if (roomTemp >= 21) return ["0.5 bis 1.0 TOG Schlafsack.", "Kurzarmbody oder dünner Langarmbody.", "Keine Mütze im Bett.", newbornNote];
  if (roomTemp >= 18) return ["1.0 bis 2.5 TOG Schlafsack.", "Langarmbody oder Schlafanzug.", "Socken nur, wenn Füße sehr kühl bleiben.", newbornNote];
  if (roomTemp >= 16) return ["2.5 TOG Schlafsack.", "Langarmbody plus Schlafanzug.", "Raum zugfrei halten.", newbornNote];
  return ["2.5 bis 3.5 TOG Schlafsack.", "Langarmbody, Schlafanzug und ggf. Socken.", "Raumtemperatur möglichst Richtung 16 bis 18 °C bringen.", newbornNote];
}

function renderList(element, items) {
  element.replaceChildren(...items.map((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    return li;
  }));
}

function renderRecommendations() {
  const months = getAgeMonths();
  const group = ageGroup(months);
  const roomTemp = Number(roomTempInput.value);
  const weather = getWeather();

  agePill.textContent = ageLabel(months);
  renderList(insideList, indoorRecommendation(roomTemp, group));
  renderList(outsideList, outsideRecommendation(weather, group));
  renderList(nightList, nightRecommendation(roomTemp, group));
  renderWeatherTimeline(weather);

  if (state.weatherMode === "auto" && weather) {
    const name = state.locationName || "aktueller Standort";
    const condition = weather.windRain ? " mit Wind/Regen" : "";
    statusText.textContent = `${name}: ${formatNumber(weather.temp)} °C${condition}.`;
  } else if (state.weatherMode === "auto") {
    statusText.textContent = "Für aktuelle Außentemperatur Standort erkennen.";
  } else {
    statusText.textContent = "Außentemperatur wird manuell verwendet.";
  }
}

async function fetchWeather(latitude, longitude) {
  const params = new URLSearchParams({
    latitude: latitude.toFixed(4),
    longitude: longitude.toFixed(4),
    current: "temperature_2m,precipitation,rain,showers,snowfall,wind_speed_10m",
    hourly: "temperature_2m,precipitation_probability,weather_code,wind_speed_10m",
    forecast_days: "2",
    timezone: "auto",
  });
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!response.ok) throw new Error("weather");

  const data = await response.json();
  const current = data.current || {};
  state.weather = {
    temp: Number(current.temperature_2m),
    windRain: Number(current.wind_speed_10m) >= 22 || Number(current.precipitation || current.rain || current.showers || current.snowfall) > 0,
    label: "automatisch",
    timeline: buildWeatherTimeline(data.hourly),
  };
}

function buildWeatherTimeline(hourly) {
  if (!hourly?.time?.length) return [];

  const now = new Date();
  const entries = hourly.time.map((time, index) => ({
    time: new Date(time),
    temp: Number(hourly.temperature_2m?.[index]),
    rainChance: Number(hourly.precipitation_probability?.[index] || 0),
    wind: Number(hourly.wind_speed_10m?.[index] || 0),
    code: Number(hourly.weather_code?.[index] || 0),
  })).filter((entry) => entry.time >= now && Number.isFinite(entry.temp));

  return entries.filter((_, index) => index % 3 === 0).slice(0, 6);
}

function weatherKind(code, rainChance, wind) {
  if (code >= 95) return "storm";
  if (code >= 71) return "snow";
  if (code >= 51 || rainChance >= 45) return "rain";
  if (wind >= 28) return "wind";
  if (code >= 45) return "cloud";
  if (code >= 2) return "cloud";
  return "sun";
}

function weatherDescription(code, rainChance, wind) {
  if (code >= 95) return "Gewitter";
  if (code >= 71) return "Schnee";
  if (code >= 61 || rainChance >= 55) return "Regen möglich";
  if (code >= 51 || rainChance >= 35) return "Niesel möglich";
  if (wind >= 28) return "Windig";
  if (code >= 45) return "Neblig";
  if (code >= 3) return "Bewölkt";
  if (code === 2) return "Teils bewölkt";
  return "Klar";
}

function renderWeatherTimeline(weather) {
  if (state.weatherMode !== "auto") {
    timelineSummary.textContent = "Manuelle Eingabe aktiv";
    weatherTimelineList.replaceChildren();
    return;
  }

  const timeline = weather?.timeline || [];
  if (!timeline.length) {
    timelineSummary.textContent = "Noch kein Wetter geladen";
    weatherTimelineList.replaceChildren();
    return;
  }

  const minTemp = Math.round(Math.min(...timeline.map((entry) => entry.temp)));
  const maxTemp = Math.round(Math.max(...timeline.map((entry) => entry.temp)));
  timelineSummary.textContent = `${minTemp} bis ${maxTemp} °C`;

  const chart = document.createElement("div");
  chart.className = "curve-chart";

  const width = 320;
  const height = 128;
  const padding = { top: 18, right: 14, bottom: 24, left: 18 };
  const temps = timeline.map((entry) => entry.temp);
  const low = Math.min(...temps);
  const high = Math.max(...temps);
  const range = Math.max(high - low, 1);
  const points = timeline.map((entry, index) => {
    const x = padding.left + (index / Math.max(timeline.length - 1, 1)) * (width - padding.left - padding.right);
    const y = padding.top + ((high - entry.temp) / range) * (height - padding.top - padding.bottom);
    return { ...entry, x, y };
  });
  const path = smoothPath(points);
  const areaPath = `${path} L ${points.at(-1).x.toFixed(1)} ${height - padding.bottom} L ${points[0].x.toFixed(1)} ${height - padding.bottom} Z`;

  chart.innerHTML = `
    <svg class="curve-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Temperaturkurve über den Tag">
      <defs>
        <linearGradient id="temperatureFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#e97f6b" stop-opacity="0.22"></stop>
          <stop offset="100%" stop-color="#e97f6b" stop-opacity="0.02"></stop>
        </linearGradient>
      </defs>
      <path class="curve-grid" d="M ${padding.left} ${height - padding.bottom} H ${width - padding.right}" fill="none"></path>
      <path class="curve-area" d="${areaPath}" fill="url(#temperatureFill)"></path>
      <path class="curve-line" d="${path}" fill="none"></path>
      ${points.map((point) => `
        <circle class="curve-dot" cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="4"></circle>
      `).join("")}
    </svg>
  `;

  const pointRow = document.createElement("div");
  pointRow.className = "curve-points";
  pointRow.replaceChildren(...points.map((point) => {
    const item = document.createElement("div");
    item.className = "curve-point-card";

    const icon = document.createElement("span");
    icon.className = `weather-icon weather-${weatherKind(point.code, point.rainChance, point.wind)}`;
    icon.setAttribute("aria-hidden", "true");

    const time = document.createElement("span");
    time.className = "curve-point-time";
    time.textContent = point.time.toLocaleTimeString("de-DE", { hour: "2-digit" });

    const temp = document.createElement("strong");
    temp.textContent = `${Math.round(point.temp)}°`;

    item.append(time, icon, temp);
    return item;
  }));

  const details = document.createElement("div");
  details.className = "curve-details";
  const wettest = points.reduce((winner, point) => point.rainChance > winner.rainChance ? point : winner, points[0]);
  const windiest = points.reduce((winner, point) => point.wind > winner.wind ? point : winner, points[0]);
  details.textContent = `${weatherDescription(wettest.code, wettest.rainChance, wettest.wind)} bis ${wettest.rainChance}% Regen · Wind bis ${Math.round(windiest.wind)} km/h`;

  chart.append(pointRow, details);
  weatherTimelineList.replaceChildren(chart);
}

function smoothPath(points) {
  if (points.length < 2) {
    const point = points[0];
    return `M ${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
  }

  return points.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x.toFixed(1)} ${point.y.toFixed(1)}`;

    const previous = points[index - 1];
    const controlDistance = (point.x - previous.x) * 0.42;
    const c1x = previous.x + controlDistance;
    const c1y = previous.y;
    const c2x = point.x - controlDistance;
    const c2y = point.y;
    return `${path} C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
  }, "");
}

async function reverseGeocode(latitude, longitude) {
  const placeFromBigDataCloud = await reverseGeocodeWithBigDataCloud(latitude, longitude);
  if (placeFromBigDataCloud) return placeFromBigDataCloud;

  return reverseGeocodeWithOpenMeteo(latitude, longitude);
}

async function reverseGeocodeWithBigDataCloud(latitude, longitude) {
  const params = new URLSearchParams({
    latitude: latitude.toFixed(4),
    longitude: longitude.toFixed(4),
    localityLanguage: "de",
  });
  const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?${params}`);
  if (!response.ok) return "";

  const data = await response.json();
  const city = data.city || data.locality || data.principalSubdivision;
  const region = data.principalSubdivision && data.principalSubdivision !== city ? data.principalSubdivision : "";
  return [city, region].filter(Boolean).join(", ");
}

async function reverseGeocodeWithOpenMeteo(latitude, longitude) {
  const params = new URLSearchParams({
    latitude: latitude.toFixed(4),
    longitude: longitude.toFixed(4),
    language: "de",
    format: "json",
  });
  const response = await fetch(`https://geocoding-api.open-meteo.com/v1/reverse?${params}`);
  if (!response.ok) return "";

  const data = await response.json();
  const place = data.results?.[0];
  return [place?.name, place?.admin1].filter(Boolean).join(", ");
}

function locateUser() {
  if (!navigator.geolocation) {
    statusText.textContent = "Dieser Browser unterstützt keine Standorterkennung.";
    return;
  }

  if (!window.isSecureContext) {
    statusText.textContent = "Automatische Standorterkennung braucht HTTPS. Gib bitte den Ort ein; LittleLayers lädt dann das Wetter automatisch.";
    locationInput.placeholder = "Ort eingeben, z. B. Berlin";
    locationInput.focus();
    if (locationInput.value.trim()) findWeatherForLocation(locationInput.value.trim());
    return;
  }

  statusText.textContent = "Standort wird ermittelt...";
  navigator.geolocation.getCurrentPosition(async (position) => {
    const { latitude, longitude } = position.coords;
    state.coords = { latitude, longitude };
    const fallbackLabel = "Aktueller Standort";
    locationInput.value = fallbackLabel;
    state.locationName = fallbackLabel;
    saveSettings();

    try {
      await fetchWeather(latitude, longitude);
      const placeName = await reverseGeocode(latitude, longitude);
      if (placeName) {
        state.locationName = placeName;
        locationInput.value = placeName;
      } else {
        state.locationName = fallbackLabel;
        locationInput.value = fallbackLabel;
      }
      saveSettings();
      renderRecommendations();
    } catch {
      statusText.textContent = "Wetter konnte nicht geladen werden. Manuelle Außentemperatur ist verfügbar.";
      setWeatherMode("manual");
    }
  }, () => {
    statusText.textContent = "Standortfreigabe wurde nicht erteilt. Du kannst die Werte manuell setzen.";
    setWeatherMode("manual");
  }, {
    enableHighAccuracy: false,
    maximumAge: 15 * 60 * 1000,
    timeout: 10000,
  });
}

function bindEvents() {
  form.addEventListener("input", () => {
    updateOutputs();
    saveSettings();
    renderRecommendations();
  });

  locationInput.addEventListener("input", () => {
    if (state.weatherMode !== "auto") return;
    clearTimeout(locationTimer);
    locationTimer = setTimeout(() => {
      findWeatherForLocation(locationInput.value.trim());
    }, 700);
  });

  locateButton.addEventListener("click", () => {
    setWeatherMode("auto");
    locateUser();
  });

  autoWeatherButton.addEventListener("click", () => {
    setWeatherMode("auto");
    if (!state.weather) locateUser();
  });

  manualWeatherButton.addEventListener("click", () => {
    setWeatherMode("manual");
  });
}

async function findWeatherForLocation(query) {
  if (query.length < 2) return;

  statusText.textContent = "Wetter fuer Standort wird geladen...";
  try {
    const params = new URLSearchParams({
      name: query,
      count: "1",
      language: "de",
      format: "json",
    });
    const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params}`);
    if (!response.ok) throw new Error("geocoding");

    const data = await response.json();
    const place = data.results?.[0];
    if (!place) {
      statusText.textContent = "Ort nicht gefunden. Bitte genauer eingeben oder manuell wechseln.";
      return;
    }

    state.coords = { latitude: place.latitude, longitude: place.longitude };
    state.locationName = [place.name, place.admin1].filter(Boolean).join(", ");
    await fetchWeather(place.latitude, place.longitude);
    saveSettings();
    renderRecommendations();
  } catch {
    statusText.textContent = "Wetter konnte nicht geladen werden. Manuelle Außentemperatur ist verfügbar.";
  }
}

bindEvents();
loadSettings();

if (state.weatherMode === "auto" && locationInput.value.trim() && !state.weather) {
  window.setTimeout(() => findWeatherForLocation(locationInput.value.trim()), 250);
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

function isLocalDevHost() {
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1" || host.startsWith("192.168.") || host.startsWith("10.") || /^172\.(1[6-9]|2\d|3[0-1])\./.test(host);
}

function hashText(text) {
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) - hash + text.charCodeAt(index)) | 0;
  }
  return String(hash);
}

async function readDevSnapshot() {
  const files = ["index.html", "styles.css", "app.js", "sw.js"];
  const contents = await Promise.all(files.map(async (file) => {
    const response = await fetch(`./${file}?dev=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(file);
    return response.text();
  }));

  return hashText(contents.join("\n---littlelayers-file---\n"));
}

function startLocalAutoRefresh() {
  if (!isLocalDevHost()) return;

  let currentSnapshot = "";
  readDevSnapshot().then((snapshot) => {
    currentSnapshot = snapshot;
  }).catch(() => {});

  window.setInterval(async () => {
    try {
      const nextSnapshot = await readDevSnapshot();
      if (currentSnapshot && nextSnapshot !== currentSnapshot) {
        const registration = await navigator.serviceWorker?.getRegistration?.();
        await registration?.update?.();
        window.location.reload();
      }
      currentSnapshot = nextSnapshot;
    } catch {
      // Keep polling; edits can briefly race with the static server.
    }
  }, 2000);
}

startLocalAutoRefresh();
