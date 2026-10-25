# HCM Lite
🚀 Live Demo

Deployed Project: https://hcm-project01.vercel.app/
A small HR web app for **Admin** and **Employees**, built with plain **HTML, CSS and JavaScript**.
No framework and no backend: all data is saved in the browser with `localStorage`.
The app starts empty. The Admin creates the company, adds employees, and every number comes from what people do in the app.

Built for the Saylani Hackathon (Beginner Track).

## Run it

1. Open the folder in VS Code.
2. Right-click `index.html` and choose **Open with Live Server**.
3. First run shows **Set up your company**. Create the Admin account.

To deploy, push the folder to GitHub and enable **GitHub Pages** (or drag the folder into Netlify / Vercel).

## How to use

**Admin**
1. Settings: set office start time, grace minutes, yearly leave quota and working days. Optional: tick **Require face recognition**, click **Use my current location** while standing in the office, and set the radius.
2. Employees: add employees. Each one gets a login (email + password you choose).
3. Leaves: approve or reject requests (a comment is required to reject).
4. Dashboard: totals, charts, today's attendance, announcements, smart helper.
5. Attendance: view any date, export a month to CSV.
6. Payslips: pick an employee and month, then Print / Save as PDF.

**Employee**
1. Log in with the email and password the Admin created.
2. Click **Register face** once (allow the camera). Then use **Check in with camera** and **Check out with camera**: attendance is marked by itself when your face is recognized. The normal Check in / Check out buttons still work unless the Admin requires the camera.
3. My attendance tab: history for any month.
4. Leave tab: apply, see status and balance, cancel pending requests.
5. Ask the smart helper about your own data.

## Features

| Area | What it does |
|---|---|
| Roles | Admin and Employee. Every page checks who is logged in and redirects wrong roles |
| Setup + login | First-run company setup, login, logout, change password |
| Employees | Add (creates login), edit, delete, search, department filter, form validation |
| Attendance | Check in / out, late, half day, absent, one check-in per day |
| Leave | Apply, approve / reject with comment, balance, overlap and quota checks |
| Dashboard | Company totals, attendance by department, 7-day trend (Chart.js) |
| Payslip | Monthly slip, print or save as PDF |
| Smart helper | Keyword chat box that answers from real data. Employees only get their own data |
| Announcements | Admin posts, Employees read |
| Face recognition attendance (bonus) | The employee registers their face once. Then the camera marks check-in and check-out **automatically** when the face matches and the GPS location is inside the office radius |
| Extras | Dark mode, CSV export, responsive layout, toast messages |

## Business rules

| Area | Rule |
|---|---|
| Late | Check-in after office start + grace minutes |
| Check-in / out | One check-in per day. Check-out only after check-in |
| Half day | Worked under 5 hours (out minus in) |
| Absent | Working day with no attendance record and no approved leave. Today is not counted until the day is over |
| Leave | From ≤ To. Working days only. No overlap with another request. Cannot go over the yearly quota. Balance = quota − approved days. Pending days also count when checking the quota |
| Payslip | Per day = salary ÷ working days in the month. Deduction = per day × (absent + 0.5 × half days). Net = salary − deduction. Approved leave is not deducted |
| Forms | Required fields, valid email, email not already used, salary > 0. Errors show next to the field |

## Project structure

```
hcm-lite/
├── index.html            Login + first-run setup
├── pages/
│   ├── admin.html        Admin dashboard
│   ├── employees.html    Manage employees
│   ├── attendance.html   Attendance records (Admin)
│   ├── leaves.html       Leave requests (Admin)
│   ├── settings.html     Company settings
│   ├── employee.html     Employee dashboard
│   ├── payslip.html      Monthly payslip
│   └── profile.html      Own details + change password
├── css/style.css         Design tokens, layout, components, print, dark mode
├── assets/favicon.svg
├── vendor/               Chart.js and face-api.js (with the tiny face detector model)
└── js/
    ├── storage.js        The only file that touches localStorage
    ├── utils.js          Dates, formatting, validation, toast, CSV
    ├── auth.js           Login, logout, role guard, change password
    ├── ui.js             Sidebar, topbar, icons, tabs, dark mode
    ├── employees.js      Employee CRUD
    ├── attendance.js     Check in/out, daily status rules, monthly summary, payslip maths
    ├── leave.js          Apply, approve/reject, balance
    ├── camera.js         Face registration + automatic check-in / check-out (camera + location + face match)
    ├── dashboard.js      Admin and Employee dashboards, charts
    ├── payslip.js        Payslip page
    ├── helper.js         Smart helper
    ├── announcements.js  Announcements
    ├── settings.js       Company settings
    ├── profile.js        Profile + password
    └── login.js          index.html logic
```

