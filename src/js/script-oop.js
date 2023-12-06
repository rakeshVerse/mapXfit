"use strict";

import { LOCAL_STORAGE_KEY } from "./config.js";

const config = {
  1: {
    logo: `🏃🏾`,
    workout: `Running`,
    speedUnit: `MIN/KM`,
    popupClass: `running-popup`,
  },
  2: {
    logo: `🚴‍♀️`,
    workout: `Cycling`,
    speedUnit: `KM/H`,
    popupClass: `cycling-popup`,
  },
};

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
    this.#map = L.map("map").setView([lat, lng], zoom);

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(this.#map);
  }

  get map() {
    return this.#map;
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
  #workouts;
  #uiManager;

  constructor(mapHandler, workouts, uiManager) {
    this.#mapHandler = mapHandler;
    this.#workouts = workouts;
    this.#uiManager = uiManager;
  }

  /**
   * Check if local storage has an item named 'workouts'.
   * If yes, return true else false
   * @returns true | false
   */
  #isLocalStorage() {
    return localStorage.getItem(LOCAL_STORAGE_KEY) ? true : false;
  }

  /**
   * Handles what to be done when data exists in localStorage
   */
  #handleLocalStorage() {
    // Load world map
    this.#mapHandler.loadMap(0, 0, this.#mapHandler.mapZoomWorld);

    // Update appState with localStorage data
    this.#updateAppState();

    // When map is ready, render UI
    this.#mapHandler.map.whenReady(() =>
      this.#uiManager.renderUI(this.#workouts)
    );
  }

  #updateAppState() {
    const localWorkouts = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY));
    this.#workouts.push(...localWorkouts);
  }

  get isLocalStorage() {
    return this.#isLocalStorage;
  }

  get handleLocalStorage() {
    return this.#handleLocalStorage;
  }
}

class UIManager {
  #mapHandler;
  #containerWorkoutList;
  #formWorkout;
  #inputDistance;
  #intro;

  constructor(mapHandler) {
    this.#mapHandler = mapHandler;
    this.#containerWorkoutList = document.querySelector(".workout-list");
    this.#formWorkout = document.querySelector(".workout-form");
    this.#inputDistance = document.getElementById("distance");
    this.#intro = document.querySelector(".intro");
  }

  #showForm() {
    this.#formWorkout.classList.remove("hidden-form");

    // set focus on first input when the form appears
    setTimeout(() => {
      this.#inputDistance.focus();
    }, 600);
  }

  #hideForm() {
    this.#formWorkout.classList.add("hidden-form");
  }

  #hideIntro() {
    if (!this.#intro.classList.contains("hidden"))
      this.#intro.classList.add("hidden");
  }

  /**
   * Render single workout
   * @param {object} workout Workout object
   */
  #renderWorkoutListItem(workout) {
    const getWorkoutMeasureEl = (workout) => {
      let measure = "";

      switch (workout.type) {
        case 1:
          // Running
          measure = `
      <span class="workout-icon">👣</span>
      <span class="workout-value">${workout.cadence}</span>
      <span class="workout-unit">SPM</span>`;
          break;
        case 2:
          // Cycling
          measure = `
      <span class="workout-icon">⛰</span>
      <span class="workout-value">${workout.elevation}</span>
      <span class="workout-unit">M</span>`;
          break;
      }

      return measure;
    };

    let html = `
    <li class="workout workout-${workout.type}" 
      data-lat="${workout.coords.lat}" data-lng= "${workout.coords.lng}">
  
      <h2 class="workout-title">${workout.title}</h2>

      <div class="workout-details-box">
        <div class="workout-details">
          <span class="workout-icon">${config[workout.type].logo}</span>
          <span class="workout-value">${workout.distance}</span>
          <span class="workout-unit">KM</span>
        </div>

        <div class="workout-details">
          <span class="workout-icon">⏱</span>
          <span class="workout-value">${workout.duration}</span>
          <span class="workout-unit">MIN</span>
        </div>

        <div class="workout-details">
          <span class="workout-icon">⚡️</span>
          <span class="workout-value">${workout.speed}</span>
          <span class="workout-unit">${config[workout.type].speedUnit}</span>
        </div>

        <div class="workout-details">${getWorkoutMeasureEl(workout)}</div>
      </div>
    </li>`;

    this.#containerWorkoutList.insertAdjacentHTML("afterbegin", html);
  }

  #renderWorkoutMarkerAndPopup(workout) {
    // Marker
    const marker = L.marker(workout.coords).addTo(this.#mapHandler.map);

    // Popup
    const options = {
      maxWidth: "500",
      closeOnClick: false,
      autoClose: false,
      className: config[workout.type].popupClass,
    };

    const content = `${config[workout.type].logo} ${workout.title}`;
    marker.bindPopup(content, options).openPopup();
  }

  /**
   * Render all the workouts & their markers
   * @param {array} workouts Array of workout objects
   */
  #renderUI(workouts) {
    this.#hideIntro();

    workouts.forEach((workout) => {
      this.#renderWorkoutListItem(workout);
      this.#renderWorkoutMarkerAndPopup(workout);
    });

    // Fit all markers on the view port
    const markers = workouts.map((workout) => L.marker(workout.coords));
    this.#mapHandler.map.flyToBounds(L.featureGroup(markers).getBounds(), {
      padding: L.point(50, 50),
    });
  }

  get renderUI() {
    return this.#renderUI;
  }
}

class App {
  #mapHandler;
  #localStorageHandler;
  #uiManager;
  #workouts = [];

  constructor() {
    this.#mapHandler = new MapHandler();
    this.#uiManager = new UIManager(this.#mapHandler);
    this.#localStorageHandler = new LocalStorageHandler(
      this.#mapHandler,
      this.#workouts,
      this.#uiManager
    );
  }

  init() {
    // If data present in localStorage, handle it else get user's location
    this.#localStorageHandler.isLocalStorage()
      ? this.#localStorageHandler.handleLocalStorage()
      : this.#mapHandler.getUserPosition();

    console.log(this);
  }
}

const app = new App();
app.init();
