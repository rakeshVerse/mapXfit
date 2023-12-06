"use strict";

import { LOCAL_STORAGE_KEY } from "./config.js";

class MapHandler {
  #map;
  #mapZoom = 13;
  #mapZoomWorld = 2.5; // zoom level to show entire world

  constructor() {}

  #getUserPosition() {
    // On success: load map for user's coords
    const success = (position) => {
      const { latitude, longitude } = position.coords;
      this.#loadMap(latitude, longitude, this.#mapZoom);
    };

    // On error: load world map
    const error = () => {
      this.#loadMap(0, 0, this.#mapZoomWorld);
      console.log(`Couldn't get your location!`);
    };

    /* If geolocation is available, get user's position*/
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(success, error);
    } else error();
  }

  #loadMap(lat, lng, zoom) {
    console.log(this);
    this.#map = L.map("map").setView([lat, lng], zoom);

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(this.#map);
  }

  get mapZoom() {
    return this.#mapZoom;
  }

  get mapZoomWorld() {
    return this.#mapZoomWorld;
  }

  get loadMap() {
    return this.#loadMap;
  }

  get getUserPosition() {
    return this.#getUserPosition;
  }
}

class LocalStorageHandler {
  #mapHandler;

  constructor(mapHandler) {
    this.#mapHandler = mapHandler;
  }

  /**
   * Check if local storage has an item named 'workouts'.
   * If yes, return true else false
   * @returns true | false
   */
  #isLocalStorage = () =>
    localStorage.getItem(LOCAL_STORAGE_KEY) ? true : false;

  /**
   * Handles what to be done When data exists in localStorage
   */
  #handleLocalStorage() {
    // Load default map
    this.#mapHandler.loadMap(0, 0, this.#mapHandler.mapZoomWorld);
  }

  get isLocalStorage() {
    return this.#isLocalStorage;
  }

  get handleLocalStorage() {
    return this.#handleLocalStorage;
  }
}

class App {
  #mapHandler;
  #localStorageHandler;

  constructor() {
    this.#mapHandler = new MapHandler();
    this.#localStorageHandler = new LocalStorageHandler(this.#mapHandler);
  }

  init() {
    // If data present in localStorage, handle it else get user's location
    this.#localStorageHandler.isLocalStorage()
      ? this.#localStorageHandler.handleLocalStorage()
      : this.#mapHandler.getUserPosition();
  }
}

const app = new App();
app.init();