## Data (localStorage)

| Key | Stores |
|---|---|
| `hcm_company` | Name, start time, grace minutes, leave quota, working days, camera settings (requireCamera, office latitude / longitude, radius) |
| `hcm_users` | Admin and employees: id, name, email, password, role, department, salary, joinDate, faceDescriptor (128 numbers, after face registration) |
| `hcm_attendance` | One entry per employee per day: date, check-in, check-out, late, status |
| `hcm_leaves` | Leave requests: userId, type, from, to, days, reason, status, comment |
| `hcm_session` | Who is logged in right now |
| `hcm_announcements` | Announcements |
| `hcm_theme` | Light or dark mode |

Inspect it in Chrome: `F12` → **Application** → **Local Storage**.

## Notes

- Data lives in one browser only. A real app needs a server and a database.
- Passwords are stored as plain text **only because this is a learning project**. A real app must hash them on a server.
- Chart.js and face-api.js are included in `vendor/`, so the app works offline.
- Camera and location need **https or localhost** (Live Server, GitHub Pages and Netlify are fine; opening the file by double-click is not).
- Face recognition compares the live face with the registered one (face-api.js). Only 128 numbers describing the face are saved in `hcm_users`. The camera image is never saved.
- There is no liveness check, so a photo or a phone screen could fool it. Do not use it for real security.
- An employee can register a face only once. The Admin can reset it from the Employees page.
- The first camera check can take a few seconds while the face models load (about 7 MB).
- Smart helper: keyword matching, no API key needed.

## Test checklist

1. Create company → Admin dashboard opens.
2. Add 2 employees. Try empty fields, bad email, duplicate email, salary 0.
3. Log in as an employee → check in → check out (shows **Half day**, under 5 hours).
4. In Settings set start time `00:00` and grace `0`, check in with another employee → **Late**.
5. Apply for leave: wrong dates, weekend only, overlap, over quota. Then a valid one.
6. As Admin approve it. Employee balance goes down.
7. Open the payslip. Print / Save as PDF.
8. Ask the helper as Admin and as Employee. Employee asking about others is refused.
9. Resize the browser to phone width. Toggle dark mode.
10. Face recognition: as an employee click **Register face**. Then click **Check in with camera**. Attendance is marked by itself when the camera, location and face are all OK. Try with a different person: it must be refused. Click **Check out with camera** to check out the same way.
11. As Admin open Employees: the Face column shows Registered. Click **Reset face** to let the employee register again.

## PDF requirements checklist

| PDF requirement | Where |
|---|---|
| Two roles, page guards, Employee sent back from Admin pages | `auth.js` → `requireRole()` on every page |
| Admin adds employee, which creates the login | `employees.js` → `saveEmployee()` |
| Attendance: present / late / half day by Admin rules | `attendance.js`, rules set in `settings.html` |
| Leave: apply, approve / reject, balance updates | `leave.js`, `leaves.html`, `employee.html` |
| Dashboard and monthly payslip | `admin.html`, `employee.html`, `payslip.html` |
| Smart helper on both dashboards, Employees see own data only | `helper.js` |
| Responsive, works on a phone | `css/style.css` |
| 13-row permissions table (setup, login, settings, employees, attendance, leave, dashboard, payslip, helper, announcements) | All built. Change password is in `profile.html`, announcements in `admin.html` / `employee.html` |
| Business rules: late, one check-in, half day, absent, leave limits, payslip maths, form validation | See the Business rules table above |
| Starts empty, no dummy data | Yes |
| Bonus: face recognition check-in and check-out with location check | `camera.js` |
| Bonus: Chart.js charts, dark mode, CSV export | `dashboard.js`, `ui.js`, `attendance.js` |
| Bonus not built: LLM-powered helper | The helper uses keyword matching (the required part) |
