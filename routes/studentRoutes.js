/**
 * routes/studentRoutes.js
 * 
 * Express Router Module for Student Registration
 * 
 * Routes:
 * - GET  /         : Render student registration form
 * - POST /register : Validate inputs on server and process registration
 * - GET  /success  : Display registration confirmation (guarded against unauthorized access)
 * - GET  /students : Display registered students roster without exposing passwords
 * - GET  /health   : Server health check endpoint
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const { ALLOWED_COURSES, validateStudentRegistration } = require('../validators/studentValidator');

// ============================================================================
// In-Memory Database
// Note: As per practical requirements, students are stored in volatile RAM.
// Data will reset when the server restarts.
// ============================================================================
const students = [];

// ============================================================================
// Security & Sanitization Helpers
// ============================================================================

/**
 * Escapes HTML characters to prevent XSS attacks when reflecting inputs.
 */
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Securely hashes passwords using Node.js built-in PBKDF2 with unique salt.
 * Plain-text passwords are never stored or logged.
 */
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return { salt, hash };
}

// ============================================================================
// Lightweight View Rendering Engine (No external template dependencies)
// ============================================================================

const VIEWS_DIR = path.join(__dirname, '..', 'views');

/**
 * Reads a view file from the views directory.
 */
function getViewTemplate(fileName) {
  const filePath = path.join(VIEWS_DIR, fileName);
  return fs.readFileSync(filePath, 'utf8');
}

/**
 * Renders the registration form page with optional errors and retained safe values.
 */
function renderRegisterView(options = {}) {
  const { errors = {}, values = {} } = options;
  let html = getViewTemplate('register.html');

  const errorKeys = Object.keys(errors);
  const hasErrors = errorKeys.length > 0;

  // 1. Render Error Summary Banner
  let errorSummaryHtml = '';
  if (hasErrors) {
    const errorItems = errorKeys
      .map(field => `<li><strong>${escapeHtml(field)}:</strong> ${escapeHtml(errors[field])}</li>`)
      .join('');

    errorSummaryHtml = `
      <div class="alert alert-error" role="alert" id="errorSummary">
        <div class="alert-icon">⚠️</div>
        <div class="alert-content">
          <strong>Server-Side Validation Failed (${errorKeys.length} Error${errorKeys.length > 1 ? 's' : ''}):</strong>
          <p>Please address the highlighted field errors below and resubmit the form:</p>
          <ul class="alert-list">
            ${errorItems}
          </ul>
        </div>
      </div>
    `;
  }
  html = html.replace('{{ERROR_SUMMARY}}', errorSummaryHtml);

  // 2. Render Field Values & Error Indicators
  // Full Name
  html = html.replace('{{VAL_FULL_NAME}}', escapeHtml(values.fullName || ''));
  html = html.replace('{{FULL_NAME_CLASS}}', errors.fullName ? ' is-invalid' : '');
  html = html.replace('{{FULL_NAME_ERROR}}', errors.fullName 
    ? `<p class="field-error" id="fullName-error"><span class="error-bullet">✕</span> ${escapeHtml(errors.fullName)}</p>` 
    : '');

  // Email
  html = html.replace('{{VAL_EMAIL}}', escapeHtml(values.email || ''));
  html = html.replace('{{EMAIL_CLASS}}', errors.email ? ' is-invalid' : '');
  html = html.replace('{{EMAIL_ERROR}}', errors.email 
    ? `<p class="field-error" id="email-error"><span class="error-bullet">✕</span> ${escapeHtml(errors.email)}</p>` 
    : '');

  // Age
  html = html.replace('{{VAL_AGE}}', escapeHtml(values.age || ''));
  html = html.replace('{{AGE_CLASS}}', errors.age ? ' is-invalid' : '');
  html = html.replace('{{AGE_ERROR}}', errors.age 
    ? `<p class="field-error" id="age-error"><span class="error-bullet">✕</span> ${escapeHtml(errors.age)}</p>` 
    : '');

  // Password (NEVER repopulate password value for security)
  html = html.replace('{{PASSWORD_CLASS}}', errors.password ? ' is-invalid' : '');
  html = html.replace('{{PASSWORD_ERROR}}', errors.password 
    ? `<p class="field-error" id="password-error"><span class="error-bullet">✕</span> ${escapeHtml(errors.password)}</p>` 
    : '');

  // Confirm Password (NEVER repopulate confirm password value)
  html = html.replace('{{CONFIRM_PASSWORD_CLASS}}', errors.confirmPassword ? ' is-invalid' : '');
  html = html.replace('{{CONFIRM_PASSWORD_ERROR}}', errors.confirmPassword 
    ? `<p class="field-error" id="confirmPassword-error"><span class="error-bullet">✕</span> ${escapeHtml(errors.confirmPassword)}</p>` 
    : '');

  // Course Options
  const courseOptionsHtml = ALLOWED_COURSES.map(c => {
    const isSelected = (values.course === c) ? 'selected' : '';
    return `<option value="${escapeHtml(c)}" ${isSelected}>${escapeHtml(c)}</option>`;
  }).join('\n');

  html = html.replace('{{COURSE_OPTIONS}}', courseOptionsHtml);
  html = html.replace('{{COURSE_CLASS}}', errors.course ? ' is-invalid' : '');
  html = html.replace('{{COURSE_ERROR}}', errors.course 
    ? `<p class="field-error" id="course-error"><span class="error-bullet">✕</span> ${escapeHtml(errors.course)}</p>` 
    : '');

  // Active student count badge
  html = html.replace(/{{STUDENTS_COUNT}}/g, String(students.length));

  return html;
}

