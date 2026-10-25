/* ==========================================================================
   employees.js - add (creates login), edit, delete, search, department filter
   User: { id, name, email, password, role, department, salary, joinDate }
   ========================================================================== */

const empDialog = document.getElementById("emp-dialog");
const empForm = document.getElementById("emp-form");

function initEmployees() {
  document.getElementById("search").addEventListener("input", renderEmployees);
  document.getElementById("filter-dept").addEventListener("change", renderEmployees);
  empForm.addEventListener("submit", saveEmployee);
  refreshEmployees();
}

function refreshEmployees() {
  // department filter + suggestions for the form
  const depts = [...new Set(getEmployees().map(e => e.department))].sort();
  const sel = document.getElementById("filter-dept");
  const current = sel.value;
  sel.innerHTML = '<option value="">All departments</option>' + depts.map(d => `<option value="${esc(d)}">${esc(d)}</option>`).join("");
  sel.value = depts.includes(current) ? current : "";
  document.getElementById("dept-list").innerHTML = depts.map(d => `<option value="${esc(d)}"></option>`).join("");

  // summary cards
  const emps = getEmployees();
  document.getElementById("es-total").textContent = emps.length;
  document.getElementById("es-depts").textContent = depts.length;
  document.getElementById("es-payroll").textContent = formatMoney(emps.reduce((t, e) => t + Number(e.salary), 0));

  renderEmployees();
}

function renderEmployees() {
  const q = document.getElementById("search").value.trim().toLowerCase();
  const dept = document.getElementById("filter-dept").value;
  const list = getEmployees().filter(e =>
    (!q || e.name.toLowerCase().includes(q) || e.email.toLowerCase().includes(q)) &&
    (!dept || e.department === dept)
  );
  document.getElementById("emp-body").innerHTML = list.length
    ? list.map(e => `<tr>
        <td><div class="person"><div class="avatar sm">${esc(initials(e.name))}</div><div><strong>${esc(e.name)}</strong><span>${esc(e.email)}</span></div></div></td>
        <td>${esc(e.department)}</td>
        <td class="nowrap">${formatMoney(e.salary)}</td>
        <td class="nowrap">${e.joinDate ? formatDate(e.joinDate) : "-"}</td>
        <td>${e.faceDescriptor ? '<span class="badge present">Registered</span>' : '<span class="badge idle">Not registered</span>'}</td>
        <td><div class="actions">
          <button class="btn btn-outline btn-sm" onclick="openEmployeeForm(${e.id})">Edit</button>
          <a class="btn btn-outline btn-sm" href="payslip.html?user=${e.id}">Payslip</a>
          ${e.faceDescriptor ? `<button class="btn btn-outline btn-sm" onclick="resetFace(${e.id})">Reset face</button>` : ""}
          <button class="btn btn-ghost btn-sm" style="color:var(--danger)" onclick="deleteEmployee(${e.id})">Delete</button>
        </div></td>
      </tr>`).join("")
    : '<tr><td colspan="6" class="empty">' + (getEmployees().length ? "No employees match your search." : "No employees yet. Click “Add employee” to create the first one.") + '</td></tr>';
}

function openEmployeeForm(id) {
  clearErrors(empForm);
  empForm.reset();
  document.getElementById("empId").value = id || "";
  document.getElementById("emp-title").textContent = id ? "Edit employee" : "Add employee";
  document.getElementById("password").placeholder = id ? "Leave blank to keep the current password" : "At least 6 characters";
  document.getElementById("joinDate").value = todayStr();
  if (id) {
    const e = getUserById(id);
    document.getElementById("name").value = e.name;
    document.getElementById("email").value = e.email;
    document.getElementById("department").value = e.department;
    document.getElementById("salary").value = e.salary;
    document.getElementById("joinDate").value = e.joinDate || todayStr();
  }
  openDialog(empDialog);
}

function saveEmployee(e) {
  e.preventDefault();
  clearErrors(empForm);

  const id = Number(document.getElementById("empId").value) || null;
  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const department = document.getElementById("department").value.trim();
  const salary = Number(document.getElementById("salary").value);
  const joinDate = document.getElementById("joinDate").value;

  const users = getUsers();
  let ok = true;
  if (!name) { showFieldError("name", "Name is required"); ok = false; }
  if (!email) { showFieldError("email", "Email is required"); ok = false; }
  else if (!isValidEmail(email)) { showFieldError("email", "Enter a valid email address"); ok = false; }
  else if (users.some(u => u.email.toLowerCase() === email.toLowerCase() && u.id !== id)) {
    showFieldError("email", "This email is already used"); ok = false;
  }
  if (!id && !password) { showFieldError("password", "Password is required"); ok = false; }
  else if (password && password.length < 6) { showFieldError("password", "Use at least 6 characters"); ok = false; }
  if (!department) { showFieldError("department", "Department is required"); ok = false; }
  if (!(salary > 0)) { showFieldError("salary", "Salary must be greater than 0"); ok = false; }
  if (!joinDate) { showFieldError("joinDate", "Joining date is required"); ok = false; }
  if (!ok) return;

  if (id) {
    const u = users.find(x => x.id === id);
    Object.assign(u, { name, email, department, salary, joinDate });
    if (password) u.password = password;
    toast("Employee updated");
  } else {
    users.push({ id: newId(), name, email, password, role: "employee", department, salary, joinDate });
    toast("Employee added. They can log in with this email and password.");
  }
  setData(KEYS.users, users);
  closeDialog(empDialog);
  refreshEmployees();
}

// Admin removes a registered face so the employee can register again
function resetFace(id) {
  const e = getUserById(id);
  if (!confirm("Reset the registered face of " + e.name + "? They will have to register again.")) return;
  const users = getUsers();
  delete users.find(u => u.id === id).faceDescriptor;
  setData(KEYS.users, users);
  toast("Face reset");
  renderEmployees();
}

function deleteEmployee(id) {
  const e = getUserById(id);
  if (!confirm("Delete " + e.name + "? Their attendance and leave records will be deleted too.")) return;
  setData(KEYS.users, getUsers().filter(u => u.id !== id));
  setData(KEYS.attendance, getAttendance().filter(a => a.userId !== id));
  setData(KEYS.leaves, getLeaves().filter(l => l.userId !== id));
  toast("Employee deleted");
  refreshEmployees();
}
