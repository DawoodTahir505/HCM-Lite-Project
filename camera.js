/* ==========================================================================
   camera.js - face recognition attendance (bonus)

   1. REGISTER  - the employee registers their face once (3 samples are
                  averaged into 128 numbers and saved in hcm_users).
   2. CHECK IN / CHECK OUT - the camera opens, and attendance is marked
                  AUTOMATICALLY when:
                    a) the camera is on,
                    b) the face matches the logged-in employee's registered face,
                    c) the phone/laptop is inside the office radius
                       (skipped if the Admin has not set an office location).

   Uses face-api.js (Tiny Face Detector + 68-point landmarks + face recognition).
   Only the 128 numbers are stored. The camera image is never saved.
   Limits: a printed photo or a phone screen can fool it (no liveness check).
   Needs https or localhost (browsers block camera and GPS on plain http).
   ========================================================================== */

const FACE_LIB = "../vendor/face-api/face-api.js";
const FACE_MODELS = "../vendor/face-api/models";
const MATCH_LIMIT = 0.5;       // distance below this = same person (lower = stricter)
const HITS_NEEDED = 2;         // consecutive matching frames before marking
const ENROLL_SAMPLES = 3;      // samples averaged when registering

let cam = null;                // state of the open camera window
let faceLoading = null;        // promise, so the library loads only once

/* ---------- helpers ---------- */

// Distance in meters between two GPS points (haversine formula)
function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000, rad = x => (x * Math.PI) / 180;
  const dLat = rad(lat2 - lat1), dLng = rad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function formatDistance(m) {
  return m < 1000 ? Math.round(m) + " m" : (m / 1000).toFixed(1) + " km";
}

function loadFaceApi() {
  if (faceLoading) return faceLoading;
  faceLoading = new Promise((resolve, reject) => {
    const loadModels = () => {
      const nets = [faceapi.nets.tinyFaceDetector, faceapi.nets.faceLandmark68TinyNet, faceapi.nets.faceRecognitionNet];
      Promise.all(nets.map(n => (n.isLoaded ? Promise.resolve() : n.loadFromUri(FACE_MODELS)))).then(resolve, reject);
    };
    if (window.faceapi) { loadModels(); return; }
    const script = document.createElement("script");
    script.src = FACE_LIB;
    script.onload = loadModels;
    script.onerror = () => reject(new Error("Could not load the face files"));
    document.head.appendChild(script);
  });
  faceLoading.catch(() => { faceLoading = null; });   // allow "Try again"
  return faceLoading;
}

// state: "ok" | "fail" | "wait"
function setCamStatus(key, state, text) {
  const li = document.getElementById("cs-" + key);
  li.dataset.state = state;
  li.querySelector(".txt").textContent = text;
  document.getElementById("cam-view").classList.toggle("ok", !!(cam && cam.faceOk));
}

/* ---------- face card on the Employee dashboard ---------- */

function renderFaceCard() {
  const el = document.getElementById("face-card");
  if (!el) return;
  const registered = !!getUserById(currentUser.id).faceDescriptor;
  el.innerHTML = registered
    ? `<div class="row between"><div><strong>Face registered</strong><div class="muted small">Use “Check in with camera” to mark attendance with your face.</div></div><span class="badge present">Active</span></div>`
    : `<div class="row between"><div><strong>Register your face</strong><div class="muted small">Register once. After that the camera marks your check-in and check-out automatically.</div></div><button class="btn btn-primary" onclick="openFaceEnroll()">Register face</button></div>`;
}

/* ---------- open / close ---------- */

// Next action for today: "in", "out" or null (already done)
function nextAction() {
  const rec = getRecord(currentUser.id, todayStr());
  if (!rec) return "in";
  return rec.checkOut ? null : "out";
}

// Check in / out with the camera. Goes to registration first if there is no face saved.
function openCameraCheck() {
  if (!getUserById(currentUser.id).faceDescriptor) {
    toast("Register your face first", "error");
    openFaceEnroll();
    return;
  }
  const mode = nextAction();
  if (!mode) { toast("You already checked in and out today", "error"); return; }
  beginCamera(mode);
}

function openFaceEnroll() {
  if (getUserById(currentUser.id).faceDescriptor) {
    toast("Your face is already registered. Ask the Admin to reset it.", "error");
    return;
  }
  beginCamera("enroll");
}

function beginCamera(mode) {
  cam = { mode, stream: null, timer: null, camOk: false, locOk: false, faceOk: false, hits: 0, samples: [], distance: null, busy: false, done: false };
  const titles = { in: "Camera check-in", out: "Camera check-out", enroll: "Register your face" };
  document.getElementById("cam-title").textContent = titles[mode];
  document.getElementById("cam-note").textContent = mode === "enroll"
    ? "Look straight at the camera in good light. We take " + ENROLL_SAMPLES + " samples. Only numbers that describe your face are saved, not your photo."
    : "Look at the camera. Attendance is marked automatically when your face is recognized and you are inside the office area. Your image is not saved.";
  document.getElementById("cs-loc").hidden = mode === "enroll";
  openDialog(document.getElementById("cam-dialog"));
  startCameraChecks();
}

function closeCamera() {
  stopCamera();
  closeDialog(document.getElementById("cam-dialog"));
}

function stopCamera() {
  if (!cam) return;
  clearInterval(cam.timer);
  if (cam.stream) cam.stream.getTracks().forEach(t => t.stop());
  cam.stream = null;
  cam.timer = null;
}

/* ---------- the checks ---------- */

