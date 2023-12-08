'use strict';

import {
  LOCAL_STORAGE_KEY,
  MAP_ZOOM,
  MAP_ZOOM_WORLD,
  CONFIG,
  LIGHT_ICON,
  DARK_ICON,
} from './config.js';

class MapHandler {
  #map;
  #mapZoom;
  #mapZoomWorld; // zoom level to show entire world
  #mapEvent;
  #uiManager;
  #formHandler;

  constructor(mapZoom, mapZoomWorld) {
    this.#mapZoom = mapZoom;
    this.#mapZoomWorld = mapZoomWorld;
  }

  #init(uiManager, formHandler) {
    this.#uiManager = uiManager;
    this.#formHandler = formHandler;
  }

  #getUserPosition() {
    // On success: load map for user's coords
    const success = position => {
      const { latitude, longitude } = position.coords;
      this.#loadMap(latitude, longitude, this.#mapZoom);
    };

    // On error: load world map
    const error = () => {
      this.#loadMap(0, 0, this.#mapZoomWorld);
    };

    /* If geolocation is available, get user's position*/
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(success, error);
    } else error();
  }

  #loadMap(lat, lng, zoom) {
    this.#map = L.map('map').setView([lat, lng], zoom);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(this.#map);

    // Register map click event
    this.#map.on('click', this.#onMapClick.bind(this));
  }

  #onMapClick(e) {
    this.#formHandler.showForm();
    this.#uiManager.hideIntro();
    this.#mapEvent = e; // store map event
  }

  init(uiManager, formHandler) {
    this.#init(uiManager, formHandler);
  }

  // Public APIs
  get map() {
    return this.#map;
  }

  get mapZoom() {
    return this.#mapZoom;
  }

  get mapZoomWorld() {
    return this.#mapZoomWorld;
  }

  get mapEvent() {
    return this.#mapEvent;
  }

  loadMap(lat, lng, zoom) {
    this.#loadMap(lat, lng, zoom);
  }

  getUserPosition() {
    this.#getUserPosition();
  }
}

class LocalStorageHandler {
  #mapHandler;
  #workouts;
  #uiManager;
  #localWorkouts;
  #localStorageKey;

  constructor(workouts, localStorageKey, mapHandler, uiManager) {
    this.#workouts = workouts;
    this.#localStorageKey = localStorageKey;
    this.#mapHandler = mapHandler;
    this.#uiManager = uiManager;
  }

  /**
   * Store workouts in localStorage
   */
  #storeWorkoutsLocally() {
    localStorage.setItem(this.#localStorageKey, JSON.stringify(this.#workouts));
  }

  /**
   * Check if local storage has an item named 'workouts'.
   * If yes, return true else false
   * @returns true | false
   */
  #isLocalStorage() {
    this.#localWorkouts = localStorage.getItem(this.#localStorageKey);
    return !this.#localWorkouts ? false : true;
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
    // push all the workout objects inside localWorkouts[] into workouts[]
    this.#workouts.push(...JSON.parse(this.#localWorkouts));
  }

  // Public APIs
  storeWorkoutsLocally() {
    this.#storeWorkoutsLocally();
  }

  isLocalStorage() {
    return this.#isLocalStorage();
  }

  handleLocalStorage() {
    this.#handleLocalStorage();
  }
}

class FormHandler {
  #mapHandler;
  #uiManager;
  #localStorageHandler;
  #formWorkout;
  #formWorkoutErr;
  #inputElevation;
  #inputDistance;
  #typeInputs;
  #typeInputBoxes;
  #typeSelect;
  #btnFormClose;
  #workouts;
  #config;

  constructor(workouts, config, mapHandler, uiManager, localStorageHandler) {
    // Setting properties
    this.#workouts = workouts;
    this.#config = config;
    this.#mapHandler = mapHandler;
    this.#uiManager = uiManager;
    this.#localStorageHandler = localStorageHandler;

    // DOM Elements
    this.#formWorkout = document.querySelector('.workout-form');
    this.#formWorkoutErr = document.querySelector('.form-error');
    this.#btnFormClose = document.querySelector('.btn-form-close');
    this.#inputDistance = document.getElementById('distance');
    this.#inputElevation = document.querySelector('.workout-elevation');
    this.#typeInputs = document.querySelectorAll('.type-toggle input');
    this.#typeInputBoxes = document.querySelectorAll('.type-toggle');
    this.#typeSelect = document.getElementById('workout-type');

    // Initially set option to running, disable elevation input & clear all inputs
    this.#typeSelect.value = 1;
    this.#inputElevation.disabled = true;
    this.#clearInputs();

    // EVENT HANDLERS
    // On select change, show/Hide Cadence/Elevation
    // prettier-ignore
    this.#typeSelect.addEventListener('change', this.#toggleUnitByType.bind(this));
    // prettier-ignore
    this.#formWorkout.addEventListener('submit', this.#formSubmitCB.bind(this));
    // prettier-ignore
    this.#formWorkoutErr.addEventListener('click', this.#hideFormErr.bind(this));
    this.#btnFormClose.addEventListener('click', this.#hideForm.bind(this));
  }

