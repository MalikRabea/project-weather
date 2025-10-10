import "./App.css";
import { useEffect, useState, useRef } from "react";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import axios from "axios";
import moment from "moment";
import "moment/min/locales";
import { useTranslation } from "react-i18next";
import {
  WiHumidity,
  WiBarometer,
  WiStrongWind,
  WiSunrise,
  WiSunset,
  WiDaySunny,
  WiCloud,
  WiRain,
  WiSnow,
  WiNightClear,
} from "react-icons/wi";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);
moment.locale("ar");

const theme = createTheme({ typography: { fontFamily: ["IBM"] } });

let cancelAxios = null;

export default function App() {
  const { t, i18n } = useTranslation(); // if you don't use i18n just ignore translation calls
  const [locale, setLocale] = useState("ar");
  const [city, setCity] = useState("Riyadh");
  const [units, setUnits] = useState("metric");
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [background, setBackground] = useState("clear");
  const [searchHistory, setSearchHistory] = useState([]);
  const [themeMode, setThemeMode] = useState("dark");
  const [loading, setLoading] = useState(false);
  const [dateAndTime, setDateAndTime] = useState(moment().format("MMMM Do YYYY, h:mm:ss a"));
  const appRef = useRef(null);

  const API_KEY = "a3cb339e3a575a38cd92c9699464cde1"; // احتفظ بالمفتاح أو غيّره

  // toggle اللغة
  const handleLanguageClick = () => {
    if (locale === "en") {
      setLocale("ar");
      i18n.changeLanguage?.("ar");
      moment.locale("ar");
    } else {
      setLocale("en");
      i18n.changeLanguage?.("en");
      moment.locale("en");
    }
    setDateAndTime(moment().format("MMMM Do YYYY, h:mm:ss a"));
  };

  const handleUnitsToggle = () => setUnits((u) => (u === "metric" ? "imperial" : "metric"));
  const handleThemeToggle = () => setThemeMode((m) => (m === "dark" ? "light" : "dark"));

  // جلب الطقس الحالي
  const fetchWeather = async (cityName) => {
    setLoading(true);
    if (cancelAxios) cancelAxios();
    try {
      const res = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(cityName)}&appid=${API_KEY}&units=${units}`,
        { cancelToken: new axios.CancelToken((c) => (cancelAxios = c)) }
      );
      setWeather(res.data);
      const main = res.data.weather[0].main.toLowerCase();
      const hour = new Date().getHours();
      // نهار/ليل distinction
      if (main === "clear" && (hour < 6 || hour >= 18)) setBackground("night");
      else setBackground(main === "mist" ? "clouds" : main);
      setSearchHistory((prev) => [cityName, ...prev.filter((c) => c !== cityName)].slice(0, 6));
    } catch (err) {
      console.error(err);
      // بسيطة: لو صار خطأ خلي weather = null
      setWeather(null);
    } finally {
      setLoading(false);
    }
  };

  // جلب فوركاست 3 أيام
  const fetchForecast = async (cityName) => {
    try {
      const res = await axios.get(
        `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(cityName)}&appid=${API_KEY}&units=${units}`
      );
      const daily = [];
      const today = new Date().getDate();
      res.data.list.forEach((item) => {
        const date = new Date(item.dt_txt).getDate();
        if (date > today && !daily.find((d) => d.date === date)) {
          daily.push({
            date,
            temp_min: Math.round(item.main.temp_min),
            temp_max: Math.round(item.main.temp_max),
            icon: item.weather[0].main.toLowerCase(),
            description: item.weather[0].description,
          });
        }
      });
      setForecast(daily.slice(0, 3));
    } catch (err) {
      console.error(err);
      setForecast([]);
    }
  };

  const handleSearch = () => {
    if (!city) return;
    setDateAndTime(moment().format("MMMM Do YYYY, h:mm:ss a"));
    fetchWeather(city);
    fetchForecast(city);
  };

  // إعادة جلب عند تغيير الوحدات
  useEffect(() => {
    handleSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [units]);

  // chart data
  const chartData = {
    labels: forecast.map((f, i) => moment().add(i + 1, "days").format(locale === "ar" ? "ddd" : "ddd")),
    datasets: [
      {
        label: units === "metric" ? "Temp °C" : "Temp °F",
        data: forecast.map((f) => f.temp_max),
        borderColor: themeMode === "dark" ? "#00bfff" : "#0052d0",
        backgroundColor: "rgba(0,191,255,0.18)",
        tension: 0.35,
        pointRadius: 3,
      },
    ],
  };

  // parallax mouse handler — يحدّث CSS vars على العنصر الرئيسي
  useEffect(() => {
    const el = appRef.current;
    if (!el) return;
    const handleMove = (e) => {
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5; // -0.5 .. 0.5
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      el.style.setProperty("--mx", String(x));
      el.style.setProperty("--my", String(y));
    };
    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, []);

  return (
    <div
      ref={appRef}
      className={`App ${themeMode}`}
      data-bg={background}
      style={{ touchAction: "none" }} // prevent small scroll on some devices
    >
      {/* Animated background shapes (rendered conditionally) */}
      {background === "clouds" && <div className="cloud cloud-1" aria-hidden />}
      {background === "clouds" && <div className="cloud cloud-2" aria-hidden />}
      {background === "rain" &&
        Array.from({ length: 40 }).map((_, i) => (
          <div
            key={i}
            className="rain-drop"
            style={{
              left: `${Math.random() * 100}%`,
              animationDuration: `${0.7 + Math.random() * 0.8}s`,
              opacity: 0.4 + Math.random() * 0.6,
            }}
            aria-hidden
          />
        ))}
      {background === "snow" &&
        Array.from({ length: 35 }).map((_, i) => (
          <div
            key={i}
            className="snowflake"
            style={{
              left: `${Math.random() * 100}%`,
              animationDuration: `${4 + Math.random() * 5}s`,
              opacity: 0.6 + Math.random() * 0.4,
              transform: `scale(${0.7 + Math.random() * 1.2})`,
            }}
            aria-hidden
          />
        ))}
      {background === "thunderstorm" && <div className="lightning" aria-hidden />}

      <ThemeProvider theme={theme}>
        <Container className="container-root" maxWidth={false}>
          <div className="main-container" dir={locale === "ar" ? "rtl" : "ltr"}>
            {/* header area + controls */}
            <header className="top-controls">
              <div className="brand">
                <div className="logo">☁️</div>
                <div className="brand-text">
                  <h1>WeatherX</h1>
                  <p className="sub">Pro Weather Interface</p>
                </div>
              </div>

              <div className="controls">
                <div className="search-inline">
                  <TextField
                    label={t("Enter city") ?? "Enter city"}
                    variant="outlined"
                    size="small"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                  <Button variant="contained" onClick={handleSearch}>
                    {t("Search") ?? "Search"}
                  </Button>
                </div>

                <div className="toggles">
                  <Button variant="outlined" onClick={handleUnitsToggle}>
                    {units === "metric" ? "°F" : "°C"}
                  </Button>
                  <Button variant="outlined" onClick={handleThemeToggle}>
                    {themeMode === "dark" ? t("Light Mode") ?? "Light" : t("Dark Mode") ?? "Dark"}
                  </Button>
                  <Button variant="text" onClick={handleLanguageClick}>
                    {locale === "en" ? "AR" : "EN"}
                  </Button>
                </div>
              </div>
            </header>

            {/* center area fills screen - no scroll */}
            <main className="center-stage" role="main">
              {/* left big card — current weather */}
              <section className="weather-card card-current" aria-live="polite">
                {loading && <div className="loader">⟳</div>}

                {!weather && !loading && (
                  <div className="empty-state">
                    <h2>No data</h2>
                    <p>Try searching a valid city name</p>
                  </div>
                )}

                {weather && (
                  <>
                    <div className="current-top">
                      <div className="temp-block">
                        <Typography variant="h1" className="temp-large">
                          {Math.round(weather.main.temp)}°
                          <span className="unit">{units === "metric" ? "C" : "F"}</span>
                        </Typography>
                        <img
                          className="weather-sprite"
                          src={`https://openweathermap.org/img/wn/${weather.weather[0].icon}@4x.png`}
                          alt={weather.weather[0].description}
                        />
                      </div>

                      <div className="meta-block">
                        <h2 className="city">{weather.name}</h2>
                        <p className="date">{dateAndTime}</p>
                        <p className="desc">{weather.weather[0].description}</p>

                        <div className="badges">
                          <span className="badge">Feels {Math.round(weather.main.feels_like)}°</span>
                          <span className="badge">Min {Math.round(weather.main.temp_min)}°</span>
                          <span className="badge">Max {Math.round(weather.main.temp_max)}°</span>
                        </div>
                      </div>
                    </div>

                    <div className="details-grid">
                      <div className="detail">
                        <WiHumidity size={26} />
                        <div>
                          <div className="label">Humidity</div>
                          <div className="value">{weather.main.humidity}%</div>
                        </div>
                      </div>
                      <div className="detail">
                        <WiBarometer size={26} />
                        <div>
                          <div className="label">Pressure</div>
                          <div className="value">{weather.main.pressure} hPa</div>
                        </div>
                      </div>
                      <div className="detail">
                        <WiStrongWind size={26} />
                        <div>
                          <div className="label">Wind</div>
                          <div className="value">{weather.wind.speed} m/s</div>
                        </div>
                      </div>
                      <div className="detail">
                        <WiSunrise size={26} />
                        <div>
                          <div className="label">Sunrise</div>
                          <div className="value">{new Date(weather.sys.sunrise * 1000).toLocaleTimeString()}</div>
                        </div>
                      </div>
                      <div className="detail">
                        <WiSunset size={26} />
                        <div>
                          <div className="label">Sunset</div>
                          <div className="value">{new Date(weather.sys.sunset * 1000).toLocaleTimeString()}</div>
                        </div>
                      </div>
                      <div className="detail">
                        <span className="ic">👁️</span>
                        <div>
                          <div className="label">Visibility</div>
                          <div className="value">{(weather.visibility / 1000).toFixed(1)} km</div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </section>

              {/* right column: forecast + chart + history */}
              <aside className="side-panel">
                <div className="favorites history">
                  <h3>Recent</h3>
                  <div className="chips">
                    {searchHistory.length === 0 && <span className="muted">No recent searches</span>}
                    {searchHistory.map((c) => (
                      <button
                        key={c}
                        className="chip"
                        onClick={() => {
                          setCity(c);
                          setTimeout(handleSearch, 50);
                        }}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="forecast-compact">
                  <h3>Next 3 days</h3>
                  <div className="forecast-list">
                    {forecast.length === 0 && <div className="muted">No forecast</div>}
                    {forecast.map((f, idx) => (
                      <div key={idx} className="forecast-item" title={f.description}>
                        <div className="icon">
                          {f.icon === "clear" ? (
                            <WiDaySunny />
                          ) : f.icon === "clouds" ? (
                            <WiCloud />
                          ) : f.icon === "rain" ? (
                            <WiRain />
                          ) : f.icon === "snow" ? (
                            <WiSnow />
                          ) : (
                            <WiNightClear />
                          )}
                        </div>
                        <div className="day">{moment().add(idx + 1, "days").format("ddd")}</div>
                        <div className="range">
                          {f.temp_min}° / {f.temp_max}°
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="forecast-chart small">
                  {forecast.length > 0 && <Line data={chartData} options={{ responsive: true, plugins: { legend: { display: false } } }} />}
                </div>
              </aside>
            </main>

            <footer className="app-footer">
              <small>Designed like a Senior Frontend — WeatherX • demo</small>
            </footer>
          </div>
        </Container>
      </ThemeProvider>
    </div>
  );
}