function startCameraChecks() {
  stopCamera();
  Object.assign(cam, { camOk: false, locOk: false, faceOk: false, hits: 0, samples: [], distance: null, busy: false, done: false });
  setCamStatus("cam", "wait", "Starting camera...");
  setCamStatus("loc", "wait", "Checking location...");
  setCamStatus("face", "wait", "Waiting for camera...");
  startCamera();
  if (cam.mode !== "enroll") startLocation();
}

async function startCamera() {
  const run = cam;
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    setCamStatus("cam", "fail", "Camera needs https or localhost");
    setCamStatus("face", "fail", "Face check unavailable");
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
    if (cam !== run || !document.getElementById("cam-dialog").open) { stream.getTracks().forEach(t => t.stop()); return; }
    cam.stream = stream;
    const video = document.getElementById("cam-video");
    video.srcObject = stream;
    try { await video.play(); } catch (e) { /* autoplay will start it */ }
    cam.camOk = true;
    setCamStatus("cam", "ok", "Camera is on");
  } catch (err) {
    const denied = err && (err.name === "NotAllowedError" || err.name === "SecurityError");
    setCamStatus("cam", "fail", denied ? "Camera permission denied. Allow it and try again" : "No camera found");
    setCamStatus("face", "fail", "Face check unavailable");
    return;
  }

  setCamStatus("face", "wait", "Loading face recognition (first time can take a few seconds)...");
  try {
    await loadFaceApi();
  } catch (err) {
    setCamStatus("face", "fail", err.message + ". Try again");
    return;
  }
  if (cam !== run) return;
  setCamStatus("face", "wait", "Look at the camera");
  cam.timer = setInterval(detectFace, 700);
}

async function detectFace() {
  if (!cam || cam.busy || !cam.camOk || cam.done) return;
  cam.busy = true;
  const run = cam;
  try {
    const video = document.getElementById("cam-video");
    const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 });
    const found = await faceapi.detectSingleFace(video, options).withFaceLandmarks(true).withFaceDescriptor();
    if (cam !== run || cam.done) return;
    if (!found) {
      cam.hits = 0;
      cam.faceOk = false;
      setCamStatus("face", "wait", "No face found. Look at the camera");
      return;
    }
    const descriptor = Array.from(found.descriptor);
    if (cam.mode === "enroll") handleEnrollSample(descriptor);
    else handleMatch(descriptor);
  } catch (e) {
    /* ignore a single failed frame */
  } finally {
    if (cam) cam.busy = false;
  }
}

// Check in / out: compare the live face with the registered one
function handleMatch(descriptor) {
  const user = getUserById(currentUser.id);
  const dist = faceapi.euclideanDistance(descriptor, user.faceDescriptor);
  if (dist < MATCH_LIMIT) {
    cam.hits++;
    cam.faceOk = true;
    setCamStatus("face", "ok", "Face recognized (" + Math.max(0, Math.round((1 - dist) * 100)) + "% match)");
    markIfReady();
  } else {
    cam.hits = 0;
    cam.faceOk = false;
    setCamStatus("face", "fail", "This face does not match " + user.name + "'s registered face");
  }
}

// Register: collect samples, make sure they are the same person, save the average
function handleEnrollSample(descriptor) {
  cam.faceOk = true;
  if (cam.samples.length && faceapi.euclideanDistance(descriptor, cam.samples[0]) > 0.4) {
    cam.samples = [];
    setCamStatus("face", "wait", "Hold still and look straight. Starting again...");
    return;
  }
  cam.samples.push(descriptor);
  setCamStatus("face", "ok", "Capturing " + cam.samples.length + " of " + ENROLL_SAMPLES + ". Keep looking at the camera");
  if (cam.samples.length < ENROLL_SAMPLES) return;

  cam.done = true;
  const average = descriptor.map((_, i) => cam.samples.reduce((sum, s) => sum + s[i], 0) / cam.samples.length);
  const users = getUsers();
  users.find(u => u.id === currentUser.id).faceDescriptor = average;
  setData(KEYS.users, users);
  closeCamera();
  toast("Face registered. You can now check in with the camera.");
  renderFaceCard();
}

function startLocation() {
  const run = cam;
  const c = getCompany();
  if (c.officeLat == null || c.officeLng == null) {
    cam.locOk = true;
    setCamStatus("loc", "ok", "Office location not set (check skipped)");
    return;
  }
  if (!navigator.geolocation) {
    setCamStatus("loc", "fail", "Location is not supported in this browser");
    return;
  }
  navigator.geolocation.getCurrentPosition(
    pos => {
      if (cam !== run) return;
      const m = distanceMeters(pos.coords.latitude, pos.coords.longitude, c.officeLat, c.officeLng);
      const radius = c.radiusM || 200;
      cam.distance = Math.round(m);
      cam.locOk = m <= radius;
      setCamStatus("loc", cam.locOk ? "ok" : "fail",
        cam.locOk ? "Inside office area (" + formatDistance(m) + " away)"
                  : "Outside office area (" + formatDistance(m) + " away, allowed " + formatDistance(radius) + ")");
      markIfReady();
    },
    err => {
      if (cam !== run) return;
      setCamStatus("loc", "fail", err.code === 1 ? "Location permission denied. Allow it and try again" : "Could not get location. Try again");
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
}

// Marks attendance by itself once camera + location + face are all OK
function markIfReady() {
  if (!cam || cam.done || cam.mode === "enroll") return;
  if (!(cam.camOk && cam.locOk && cam.hits >= HITS_NEEDED)) return;
  cam.done = true;
  const meta = { method: "face", distance: cam.distance };
  const mode = cam.mode;
  closeCamera();
  if (mode === "in") doCheckIn(meta);
  else doCheckOut(meta);
}
