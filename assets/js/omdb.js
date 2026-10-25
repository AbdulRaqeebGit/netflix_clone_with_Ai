/*
 * Thin OMDb client used by the search box and the details modal.
 * The API key is intentionally client-side because this is a static demo.
 */
(function () {
  "use strict";

  const API_KEY = "6b5881ff";
  const BASE_URL = "https://www.omdbapi.com/";
  const cache = new Map();
  let status = "idle";
  let lastError = "";

  function cacheKey(params) {
    return Object.keys(params)
      .sort()
      .map(function (key) { return key + "=" + params[key]; })
      .join("&");
  }

  async function request(params, options) {
    const opts = options || {};
    const key = cacheKey(params);

    if (cache.has(key)) return cache.get(key);

    const url = new URL(BASE_URL);
    url.searchParams.set("apikey", API_KEY);
    Object.keys(params).forEach(function (name) {
      if (params[name] !== null && params[name] !== undefined && params[name] !== "") {
        url.searchParams.set(name, params[name]);
      }
    });

    try {
      const response = await fetch(url.toString(), {
        signal: opts.signal,
        cache: "no-store",
        headers: { Accept: "application/json" }
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (error) {
        throw new Error("OMDb returned an unreadable response.");
      }

      if (!response.ok || data.Response === "False") {
        const message = data && data.Error ? data.Error : "OMDb request failed (HTTP " + response.status + ").";
        const apiError = new Error(message);
        apiError.status = response.status;
        throw apiError;
      }

      status = "online";
      lastError = "";
      cache.set(key, data);
      return data;
    } catch (error) {
      if (error.name === "AbortError") throw error;
      status = "offline";
      lastError = error.message || "Unable to reach OMDb.";
      throw error;
    }
  }

  function parseYear(value) {
    const match = String(value || "").match(/\d{4}/);
    return match ? Number(match[0]) : null;
  }

  function normaliseSearchItem(item) {
    const type = item.Type === "series" ? "tv" : item.Type === "episode" ? "tv" : "movie";
    return {
      id: "omdb-" + item.imdbID,
      imdbID: item.imdbID,
      title: item.Title,
      type: type,
      year: parseYear(item.Year),
      yearLabel: item.Year,
      rating: null,
      maturity: "",
      runtime: "",
      seasons: "",
      genres: [],
      director: "",
      cast: [],
      description: "",
      tagline: "",
      poster: item.Poster && item.Poster !== "N/A" ? item.Poster : "",
      trailer: "",
      accent: "#8b1e24",
      isOmdbOnly: true
    };
  }

  function normaliseDetails(data) {
    return {
      id: "omdb-" + data.imdbID,
      imdbID: data.imdbID,
      title: data.Title,
      type: data.Type === "series" ? "tv" : "movie",
      year: parseYear(data.Year),
      yearLabel: data.Year,
      rating: data.imdbRating && data.imdbRating !== "N/A" ? Number(data.imdbRating) : null,
      maturity: data.Rated && data.Rated !== "N/A" ? data.Rated : "",
      runtime: data.Runtime && data.Runtime !== "N/A" ? data.Runtime : "",
      seasons: data.totalSeasons && data.totalSeasons !== "N/A" ? data.totalSeasons + " Seasons" : "",
      genres: data.Genre && data.Genre !== "N/A" ? data.Genre.split(",").map(function (g) { return g.trim(); }) : [],
      director: data.Director && data.Director !== "N/A" ? data.Director : "",
      cast: data.Actors && data.Actors !== "N/A" ? data.Actors.split(",").map(function (a) { return a.trim(); }) : [],
      description: data.Plot && data.Plot !== "N/A" ? data.Plot : "",
      tagline: "",
      poster: data.Poster && data.Poster !== "N/A" ? data.Poster : "",
      trailer: "",
      accent: "#8b1e24",
      isOmdbOnly: true,
      omdb: {
        rated: data.Rated,
        released: data.Released,
        writer: data.Writer,
        language: data.Language,
        country: data.Country,
        awards: data.Awards,
        boxOffice: data.BoxOffice,
        metascore: data.Metascore
      }
    };
  }

  async function search(query, options) {
    const trimmed = String(query || "").trim();
    if (trimmed.length < 2) return [];

    const data = await request({ s: trimmed }, options);
    const results = Array.isArray(data.Search) ? data.Search : [];
    return results
      .filter(function (item) { return item && item.imdbID && item.Type !== "episode"; })
      .map(normaliseSearchItem);
  }

  async function getById(imdbID, options) {
    if (!imdbID) throw new Error("Missing IMDb id.");
    const data = await request({ i: imdbID, plot: "full" }, options);
    return normaliseDetails(data);
  }

  window.OMDB = {
    API_KEY: API_KEY,
    search: search,
    getById: getById,
    getStatus: function () { return { status: status, lastError: lastError }; }
  };
})();