  /**
   * Show/Hide Cadence/Elevation
   */
  #toggleUnitByType() {
    this.#typeInputBoxes.forEach((inputBox, i) => {
      // Toggle hidden forEach inputBox
      inputBox.classList.toggle('hidden');

      // Add/remove attribute 'disabled' to input
      // Note: disabled input will not be part of FormData()
      if (inputBox.classList.contains('hidden'))
        this.#typeInputs[i].disabled = true;
      else this.#typeInputs[i].disabled = false;

      this.#inputDistance.focus();
    });
  }

  #showForm() {
    this.#formWorkout.classList.remove('hidden-form');

    // set focus on first input when the form appears
    setTimeout(() => {
      this.#inputDistance.focus();
    }, 600);
  }

  #hideForm() {
    this.#formWorkout.classList.add('hidden-form');
    this.#clearInputs();
  }

  #hideFormErr() {
    if (!this.#formWorkoutErr.classList.contains('hidden-err'))
      this.#formWorkoutErr.classList.add('hidden-err');
  }

  /**
   * Sanitize inputs: trim, convert numeric sting to number
   * @param {object} formData formData
   * @returns Object contains sanitized inputs
   */
  #getSanitizedObj(formData) {
    const obj = {};
    for (const [key, value] of formData) {
      obj[key] = +value.trim();
    }

    return obj;
  }

  // All inputs must be positive numbers
  #validateInputs(inputs) {
    return Object.values(inputs).every(value => value > 0 && isFinite(value));
  }

  /**
   * Clear all the input fields
   * @param {Object} form form element
   * @returns
   */
  #clearInputs() {
    this.#formWorkout
      .querySelectorAll('input')
      .forEach(input => (input.value = ''));
  }

  /**
   * Add additional workout info to workout object: lat, lng, date & speed
   * @param {object} obj Workout object
   */
  #addWorkoutInfo(obj) {
    // Calculate speed
    const calcSpeed = (type, distance, time) => {
      if (type === 1) return (time / distance).toFixed(1);
      if (type === 2) return (distance / (time / 60)).toFixed(1);
    };

    // Format date: Short month followed by 2 digit date
    const formatDate = date =>
      `${date.toLocaleString('default', { month: 'short', day: '2-digit' })}`;

    // Add properties to the workout object
    obj.coords = this.#mapHandler.mapEvent.latlng;
    obj.date = new Date().toISOString();
    obj.speed = calcSpeed(obj.type, obj.distance, obj.duration);
    obj.title = `${this.#config[obj.type].workout} on ${formatDate(
      new Date(obj.date)
    )}`;
  }

  #formSubmitCB(e) {
    e.preventDefault();

    // Get form data
    const formData = new FormData(this.#formWorkout);

    // Sanitize form data
    const workoutObj = this.#getSanitizedObj(formData);

    // Validate: if not valid show err & return
    if (!this.#validateInputs(workoutObj)) {
      this.#formWorkoutErr.classList.remove('hidden-err');
      return;
    }

    // Remove error message, if already shown
    this.#hideFormErr();

    // Hide form
    this.#hideForm();

    // Add additional info to workout object
    this.#addWorkoutInfo(workoutObj);

    // Render workout list item
    this.#uiManager.renderWorkoutListItem(workoutObj);

    // Render marker & popup
    this.#uiManager.renderWorkoutMarkerAndPopup(workoutObj);

    // Push workout object to app state
    this.#workouts.push(workoutObj);

    // Store workouts in localStorage
    this.#localStorageHandler.storeWorkoutsLocally();
  }

  // Public APIs
  get formWorkout() {
    return this.#formWorkout;
  }

  showForm() {
    this.#showForm();
  }
}

class UIManager {
  #mapHandler;
  #formHandler;
  #containerWorkoutList;
  #intro;
  #appLogo;
  #btnTheme;
  #html;
  #theme = 'light';
  #workouts;
  #config;
  #lightIcon;
  #darkIcon;

  constructor(workouts, config, lightIcon, darkIcon, mapHandler) {
    // DOM elements
    this.#containerWorkoutList = document.querySelector('.workout-list');
    this.#intro = document.querySelector('.intro');
    this.#appLogo = document.querySelector('.app-logo-svg');
    this.#btnTheme = document.getElementById('btn-theme');
    this.#html = document.querySelector('html');

    // Setting attributes
    this.#workouts = workouts;
    this.#config = config;
    this.#lightIcon = lightIcon;
    this.#darkIcon = darkIcon;
    this.#mapHandler = mapHandler;

    // EVENT HANDLERS
    // prettier-ignore
    this.#containerWorkoutList.addEventListener('click', this.#containerWorkoutCB.bind(this))
    this.#appLogo.addEventListener('click', this.#showAllMarkers.bind(this));
    this.#btnTheme.addEventListener('click', this.#toggleTheme.bind(this));
  }

