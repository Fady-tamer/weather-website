const weatherDescriptions = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Foggy",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  71: "Slight snowfall",
  73: "Moderate snowfall",
  75: "Heavy snowfall",
  80: "Slight showers",
  81: "Moderate showers",
  82: "Violent showers",
  95: "Thunderstorm",
};

const defaultLat = 30.0444;
const defaultLon = 31.2357;

const locationElem = document.querySelector("#location");
const timezoneBadge = document.querySelector("#timezoneBadge");
const locationInput = document.querySelector("#locationInput");
const suggestionsList = document.querySelector("#suggestionsList");
const currentTemp = document.querySelector("#temp");
const weatherStatus = document.querySelector("#status");
const maxTemp = document.querySelector("#max-temp");
const minTemp = document.querySelector("#min-temp");

const apparentTemp = document.querySelector("#apparentTemp");
const humidity = document.querySelector("#humidity");
const windSpeed = document.querySelector("#windSpeed");
const rainAmount = document.querySelector("#rainAmount");
const dailyContainer = document.querySelector("#dailyForecast");

const fetchWeather = async (lat, lon, customName = null) => {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset&hourly=temperature_2m&current=temperature_2m,weather_code,rain,wind_speed_10m,is_day,relative_humidity_2m,apparent_temperature&timezone=auto`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Weather request failed");
    const data = await res.json();
    setWeatherData(data, customName);
  } catch (err) {
    console.error("Failed to fetch weather data:", err);
    weatherStatus.textContent = "Unable to load weather";
  }
};

const setWeatherData = (data, customName = null) => {
  const city = customName || data.timezone.split("/").pop().replace(/_/g, " ");

  locationElem.textContent = city;
  timezoneBadge.textContent = data.timezone;
  locationInput.placeholder = `Currently viewing: ${city}`;

  currentTemp.textContent = Math.round(data.current.temperature_2m);
  weatherStatus.textContent =
    weatherDescriptions[data.current.weather_code] || "Clear";
  maxTemp.textContent = `${Math.round(data.daily.temperature_2m_max[0])}°`;
  minTemp.textContent = `${Math.round(data.daily.temperature_2m_min[0])}°`;

  apparentTemp.textContent = `${Math.round(data.current.apparent_temperature)}°C`;
  humidity.textContent = `${data.current.relative_humidity_2m}%`;
  windSpeed.textContent = `${data.current.wind_speed_10m} km/h`;
  rainAmount.textContent = `${data.current.rain} mm`;

  dailyContainer.innerHTML = "";
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  data.daily.time.forEach((dateStr, i) => {
    const dateObj = new Date(dateStr);
    const dayName = i === 0 ? "Today" : days[dateObj.getDay()];
    const hi = Math.round(data.daily.temperature_2m_max[i]);
    const lo = Math.round(data.daily.temperature_2m_min[i]);

    const dayCard = document.createElement("div");
    dayCard.className = "forecast-day";
    dayCard.innerHTML = `
      <span class="forecast-day-name">${dayName}</span>
      <span class="forecast-high">${hi}°</span>
      <span class="forecast-low">${lo}°</span>
    `;
    dailyContainer.appendChild(dayCard);
  });
};

let searchTimeout = null;

const searchLocations = async (query) => {
  if (!query || query.trim().length < 2) {
    suggestionsList.innerHTML = "";
    suggestionsList.hidden = true;
    return;
  }

  const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    query.trim(),
  )}&count=5&language=en&format=json`;

  try {
    const res = await fetch(geoUrl);
    const data = await res.json();

    suggestionsList.innerHTML = "";
    if (!data.results || data.results.length === 0) {
      suggestionsList.hidden = true;
      return;
    }

    data.results.forEach((place) => {
      const li = document.createElement("li");
      const label = [place.name, place.admin1, place.country]
        .filter(Boolean)
        .join(", ");
      li.textContent = label;

      li.addEventListener("click", () => {
        fetchWeather(place.latitude, place.longitude, place.name);
        locationInput.value = "";
        suggestionsList.innerHTML = "";
        suggestionsList.hidden = true;
      });

      suggestionsList.appendChild(li);
    });

    suggestionsList.hidden = false;
  } catch (err) {
    console.error("Geocoding lookup failed:", err);
  }
};

locationInput.addEventListener("input", (e) => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => searchLocations(e.target.value), 300);
});

document.addEventListener("click", (e) => {
  if (!e.target.closest(".search-box")) {
    suggestionsList.hidden = true;
  }
});

const geoOptions = {
  enableHighAccuracy: false,
  timeout: 3000,
  maximumAge: 60000,
};

if ("geolocation" in navigator) {
  navigator.geolocation.getCurrentPosition(
    (position) => {
      fetchWeather(position.coords.latitude, position.coords.longitude);
    },
    (error) => {
      console.warn("Geolocation fallback active:", error.message);
      fetchWeather(defaultLat, defaultLon);
    },
    geoOptions,
  );
} else {
  fetchWeather(defaultLat, defaultLon);
}
