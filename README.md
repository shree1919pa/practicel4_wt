# Student Registration System Using Node.js (Server-Side Validation)

A clean, modular, and beginner-friendly web application developed for **College Web Technology Practical #4**. This project demonstrates multi-layer **Server-Side Validation** in Node.js and Express without relying on external template engines or client-side validation bypasses.

---

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Server-Side Validation Rules](#server-side-validation-rules)
5. [Routing Architecture](#routing-architecture)
6. [Security & Best Practices](#security--best-practices)
7. [Installation & Setup](#installation--setup)
8. [Testing Guide & Practical Viva Test Matrix](#testing-guide--practical-viva-test-matrix)
9. [Deployment on Render](#deployment-on-render)
10. [Viva / Oral Examination Questions & Answers](#viva--oral-examination-questions--answers)

---

## 1. Project Overview

In web development, relying exclusively on client-side (browser) validation is a major security vulnerability, as attackers can easily disable JavaScript, alter DOM attributes, or send malicious HTTP POST requests directly using tools like Postman, curl, or Python scripts.

This application demonstrates **100% server-side validation** implemented on a Node.js/Express backend:
- The HTML form contains the `novalidate` attribute, ensuring that browser validation does not intercept submissions and all data flows to the Node.js server.
- The server sanitizes, trims, and validates every incoming field against strict business rules.
- On validation error, the server responds with **HTTP 422 (Unprocessable Entity)**, highlights invalid fields with descriptive error messages, and preserves safe form values while **never repopulating password fields**.
- On successful validation, passwords are cryptographically salted and hashed using Node.js built-in `crypto` (`PBKDF2 SHA-512`), and the user is redirected via the **Post/Redirect/Get (PRG)** pattern.

> ⚠️ **In-Memory Storage Notice:** In accordance with the college practical specification, student registrations are stored in server memory (RAM array). When the Node.js server restarts or redeploys, in-memory records reset to an empty state.

---

## 2. Technology Stack

- **Runtime Environment:** Node.js (v18.x or v20.x+ recommended)
- **Web Framework:** Express.js (`express`)
- **Structure:** HTML5 semantic markup
- **Styling:** Vanilla CSS3 (Custom design system with CSS Variables, Flexbox, CSS Grid)
- **Templating / Rendering:** Native lightweight view engine using Node.js built-in `fs` and safe token replacement
- **Cryptography:** Node.js built-in `crypto` module (`PBKDF2` with cryptographic salt)
- **No Heavy Dependencies:** No React, No MongoDB, No heavy external template engines.

---

## 3. Project Structure

```text
student-registration/
│
├── app.js                          # Main Express application entry point & error handlers
├── package.json                    # Project dependencies and npm scripts
├── .gitignore                      # Excludes node_modules, logs, and environment secrets
│
├── routes/
│   └── studentRoutes.js            # Modular Express router, REST API (/api/*), SSR views & DB
│
├── validators/
│   └── studentValidator.js         # Dedicated server-side validation rules & sanitization
│
├── public/
│   ├── client.js                   # Frontend controller (Interactive validation, Fetch API, Live Inspector)
│   └── style.css                   # Custom responsive CSS design system
│
├── views/
│   ├── register.html               # Registration view (Dual Mode: Frontend API vs SSR Form)
│   ├── success.html                # Confirmation view with student summary & security note
│   ├── students.html               # Interactive students directory with search, filter & export
│   └── 404.html                    # Custom 404 Not Found error page
│
├── test/
│   ├── test-validation.js          # Automated test suite (80 passing assertions)
│   └── verify-scenarios.js         # Live HTTP server scenario verification script
│
└── README.md                       # Comprehensive documentation and viva guide
```

---

## 4. Server-Side Validation Rules

| Field Name | Type | Server-Side Rules | Error Message Returned |
| :--- | :--- | :--- | :--- |
| **Full Name** | String | • Required<br>• 3 to 50 characters (trimmed)<br>• Letters and single spaces only (`/^[A-Za-z\s]+$/`) | *"Full Name is required."* / *"Full Name must be between 3 and 50 characters."* / *"Full Name can only contain alphabetical letters and spaces."* |
| **Email Address** | String | • Required<br>• Normalized to lowercase & trimmed<br>• Standard RFC format (`/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/`)<br>• Uniqueness check against in-memory store | *"Email Address is required."* / *"Please provide a valid email address."* / *"A student with this email address is already registered."* |
| **Age** | Integer | • Required<br>• Positive integer digits only (`/^\d+$/`)<br>• Range: **16 to 60** | *"Age is required."* / *"Age must be a valid whole number (integer)."* / *"Age must be between 16 and 60 years."* |
| **Password** | String | • Required<br>• Minimum 8 characters (max 128)<br>• At least 1 uppercase letter (`A-Z`)<br>• At least 1 lowercase letter (`a-z`)<br>• At least 1 numeric digit (`0-9`)<br>• At least 1 special character (`[!@#$%^&*...]`) | *"Password is required."* / *"Password must be at least 8 characters long."* / *"Password must contain at least one uppercase letter (A-Z)."* / etc. |
| **Confirm Password** | String | • Required<br>• Must strictly equal the `Password` field | *"Confirm Password is required."* / *"Confirm Password does not match the entered Password."* |
| **Course Name** | String | • Required<br>• Must match an item in the server's whitelist of approved programs | *"Please select a course."* / *"Selected course is invalid. Please pick a course from the allowed list."* |
| **Payload Size** | HTTP Body | • Request body maximum limit of **10 KB** | HTTP 413 (*"413 Payload Too Large"*) |

---

## 5. Dual Architecture: Frontend & Backend

This application is built with a dual architecture allowing students to demonstrate both **Modern Decoupled Frontend (Fetch API / SPA)** and **Traditional Full-Stack SSR**:

### 🌐 Frontend Layer (`public/client.js`, `public/style.css`, `views/`)
1. **Interactive Real-Time Validation UX**:
   - Visual **Password Strength Meter** (evaluates 5 criteria dynamically: length, uppercase, lowercase, numbers, symbols).
   - Real-time **Password Match Indicator** (instantly flags mismatches before submit).
   - Dynamic clearing of field validation errors as the student types.
2. **Asynchronous API Mode (Default)**:
   - Form submissions are intercepted and sent via `fetch('/api/register')`.
   - On error: Inline errors and summary banners are animated without reloading the page.
   - On success: An animated confirmation modal displays the generated student ID and PBKDF2 hash stamp.
3. **Live Frontend ⟷ Backend Inspector**:
   - Docked at the bottom of the page (`⚡ Live Frontend ⟷ Backend Inspector`).
   - Visually logs real-time HTTP requests, status codes, duration in milliseconds, and JSON request/response payloads.
   - Includes quick-test buttons: `Ping /api/health`, `Get /api/students`, `Get /api/courses`.
4. **Interactive Enrolled Students Directory**:
   - Live search filter by Name, Email, or Student ID.
   - Filter by Course program dropdown.
   - Live Delete student button (`DELETE /api/students/:id`).
   - Export active roster to **JSON** or **CSV**.

### 📡 Backend REST API Layer (`routes/studentRoutes.js`)

| Method | Endpoint | Request Body | Description | Status Code |
| :--- | :--- | :--- | :--- | :--- |
| **POST** | `/api/register` | JSON / Form | Dedicated REST API: validates student, hashes password with PBKDF2, saves in RAM. | `201 Created` / `422 Unprocessable` |
| **GET** | `/api/students` | None | Returns JSON roster of all enrolled students (passwords omitted). | `200 OK` |
| **GET** | `/api/students/:id` | None | Returns JSON record for a specific Student ID. | `200 OK` / `404 Not Found` |
| **DELETE** | `/api/students/:id` | None | Deletes student from server memory by ID. | `200 OK` / `404 Not Found` |
| **GET** | `/api/courses` | None | Returns approved course whitelist in JSON. | `200 OK` |
| **GET** | `/api/health` | None | Returns server uptime, node version, and memory registration count. | `200 OK` |

### 📄 Classic Server-Side Rendered (SSR) Routes

| Method | Endpoint | Description | Status Code |
| :--- | :--- | :--- | :--- |
| **GET** | `/` | Serves the student registration form HTML view. | `200 OK` |
| **POST** | `/register` | Classic form submission route. Supports both SSR (PRG pattern) and JSON response. | `422 Unprocessable` / `302 Redirect` |
| **GET** | `/success` | Displays registration confirmation. Guarded against direct unauthorized access. | `200 OK` |
| **GET** | `/students` | Renders HTML roster of registered students. | `200 OK` |
| **ALL** | `*` | Custom 404 middleware catching undefined routes and serving `views/404.html`. | `404 Not Found` |

---

## 6. Security & Best Practices

1. **Never Trust Client Input:** Even though HTML5 inputs have types, the `<form>` uses `novalidate` to demonstrate that the Node.js server independently verifies all data integrity.
2. **Password Protection:** Plain-text passwords are **never** logged to the console, **never** stored in memory, and **never** reflected back in HTML forms on validation error. Passwords are cryptographically salted and hashed using Node.js built-in `crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512')`.
3. **Cross-Site Scripting (XSS) Prevention:** All dynamic values reflected back in HTML templates (e.g., student name, email) are sanitized through an HTML escaping function (`&`, `<`, `>`, `"`, `'`).
4. **DoS & Large Payload Protection:** Express body parsers are capped at `10kb` (`express.urlencoded({ extended: false, limit: '10kb' })`) to prevent memory exhaustion attacks.
5. **Post/Redirect/Get (PRG) Pattern:** Prevents accidental duplicate registrations when users refresh their browser after form submission.

---

## 7. Installation & Setup

### Prerequisites
- Node.js installed (v18.0.0 or higher)
- npm (Node Package Manager)

### Step 1: Clone or Navigate to Project Directory
```bash
cd student-registration
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Start the Application
You can start the server in production mode or development mode:

**Production Mode:**
```bash
npm start
```

**Development Watch Mode (Auto-reloads on file changes):**
```bash
npm run dev
```

### Step 4: Open in Your Web Browser
Open your browser and navigate to:
```text
http://localhost:3000
```

---

## 8. Testing Guide & Practical Viva Test Matrix

### Running the Automated Test Suite
The project includes an automated test suite verifying all 20 test conditions across 58 assertions:

```bash
npm test
```

### Manual Testing Matrix for Practical Examination

Use the test cases below during your practical exam to demonstrate every validation condition to the examiner:

| # | Test Case Scenario | Sample Input Values | Expected Behavior / Output | HTTP Status |
| :--- | :--- | :--- | :--- | :--- |
| **1** | **All Fields Valid** | • Name: `Alice Johnson`<br>• Email: `alice.johnson@college.edu`<br>• Age: `20`<br>• Course: `Computer Science and Engineering`<br>• Password: `CollegePass123!`<br>• Confirm: `CollegePass123!` | Redirects to `/success?id=STU-XXXXXX` displaying assigned Student ID and enrollment summary. Password displayed as `🔒 PBKDF2 Hashed`. | `302 Redirect` then `200 OK` |
| **2** | **Empty Form Submission** | Click **Submit Registration** without entering any data. | Renders top error banner *"Server-Side Validation Failed (6 Errors)"*. Highlights all 6 fields in red with specific error messages. | `422 Unprocessable Entity` |
| **3** | **Invalid Name** | • Name: `John123!` (contains numbers/symbols) | Error under Full Name: *"Full Name can only contain alphabetical letters and spaces."* | `422 Unprocessable Entity` |
| **4** | **Name Too Short** | • Name: `Al` (2 chars) | Error: *"Full Name must be between 3 and 50 characters in length."* | `422 Unprocessable Entity` |
| **5** | **Invalid Email** | • Email: `student-email-without-domain` | Error: *"Please provide a valid email address (e.g., student@college.edu)."* Safe fields are preserved. | `422 Unprocessable Entity` |
| **6** | **Duplicate Email** | Submit registration with an email that is already enrolled. | Error: *"A student with this email address is already registered."* | `422 Unprocessable Entity` |
| **7** | **Age Below 16** | • Age: `15` | Error: *"Age must be between 16 and 60 years."* | `422 Unprocessable Entity` |
| **8** | **Age Above 60** | • Age: `65` | Error: *"Age must be between 16 and 60 years."* | `422 Unprocessable Entity` |
| **9** | **Age Decimal / Non-Integer** | • Age: `20.5` | Error: *"Age must be a valid whole number (integer)."* | `422 Unprocessable Entity` |
| **10** | **Password < 8 Characters** | • Password: `Pass1!` (6 chars) | Error: *"Password must be at least 8 characters long."* Password input is cleared. | `422 Unprocessable Entity` |
| **11** | **Password Missing Uppercase/Number** | • Password: `mypassword!@#` | Error: *"Password must contain at least one uppercase letter (A-Z)."* | `422 Unprocessable Entity` |
| **12** | **Mismatched Passwords** | • Password: `Password123!`<br>• Confirm: `Different123!` | Error: *"Confirm Password does not match the entered Password."* Both password inputs cleared. | `422 Unprocessable Entity` |
| **13** | **Unapproved Course** | Manually craft request with unlisted course option. | Error: *"Selected course is invalid. Please pick a course from the allowed list."* | `422 Unprocessable Entity` |
| **14** | **Direct Access to Success** | Manually navigate to `http://localhost:3000/success` | Displays restricted state: *"No Active Registration Found"*. Direct access is guarded. | `200 OK` |
| **15** | **Registered Students Roster** | Navigate to `http://localhost:3000/students` | Displays responsive table of all registered students with ID, Full Name, Email, Course, and Security badge. | `200 OK` |
| **16** | **Unknown Route (404)** | Navigate to `http://localhost:3000/non-existent-page` | Displays custom 404 page showing requested URL and return button. | `404 Not Found` |
| **17** | **Server Health API** | Navigate to `http://localhost:3000/health` | Returns JSON status `{ "status": "UP", "uptimeSeconds": ..., "registeredStudentsInMemory": 1 }`. | `200 OK` |

---

## 9. Deployment on Render

This application is ready for cloud deployment on **Render**:

1. **Port Binding:** Configured in `app.js` using `process.env.PORT || 3000` and binds to host `0.0.0.0`.
2. **Start Script:** Defined in `package.json` as `"start": "node app.js"`.
3. **Clean Repository:** `.gitignore` excludes `node_modules` and local environment files.

### Steps to Deploy on Render:
1. Push your project code to a GitHub repository.
2. Sign in to your [Render Dashboard](https://dashboard.render.com/).
3. Click **New +** and select **Web Service**.
4. Connect your GitHub repository.
5. Configure the service settings:
   - **Name:** `student-registration-system`
   - **Environment:** `Node`
   - **Branch:** `main` (or `master`)
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** `Free`
6. Click **Create Web Service**. Render will install dependencies and launch your application at a public URL (e.g., `https://student-registration-system.onrender.com`).

---

## 10. Viva / Oral Examination Questions & Answers

### Q1: Why is server-side validation mandatory even if we have client-side HTML5 validation?
**Answer:** Client-side validation improves user experience by providing quick feedback, but it can be completely bypassed by disabling JavaScript in the browser, editing the DOM attributes (e.g., removing `required`), or submitting HTTP requests directly via cURL or Postman. Server-side validation is the only true line of defense to ensure data integrity and system security.

### Q2: What is the Post/Redirect/Get (PRG) pattern and why is it used here?
**Answer:** In traditional web applications, if a user refreshes their browser after submitting a POST form, the browser attempts to resubmit the POST request, which can cause duplicate records. With PRG, after a successful POST request, the server returns an HTTP 302 redirect instructing the browser to issue a GET request to `/success`. Refreshing the page then safely re-executes the GET request without duplicate submissions.

### Q3: Why do we clear password fields when validation fails?
**Answer:** Repopulating passwords in HTML responses exposes sensitive credentials in page source code, browser caches, and network proxies. It is an industry security standard to never repopulate password or confirm-password fields.

### Q4: How is the password stored in memory?
**Answer:** We use Node.js built-in `crypto` module to generate a cryptographically random 16-byte salt, then derive a 64-byte key using `PBKDF2` (Password-Based Key Derivation Function 2) with SHA-512 over 10,000 iterations. Plain-text passwords are never stored or logged.

### Q5: What HTTP status code is used for validation errors?
**Answer:** `HTTP 422 (Unprocessable Entity)` is returned when the request format is valid (syntactically correct), but the business logic validation checks fail. `HTTP 400 (Bad Request)` is also commonly used.