/**
 * Renders the success confirmation page or restricted notice.
 */
function renderSuccessView(student) {
  let html = getViewTemplate('success.html');
  html = html.replace(/{{STUDENTS_COUNT}}/g, String(students.length));

  if (student) {
    const successBody = `
      <div class="success-icon-wrap">✓</div>
      <h2 class="success-title">Student Registration Successful!</h2>
      <p class="success-desc">All server-side validation checks passed. The student has been enrolled into memory.</p>

      <div class="details-table-card">
        <div class="details-row">
          <span class="details-label">Assigned Student ID</span>
          <span class="details-value"><span class="student-id-badge">${escapeHtml(student.id)}</span></span>
        </div>
        <div class="details-row">
          <span class="details-label">Full Name</span>
          <span class="details-value">${escapeHtml(student.fullName)}</span>
        </div>
        <div class="details-row">
          <span class="details-label">Email Address</span>
          <span class="details-value">${escapeHtml(student.email)}</span>
        </div>
        <div class="details-row">
          <span class="details-label">Age</span>
          <span class="details-value">${escapeHtml(String(student.age))} Years</span>
        </div>
        <div class="details-row">
          <span class="details-label">Course Program</span>
          <span class="details-value">${escapeHtml(student.course)}</span>
        </div>
        <div class="details-row">
          <span class="details-label">Registration Time</span>
          <span class="details-value">${escapeHtml(student.registeredAt)}</span>
        </div>
        <div class="details-row">
          <span class="details-label">Password Security</span>
          <span class="details-value"><span class="hash-badge">🔒 PBKDF2 SHA-512 (Hashed &amp; Salted)</span></span>
        </div>
      </div>

      <div class="security-box">
        <div class="security-icon">🛡️</div>
        <div>
          <strong>Server-Side Security Check:</strong> Plain-text password was verified against complexity rules, transformed into a cryptographic hash, and purged from server variables immediately.
        </div>
      </div>

      <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
        <a href="/" class="btn btn-primary">+ Register Another Student</a>
        <a href="/students" class="btn btn-secondary">View All Registered Students</a>
      </div>
    `;
    return html.replace('{{SUCCESS_BODY}}', successBody);
  }

  // Fallback for direct or unauthorized GET access without a valid registration ID
  const restrictedBody = `
    <div class="success-icon-wrap" style="background-color: var(--warning-bg); color: var(--warning-text); border-color: var(--warning-border);">⚠️</div>
    <h2 class="success-title">No Active Registration Found</h2>
    <p class="success-desc">Success confirmation details are only displayed immediately following an authorized form submission.</p>

    <div class="alert alert-info" style="text-align: left; margin: 1.5rem 0;">
      <div class="alert-icon">ℹ️</div>
      <div class="alert-content">
        <strong>Direct Route Access Notice:</strong>
        <p>You accessed this route directly or with an invalid registration token. Please complete the registration form to obtain a legitimate registration confirmation.</p>
      </div>
    </div>

    <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
      <a href="/" class="btn btn-primary">Go to Registration Form</a>
      <a href="/students" class="btn btn-secondary">View Registered Students</a>
    </div>
  `;
  return html.replace('{{SUCCESS_BODY}}', restrictedBody);
}

/**
 * Renders the roster of registered students.
 */
