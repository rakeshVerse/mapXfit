let map;
const appState = [];
let workoutPosition;
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

// Elements
const workoutContainer = document.querySelector('.workout-list');
const workoutForm = document.querySelector('.workout-form');
const workoutFormErr = document.querySelector('.form-error');
const inputDistance = document.getElementById('distance');
const introEl = document.querySelector('.intro');

/////////////////////////////// General /////////////////////////////
const showForm = () => {
  workoutForm.classList.remove('hidden-form');

  // set focus on first input
  setTimeout(() => {
    inputDistance.focus();
  }, 600);
};

const hideForm = () => {
  workoutForm.classList.add('hidden-form');
};

const hideIntro = () => {
  if (!introEl.classList.contains('hidden')) introEl.classList.add('hidden');
};

/////////////////////////// Toggle Candence/Elevation /////////////////
const toggleCadenceAndElevation = () => {
  const typeSelectEl = document.querySelector('#workout-type');
  const typeInputBoxes = document.querySelectorAll('.type-toggle');
  const typeInputs = document.querySelectorAll('.type-toggle input');
  const inputElevationEl = document.querySelector('.workout-elevation');

  // initially set option to running & disable elevation input
  typeSelectEl.value = 1;
  inputElevationEl.disabled = true;

  // Show/Hide Cadence/Elevation
  const toggleUnitByType = () => {
    typeInputBoxes.forEach((inputBox, i) => {
      // toggle hidden forEach inputBox
      inputBox.classList.toggle('hidden');

      // add/remove attribute 'disabled' to input
      // disabled input will not be part of FormData()
      if (inputBox.classList.contains('hidden')) typeInputs[i].disabled = true;
      else typeInputs[i].disabled = false;

      inputDistance.focus();
    });
  };

  // Event: On select change, show/Hide Cadence/Elevation
  typeSelectEl.addEventListener('change', toggleUnitByType);
};

/////////////////////////////////// Show Map ////////////////////////////

// LEAFLET: Load Map
const loadMap = (lat, lng, zoom) => {
  map = L.map('map').setView([lat, lng], zoom);

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);

  map.on('click', onMapClick);
};

// GEOLOACTION API: Get user's position
const getUserPosition = () => {
  // On success
  const success = position => {
    const { latitude, longitude } = position.coords;

    // load map for user's coords
    loadMap(latitude, longitude, 13);
  };

  // On error
  const error = () => {
    console.log(`Couldn't get your location!`);

    // load map: show entire world
    loadMap(0, 0, 2.5);
  };

  /* geolocation is available  or not*/
  if ('geolocation' in navigator) {
    // get user's position
    navigator.geolocation.getCurrentPosition(success, error);
  } else {
    error();
  }
};

////////////////////////// RENDER WORKOUTS AND MARKERS /////////////////////

