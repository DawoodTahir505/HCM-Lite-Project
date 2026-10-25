/* ==========================================================================
   announcements.js - Admin posts, Employee reads
   hcm_announcements: [{ id, title, message, date, author }]
   ========================================================================== */

function renderAnnouncements(containerId, canManage) {
  const list = getAnnouncements().sort((a, b) => b.id - a.id).slice(0, 8);
  document.getElementById(containerId).innerHTML = list.length
    ? list.map(a => `<div class="announce">
        <div class="announce-head">
          <strong>${esc(a.title)}</strong>
          ${canManage ? `<button class="btn btn-ghost btn-sm" onclick="deleteAnnouncement(${a.id})">Delete</button>` : ""}
        </div>
        <p>${esc(a.message)}</p>
        <span class="muted small">${esc(a.author)} · ${formatDate(a.date)}</span>
      </div>`).join("")
    : '<div class="empty">No announcements yet.</div>';
}

function initAnnouncementForm() {
  document.getElementById("ann-form").addEventListener("submit", e => {
    e.preventDefault();
    const form = e.target;
    clearErrors(form);
    const title = document.getElementById("annTitle").value.trim();
    const message = document.getElementById("annMessage").value.trim();
    let ok = true;
    if (!title) { showFieldError("annTitle", "Title is required"); ok = false; }
    if (!message) { showFieldError("annMessage", "Message is required"); ok = false; }
    if (!ok) return;

    const list = getAnnouncements();
    list.push({ id: newId(), title, message, date: todayStr(), author: currentUser.name });
    setData(KEYS.announcements, list);
    form.reset();
    toast("Announcement posted");
    renderAnnouncements("ann-list", true);
  });
}

function deleteAnnouncement(id) {
  setData(KEYS.announcements, getAnnouncements().filter(a => a.id !== id));
  toast("Announcement deleted");
  renderAnnouncements("ann-list", true);
}
