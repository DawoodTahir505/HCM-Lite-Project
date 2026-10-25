/* ==========================================================================
   settings.js - company settings (Admin rules) + reset
   hcm_company: { name, startTime, graceMinutes, leaveQuota, workingDays[] }
   ========================================================================== */

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function initSettings() {
  const c = getCompany();
  document.getElementById("companyName").value = c.name;
  document.getElementById("startTime").value = c.startTime;
  document.getElementById("graceMinutes").value = c.graceMinutes;
  document.getElementById("leaveQuota").value = c.leaveQuota;
  document.getElementById("requireCamera").checked = !!c.requireCamera;
  document.getElementById("officeLat").value = c.officeLat == null ? "" : c.officeLat;
  document.getElementById("officeLng").value = c.officeLng == null ? "" : c.officeLng;
  document.getElementById("radiusM").value = c.radiusM || 200;
  document.getElementById("workingDays").innerHTML = DAY_NAMES.map((n, i) =>
    `<label class="check"><input type="checkbox" value="${i}" ${c.workingDays.includes(i) ? "checked" : ""}> ${n}</label>`).join("");
  document.getElementById("settings-form").addEventListener("submit", saveSettings);
}

function saveSettings(e) {
  e.preventDefault();
  const form = e.target;
  clearErrors(form);

  const name = document.getElementById("companyName").value.trim();
  const startTime = document.getElementById("startTime").value;
  const grace = document.getElementById("graceMinutes").value;
  const quota = document.getElementById("leaveQuota").value;
  const requireCamera = document.getElementById("requireCamera").checked;
  const latText = document.getElementById("officeLat").value.trim();
  const lngText = document.getElementById("officeLng").value.trim();
  const radius = document.getElementById("radiusM").value;
  const workingDays = [...document.querySelectorAll("#workingDays input:checked")].map(i => Number(i.value));

  let ok = true;
  if (!name) { showFieldError("companyName", "Company name is required"); ok = false; }
  if (!startTime) { showFieldError("startTime", "Select the office start time"); ok = false; }
  if (grace === "" || !Number.isInteger(Number(grace)) || Number(grace) < 0 || Number(grace) > 180) {
    showFieldError("graceMinutes", "Enter whole minutes between 0 and 180"); ok = false;
  }
  if (quota === "" || !Number.isInteger(Number(quota)) || Number(quota) < 0 || Number(quota) > 365) {
    showFieldError("leaveQuota", "Enter whole days between 0 and 365"); ok = false;
  }
  let lat = null, lng = null;
  if (latText !== "" || lngText !== "") {
    lat = Number(latText); lng = Number(lngText);
    if (latText === "" || isNaN(lat) || lat < -90 || lat > 90) { showFieldError("officeLat", "Latitude must be between -90 and 90"); ok = false; }
    if (lngText === "" || isNaN(lng) || lng < -180 || lng > 180) { showFieldError("officeLng", "Longitude must be between -180 and 180"); ok = false; }
  }
  if (!Number.isInteger(Number(radius)) || Number(radius) < 10 || Number(radius) > 5000) {
    showFieldError("radiusM", "Enter whole meters between 10 and 5000"); ok = false;
  }
  if (!workingDays.length) { document.getElementById("workingDays-error").textContent = "Select at least one working day"; ok = false; }
  if (!ok) return;

  setData(KEYS.company, {
    name, startTime, graceMinutes: Number(grace), leaveQuota: Number(quota), workingDays,
    requireCamera, officeLat: lat, officeLng: lng, radiusM: Number(radius)
  });
  toast(requireCamera && lat === null ? "Settings saved. Office location is not set, so only the face check is used." : "Settings saved");
  renderShell("settings");                    // company name appears in the sidebar
}

function resetAllData() {
  if (!confirm("This deletes the company, all employees, attendance and leaves from this browser. Continue?")) return;
  clearAllData();
  location.href = ROOT + "index.html";
}

// Fill the office location from this device's GPS (stand in the office and click)
function useMyLocation() {
  if (!navigator.geolocation) { toast("Location is not supported in this browser", "error"); return; }
  navigator.geolocation.getCurrentPosition(
    pos => {
      document.getElementById("officeLat").value = pos.coords.latitude.toFixed(6);
      document.getElementById("officeLng").value = pos.coords.longitude.toFixed(6);
      toast("Location filled in. Click Save settings.");
    },
    err => toast("Could not get location: " + err.message, "error"),
    { enableHighAccuracy: true, timeout: 10000 }
  );
}
