"use strict";

const elements = {
  containerWorkoutList: document.querySelector(".workout-list"),

  // Form
  formWorkout: document.querySelector(".workout-form"),
  formWorkoutErr: document.querySelector(".form-error"),
  intro: document.querySelector(".intro"),

  // Inputs
  inputDistance: document.getElementById("distance"),
  inputElevation: document.querySelector(".workout-elevation"),

  // Select
  typeSelect: document.querySelector("#workout-type"),
  typeInputBoxes: document.querySelectorAll(".type-toggle"),
  typeInputs: document.querySelectorAll(".type-toggle input"),
};

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

class App {
  #map;
  #mapZoom = 13;
  #mapZoomForWorld = 2.5; // zoom level to show entire world
  #mapEvent;
  #workouts = [];

  constructor() {
    // If data present in localStorage, handle it else get user's location
    this.#isLocalStorage()
      ? this.#localStorageHandler()
      : this.#getUserPosition();

    this.#toggleCadenceAndElevation();
    this.#clearInputs(elements.formWorkout);

    // Event Handlers
    // prettier-ignore
    elements.formWorkout.addEventListener('submit', this.#formSubmitCB.bind(this));
    elements.formWorkoutErr.addEventListener("click", this.#hideErr);
    // prettier-ignore
    elements.containerWorkoutList.addEventListener('click', this.#containerWorkoutCB.bind(this))
  }

  ///// MAP /////
  #getUserPosition() {
    // On success: load map for user's coords
    const success = (position) => {
      const { latitude, longitude } = position.coords;
      this.#loadMap(latitude, longitude, this.#mapZoom);
    };

    // On error: load world map
    const error = () => {
      this.#loadMap(0, 0, this.#mapZoomForWorld);
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

    // Register map click event
    this.#map.on("click", this.#onMapClick.bind(this));
  }

  #onMapClick(e) {
    this.#showForm();
    this.#hideIntro();
    this.#mapEvent = e; // store map event
  }

  ///// LOCAL STORAGE /////
  /**
   * Store workouts in localStorage
   */
  #storeWorkoutsLocally() {
    localStorage.setItem("workouts", JSON.stringify(this.#workouts));
  }

  /**
   * Check if local storage has an item named 'workouts'. If yes, return true else false
   * @returns true | false
   */
  #isLocalStorage = () => (localStorage.getItem("workouts") ? true : false);

  /**
   * Add localStorage data to appState
   */
  #updateAppState() {
    this.#workouts = JSON.parse(localStorage.getItem("workouts"));
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
    const markers = this.#workouts.map((workout) => L.marker(workout.coords));
    this.#map.flyToBounds(L.featureGroup(markers).getBounds(), {
      padding: L.point(50, 50),
    });
  }

  /**
   * Handles what to be done When data exists in localStorage
   */
  #localStorageHandler() {
    // Load default map
    this.#loadMap(0, 0, this.#mapZoomForWorld);

    // Update appState with localStorage data
    this.#updateAppState();

    // When map is ready, render UI
    this.#map.whenReady(() => this.#renderUI(this.#workouts));
  }

  ///// FORM /////
  #showForm() {
    elements.formWorkout.classList.remove("hidden-form");

    // set focus on first input when the form appears
    setTimeout(() => {
      elements.inputDistance.focus();
    }, 600);
  }

  #hideForm() {
    elements.formWorkout.classList.add("hidden-form");
  }

  #hideIntro() {
    if (!elements.intro.classList.contains("hidden"))
      elements.intro.classList.add("hidden");
  }

  #toggleCadenceAndElevation() {
    // initially set option to running & disable elevation input
    elements.typeSelect.value = 1;
    elements.inputElevation.disabled = true;

    // Show/Hide Cadence/Elevation
    const toggleUnitByType = () => {
      elements.typeInputBoxes.forEach((inputBox, i) => {
        // toggle hidden forEach inputBox
        inputBox.classList.toggle("hidden");

        // add/remove attribute 'disabled' to input
        // Note: disabled input will not be part of FormData()
        if (inputBox.classList.contains("hidden"))
          elements.typeInputs[i].disabled = true;
        else elements.typeInputs[i].disabled = false;

        elements.inputDistance.focus();
      });
    };

    // Event: On select change, show/Hide Cadence/Elevation
    elements.typeSelect.addEventListener("change", toggleUnitByType);
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
    const values = Object.values(inputs);

    for (const value of values) {
      if (value <= 0 || !isFinite(value)) return false;
    }

    return true;
  }

  /**
   * Clear all the input fields
   * @param {Object} form form element
   * @returns
   */
  #clearInputs(form) {
    form.querySelectorAll("input").forEach((input) => (input.value = ""));
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
    const formatDate = (date) =>
      `${date.toLocaleString("default", { month: "short", day: "2-digit" })}`;

    // Add properties to the workout object
    obj.coords = this.#mapEvent.latlng;
    obj.date = new Date().toISOString();
    obj.speed = calcSpeed(obj.type, obj.distance, obj.duration);
    obj.title = `${config[obj.type].workout} on ${formatDate(
      new Date(obj.date)
    )}`;
  }

  ///// RENDER UI /////
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

    elements.containerWorkoutList.insertAdjacentHTML("afterbegin", html);
  }

  #renderWorkoutMarkerAndPopup(workout) {
    // Marker
    const marker = L.marker(workout.coords).addTo(this.#map);

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

  ///// CALL BACKS /////
  #formSubmitCB(e) {
    e.preventDefault();

    // Get form data
    const formData = new FormData(elements.formWorkout);

    // Sanitize form data
    const workoutObj = this.#getSanitizedObj(formData);

    // Validate: if not valid show alert & return
    if (!this.#validateInputs(workoutObj)) {
      elements.formWorkoutErr.classList.remove("hidden-err");
      return;
    }

    // Remove error message, if already shown
    if (!elements.formWorkoutErr.classList.contains("hidden-err"))
      elements.formWorkoutErr.classList.add("hidden-err");

    // Clear form inputs
    this.#clearInputs(elements.formWorkout);

    // Hide form
    this.#hideForm();

    // Add additional info to workout object
    this.#addWorkoutInfo(workoutObj);

    // Render workout list item
    this.#renderWorkoutListItem(workoutObj);

    // Render marker & popup
    this.#renderWorkoutMarkerAndPopup(workoutObj);

    // Push workout object to app state
    this.#workouts.push(workoutObj);

    // Store workouts in localStorage
    this.#storeWorkoutsLocally();
  }

  #hideErr() {
    this.classList.add("hidden-err"); // hide form error
  }

  #containerWorkoutCB(e) {
    const workout = e.target.closest(".workout");
    if (!workout) return;

    // pan
    this.#map.flyTo([workout.dataset.lat, workout.dataset.lng], this.#mapZoom);
  }
}

const app = new App();
// console.log(app);