  #init(formHandler) {
    this.#formHandler = formHandler;
  }

  #hideIntro() {
    if (!this.#intro.classList.contains('hidden'))
      this.#intro.classList.add('hidden');
  }

  /**
   * Render single workout
   * @param {object} workout Workout object
   */
  #renderWorkoutListItem(workout) {
    const getWorkoutMeasureEl = workout => {
      const icon = workout.type === 1 ? '👣' : '⛰';
      const value = workout.type === 1 ? workout.cadence : workout.elevation;
      const unit = workout.type === 1 ? 'SPM' : 'M';

      return `
      <span class="workout-icon">${icon}</span>
      <span class="workout-value">${value}</span>
      <span class="workout-unit">${unit}</span>`;
    };

    let html = `
    <li class="workout workout-${workout.type}" 
      data-lat="${workout.coords.lat}" data-lng= "${workout.coords.lng}">
  
      <h2 class="workout-title">${workout.title}</h2>

      <div class="workout-details-box">
        <div class="workout-details">
          <span class="workout-icon">${this.#config[workout.type].logo}</span>
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
          <span class="workout-unit">${
            this.#config[workout.type].speedUnit
          }</span>
        </div>

        <div class="workout-details">${getWorkoutMeasureEl(workout)}</div>
      </div>
    </li>`;

    this.#formHandler.formWorkout.insertAdjacentHTML('afterend', html);
  }

  #renderWorkoutMarkerAndPopup(workout) {
    // Marker
    const marker = L.marker(workout.coords).addTo(this.#mapHandler.map);

    // Popup
    const options = {
      maxWidth: '500',
      closeOnClick: false,
      autoClose: false,
      className: this.#config[workout.type].popupClass,
    };

    const content = `${this.#config[workout.type].logo} ${workout.title}`;
    marker.bindPopup(content, options).openPopup();
  }

  /**
   * Render all the workouts & their markers
   * @param {array} workouts Array of workout objects
   */
  #renderUI(workouts) {
    this.#hideIntro();

    workouts.forEach(workout => {
      this.#renderWorkoutListItem(workout);
      this.#renderWorkoutMarkerAndPopup(workout);
    });

    // Fit all markers on the view port
    this.#showAllMarkers();
  }

  // Fit all markers on the view port
  #showAllMarkers() {
    const markers = this.#workouts.map(workout => L.marker(workout.coords));
    this.#mapHandler.map.flyToBounds(L.featureGroup(markers).getBounds(), {
      padding: L.point(50, 50),
    });
  }

  #containerWorkoutCB(e) {
    const workout = e.target.closest('.workout');
    if (!workout) return;

    // pan
    this.#mapHandler.map.flyTo(
      [workout.dataset.lat, workout.dataset.lng],
      this.#mapHandler.mapZoom
    );
  }

  #toggleTheme(e) {
    e.preventDefault();
    this.#theme = this.#theme === 'light' ? 'dark' : 'light';
    this.#btnTheme.textContent =
      this.#theme === 'light' ? this.#darkIcon : this.#lightIcon;
    this.#html.classList.toggle('dark', this.#theme === 'dark');
    this.#html.classList.toggle('light', this.#theme === 'light');
  }

  // Public APIs
  init(formHandler) {
    this.#init(formHandler);
  }

  renderWorkoutListItem(workout) {
    this.#renderWorkoutListItem(workout);
  }

  renderWorkoutMarkerAndPopup(workout) {
    this.#renderWorkoutMarkerAndPopup(workout);
  }

  renderUI(workouts) {
    this.#renderUI(workouts);
  }

  hideIntro() {
    this.#hideIntro();
  }
}

class App {
  #workouts = [];
  #mapHandler;
  #localStorageHandler;
  #uiManager;
  #formHandler;

  constructor() {
    this.#mapHandler = new MapHandler(MAP_ZOOM, MAP_ZOOM_WORLD);
    this.#uiManager = new UIManager(
      this.#workouts,
      CONFIG,
      LIGHT_ICON,
      DARK_ICON,
      this.#mapHandler
    );
    // prettier-ignore
    this.#localStorageHandler = new LocalStorageHandler(this.#workouts, LOCAL_STORAGE_KEY, this.#mapHandler, this.#uiManager);
    // prettier-ignore
    this.#formHandler = new FormHandler(this.#workouts, CONFIG, this.#mapHandler, this.#uiManager, this.#localStorageHandler);
    this.#mapHandler.init(this.#uiManager, this.#formHandler);
    this.#uiManager.init(this.#formHandler);
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