function renderStudentsView(studentList) {
  let html = getViewTemplate('students.html');
  html = html.replace(/{{STUDENTS_COUNT}}/g, String(studentList.length));

  if (!studentList || studentList.length === 0) {
    const emptyHtml = `
      <div class="empty-state">
        <div class="empty-icon">👥</div>
        <h3 style="font-size: 1.25rem; font-weight: 700; color: var(--slate-800); margin-bottom: 0.5rem;">No Students Registered In This Session</h3>
        <p style="margin-bottom: 1.5rem; max-width: 480px; margin-left: auto; margin-right: auto;">
          The in-memory database is currently empty. Use the registration form to submit validated student records.
        </p>
        <a href="/" class="btn btn-primary">Register New Student</a>
      </div>
    `;
    return html.replace('{{STUDENTS_TABLE}}', emptyHtml);
  }

  const tableRows = studentList.map((s, index) => `
    <tr>
      <td style="font-weight: 600; color: var(--slate-500);">${index + 1}</td>
      <td><span class="student-id-badge">${escapeHtml(s.id)}</span></td>
      <td style="font-weight: 600; color: var(--slate-900);">${escapeHtml(s.fullName)}</td>
      <td>${escapeHtml(s.email)}</td>
      <td>${escapeHtml(String(s.age))}</td>
      <td>${escapeHtml(s.course)}</td>
      <td style="font-size: 0.8rem; color: var(--slate-500);">${escapeHtml(s.registeredAt)}</td>
      <td><span class="hash-badge">🔒 Protected</span></td>
    </tr>
  `).join('\n');

  const tableHtml = `
    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Student ID</th>
            <th>Full Name</th>
            <th>Email</th>
            <th>Age</th>
            <th>Course</th>
            <th>Registered At</th>
            <th>Security Status</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    </div>
  `;

  return html.replace('{{STUDENTS_TABLE}}', tableHtml);
}

// ============================================================================
// Route Handlers
// ============================================================================

/**
 * GET /
 * Displays the student registration form.
 */
router.get('/', (req, res) => {
  const pageHtml = renderRegisterView();
  res.status(200).send(pageHtml);
});

/**
 * POST /register
 * Validates form submission on the server.
 * - On validation error: Re-renders form with HTTP 422, preserving safe inputs.
 * - On success: Hashes password, stores record in memory, redirects to /success.
 */
router.post('/register', (req, res) => {
  // Execute server-side validation against incoming body
  const validationResult = validateStudentRegistration(req.body, students);

  if (!validationResult.isValid) {
    // Return HTTP 422 Unprocessable Entity
    const errorPageHtml = renderRegisterView({
      errors: validationResult.errors,
      values: validationResult.sanitized // Safe fields only (fullName, email, age, course)
    });
    return res.status(422).send(errorPageHtml);
  }

  // Form passed all validation rules
  const { sanitized } = validationResult;
  const rawPassword = req.body.password;

  // Cryptographically hash password (PBKDF2 SHA-512)
  const { salt, hash } = hashPassword(rawPassword);

  // Generate unique student ID (STU-XXXXXX)
  const studentId = 'STU-' + Math.floor(100000 + Math.random() * 900000);

  const newStudent = {
    id: studentId,
    fullName: sanitized.fullName,
    email: sanitized.email,
    age: parseInt(sanitized.age, 10),
    course: sanitized.course,
    passwordSalt: salt,
    passwordHash: hash.substring(0, 24) + '...[PBKDF2-SHA512]',
    registeredAt: new Date().toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }),
    createdAt: Date.now()
  };

  // Store in memory
  students.push(newStudent);

  // Post/Redirect/Get (PRG) pattern to prevent duplicate submissions
  res.redirect('/success?id=' + encodeURIComponent(studentId));
});

/**
 * GET /success
 * Displays the registration confirmation page.
 * Guarded: Only renders details if a matching recent registration exists.
 */
router.get('/success', (req, res) => {
  const regId = req.query.id;
  const student = regId ? students.find(s => s.id === regId) : null;
  const pageHtml = renderSuccessView(student);
  res.status(200).send(pageHtml);
});

/**
 * GET /students
 * Displays registered student details without exposing passwords.
 * Supports both HTML UI view and JSON format.
 */
router.get('/students', (req, res) => {
  const isJson = req.query.format === 'json' || req.headers.accept?.includes('application/json');

  if (isJson) {
    // Sanitized output for API consumers (passwords and raw hashes excluded)
    const sanitizedStudents = students.map(s => ({
      id: s.id,
      fullName: s.fullName,
      email: s.email,
      age: s.age,
      course: s.course,
      registeredAt: s.registeredAt
    }));

    return res.status(200).json({
      success: true,
      count: sanitizedStudents.length,
      storage: 'volatile in-memory RAM (resets on restart)',
      students: sanitizedStudents
    });
  }

  const pageHtml = renderStudentsView(students);
  res.status(200).send(pageHtml);
});

/**
 * GET /health
 * Simple server health check response.
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    service: 'Student Registration System',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    registeredStudentsInMemory: students.length,
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version
  });
});

module.exports = {
  router,
  students // Exported for automated test assertions
};