// Get data as per workout type
const getWorkoutMeasureEl = workout => {
  let measure = '';

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

/**
 * Render single workout
 * @param {object} workout Workout object
 */
const renderWorkout = workout => {
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

  workoutContainer.insertAdjacentHTML('afterbegin', html);
};

const renderMarkerAndPopup = workout => {
  // Marker
  var marker = L.marker(workout.coords).addTo(map);

  // Popup
  var options = {
    maxWidth: '500',
    closeOnClick: false,
    autoClose: false,
    className: config[workout.type].popupClass,
  };

  const content = `${config[workout.type].logo} ${workout.title}`;
  marker.bindPopup(content, options).openPopup();
};

////////////////////////// LOCAL STORAGE /////////////////////

/**
 * Store workouts in localStorage
 */
const storeWorkoutsLocally = () =>
  localStorage.setItem('workouts', JSON.stringify(appState));

/**
 * Check if local storage has an item named 'workouts'. If yes, return true else false
 * @returns true | false
 */
const isLocalStorage = () => (localStorage.getItem('workouts') ? true : false);

/**
 * Add localStorage data to appState
 */
const updateAppState = () => {
  const localWorkouts = JSON.parse(localStorage.getItem('workouts'));

  localWorkouts.forEach(workout => appState.push(workout));
};

/**
 * Render all the workouts & their markers
 * @param {array} workouts Array of workout objects
 */
const renderUI = workouts => {
  hideIntro();

  workouts.forEach(workout => {
    renderWorkout(workout);
    renderMarkerAndPopup(workout);
  });

  // Fit all markers on the view port
  const markers = appState.map(workout => L.marker(workout.coords));
  map.flyToBounds(L.featureGroup(markers).getBounds(), {
    padding: L.point(50, 50),
  });
};

/**
 * Handles what to be done When data exists in localStorage
 */
const localStorageHandler = () => {
  // Load default map
  loadMap(0, 0, 2.5);

  // Update appState with localStorage data
  updateAppState();

  // When map is ready, render UI
  map.whenReady(() => renderUI(appState));
};

/////////////////////////////////// FORM SUBMIT ///////////////////////
/**
 * Sanitize inputs: trim, convert numeric sting to number
 * @param {object} inputs formData
 * @returns Object contains sanitized inputs
 */
const getSanitizedObj = inputs => {
  const obj = {};
  for (const [key, value] of inputs) {
    obj[key] = +value.trim();
  }

  return obj;
};

// All inputs must be positive numbers
const validateInputs = inputs => {
  const values = Object.values(inputs);

  for (const value of values) {
    if (value <= 0 || !isFinite(value)) return false;
  }

  return true;
};

// Clear all the input fields
const clearInputs = form =>
  form.querySelectorAll('input').forEach(input => (input.value = ''));

/**
 * Add additional workout info to workout object: lat, lng, date & speed
 * @param {object} obj Workout object
 */
const addWorkoutInfo = obj => {
  // Calculate speed
  const calcSpeed = (type, distance, time) => {
    if (type === 1) return (time / distance).toFixed(1);
    if (type === 2) return (distance / (time / 60)).toFixed(1);
  };

  // Format date: Short month followed by 2 digit date
  const formatDate = date =>
    `${date.toLocaleString('default', { month: 'short', day: '2-digit' })}`;

  // Add properties to the workout object
  obj.coords = workoutPosition;
  obj.date = new Date().toISOString();
  obj.speed = calcSpeed(obj.type, obj.distance, obj.duration);
  obj.title = `${config[obj.type].workout} on ${formatDate(
    new Date(obj.date)
  )}`;
};

/////////////////////////////// EVENTS ///////////////////////////////
// SUBMIT FORM - On enter
workoutForm.addEventListener('keyup', function (e) {
  // Key must be enter
  if (e.key !== 'Enter') return;

  // Get form data
  const formData = new FormData(this);

  // Sanitize form data
  const workoutObj = getSanitizedObj(formData);

  // Validate
  if (!validateInputs(workoutObj)) {
    // if not valid show alert & return
    workoutFormErr.classList.remove('hidden-err');
    return;
  }

  // Remove error message, if already shown
  if (!workoutFormErr.classList.contains('hidden-err'))
    workoutFormErr.classList.add('hidden-err');

  // Clear form inputs
  clearInputs(this);

  // Hide form
  hideForm();

  // Add additional info to workout object
  addWorkoutInfo(workoutObj);

  // Push workout object to app state
  appState.push(workoutObj);

  // Render workout
  renderWorkout(workoutObj);

  // Render marker & popup
  renderMarkerAndPopup(workoutObj);

  // Store workouts in localStorage
  storeWorkoutsLocally();
});

// HIDE FORM ERROR - on click
workoutFormErr.addEventListener('click', function () {
  this.classList.add('hidden-err');
});

// PAN MAP - on click on
const workoutList = document.querySelector('.workout-list');
workoutList.addEventListener('click', function (e) {
  const workout = e.target.closest('.workout');
  if (!workout) return;

  // pan
  map.flyTo([workout.dataset.lat, workout.dataset.lng], 13);
});

// Map click event
const onMapClick = e => {
  showForm();

  // store coords of clicked position
  workoutPosition = e.latlng;

  hideIntro();
};

//////////////////////////////// INIT //////////////////////////
const init = () => {
  isLocalStorage() ? localStorageHandler() : getUserPosition();
  toggleCadenceAndElevation();
  clearInputs(workoutForm);
};

init();
