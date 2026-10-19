/**
 * public/client.js
 * 
 * Frontend Client-Side Application Controller
 * Web Technology Practical #4: Dual Frontend & Backend Architecture
 * 
 * Features:
 * 1. Architecture Switcher: Modern Frontend API (Fetch/JSON) vs Traditional Server Form (SSR)
 * 2. Real-time Client-Side Validation & Feedback (Password strength meter, match indicator, live checks)
 * 3. Asynchronous Fetch API Communication with Backend (/api/register, /api/students, /api/health)
 * 4. Interactive Live Inspector: Real-time visual log of Frontend ⟷ Backend JSON communication
 * 5. Interactive Students Roster: Live search, course filter, instant deletion, CSV/JSON export
 * 6. Responsive Toast Notification System & Success Modal
 */

(function () {
  'use strict';

  // ==========================================================================
  // Global State & Storage
  // ==========================================================================
  const state = {
    // Mode: 'api' (Decoupled Frontend via Fetch) or 'ssr' (Traditional Form POST)
    mode: localStorage.getItem('wt_app_mode') || 'api',
    inspectorLogs: [],
    inspectorOpen: false
  };

  // ==========================================================================
  // Helper: Toast Notifications
  // ==========================================================================
  function showToast(message, type = 'info', duration = 3500) {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : type === 'warning' ? '⚠️' : 'ℹ️';
    toast.innerHTML = `
      <span class="toast-icon">${icon}</span>
      <span class="toast-msg">${escapeHtml(message)}</span>
    `;

    container.appendChild(toast);

    // Auto remove after duration
    setTimeout(() => {
      toast.classList.add('toast-fadeout');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ==========================================================================
  // Live Frontend ⟷ Backend Inspector Console
  // ==========================================================================
  function logInspectorCall(entry) {
    state.inspectorLogs.unshift(entry);
    if (state.inspectorLogs.length > 20) state.inspectorLogs.pop();
    renderInspectorLogs();
  }

  function renderInspectorLogs() {
    const listEl = document.getElementById('inspectorLogsList');
    const badgeEl = document.getElementById('inspectorCountBadge');
    if (!listEl) return;

    if (badgeEl) badgeEl.textContent = state.inspectorLogs.length;

    if (state.inspectorLogs.length === 0) {
      listEl.innerHTML = `<div class="inspector-empty">No API calls made yet. Submit the form or click quick-test buttons below.</div>`;
      return;
    }

    listEl.innerHTML = state.inspectorLogs.map((log, idx) => {
      const isSuccess = log.status >= 200 && log.status < 300;
      const statusClass = isSuccess ? 'status-2xx' : (log.status >= 400 && log.status < 500 ? 'status-4xx' : 'status-5xx');
      return `
        <div class="inspector-entry" data-idx="${idx}">
          <div class="inspector-entry-header">
            <span class="method-tag method-${log.method.toLowerCase()}">${log.method}</span>
            <span class="url-tag">${escapeHtml(log.url)}</span>
            <span class="status-badge ${statusClass}">HTTP ${log.status}</span>
            <span class="time-tag">${log.durationMs}ms</span>
            <span class="timestamp-tag">${log.timestamp}</span>
          </div>
          <div class="inspector-entry-details" id="log-detail-${idx}" style="display: ${idx === 0 ? 'block' : 'none'};">
            <div class="inspector-columns">
              <div class="inspector-col">
                <strong>Frontend Request:</strong>
                <pre><code>${escapeHtml(JSON.stringify(log.request, null, 2))}</code></pre>
              </div>
              <div class="inspector-col">
                <strong>Backend Response:</strong>
                <pre><code>${escapeHtml(JSON.stringify(log.response, null, 2))}</code></pre>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Attach toggle listeners to entry headers
    listEl.querySelectorAll('.inspector-entry-header').forEach(header => {
      header.addEventListener('click', () => {
        const entry = header.closest('.inspector-entry');
        const idx = entry.getAttribute('data-idx');
        const detail = document.getElementById(`log-detail-${idx}`);
        if (detail) {
          detail.style.display = detail.style.display === 'none' ? 'block' : 'none';
        }
      });
    });
  }

  // Wrapper for fetch that logs to inspector
  async function apiFetch(url, options = {}) {
    const startTime = performance.now();
    const method = options.method || 'GET';
    const timestamp = new Date().toLocaleTimeString();

    let requestBody = null;
    if (options.body) {
      try {
        requestBody = JSON.parse(options.body);
      } catch (e) {
        requestBody = options.body;
      }
    }

    try {
      const res = await fetch(url, options);
      const durationMs = Math.round(performance.now() - startTime);

      let responseData = null;
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        responseData = await res.json();
      } else {
        const text = await res.text();
        responseData = { text: text.substring(0, 300) + (text.length > 300 ? '...' : '') };
      }

      logInspectorCall({
        url,
        method,
        status: res.status,
        durationMs,
        timestamp,
        request: {
          headers: options.headers || {},
          body: requestBody
        },
        response: responseData
      });

      return { ok: res.ok, status: res.status, data: responseData };
    } catch (err) {
      const durationMs = Math.round(performance.now() - startTime);
      logInspectorCall({
        url,
        method,
        status: 0,
        durationMs,
        timestamp,
        request: { body: requestBody },
        response: { error: err.message || 'Network connection failed' }
      });
      throw err;
    }
  }

  // ==========================================================================
  // Architecture Mode Switcher
  // ==========================================================================
  function initModeSwitcher() {
    const switcherEl = document.getElementById('architectureModeSwitcher');
    if (!switcherEl) return;

    function updateUiForMode(mode) {
      state.mode = mode;
      localStorage.setItem('wt_app_mode', mode);

      const btnApi = document.getElementById('btnModeApi');
      const btnSsr = document.getElementById('btnModeSsr');
      const form = document.getElementById('studentRegistrationForm');
      const bannerBadge = document.getElementById('modeIndicatorBadge');

      if (btnApi) btnApi.classList.toggle('active', mode === 'api');
      if (btnSsr) btnSsr.classList.toggle('active', mode === 'ssr');

      if (bannerBadge) {
        if (mode === 'api') {
          bannerBadge.innerHTML = '🟢 Frontend API Mode (Fetch / Decoupled)';
          bannerBadge.className = 'badge-demo badge-api-mode';
        } else {
          bannerBadge.innerHTML = '🔵 Traditional SSR Mode (Form POST)';
          bannerBadge.className = 'badge-demo badge-ssr-mode';
        }
      }

      const submitBtn = document.getElementById('submitBtn');
      if (submitBtn) {
        const label = submitBtn.querySelector('.btn-text');
        if (label) {
          label.textContent = mode === 'api' ? 'Submit Registration (API Fetch)' : 'Submit Registration (Classic POST)';
        }
      }
    }

    const btnApi = document.getElementById('btnModeApi');
    const btnSsr = document.getElementById('btnModeSsr');

    if (btnApi) {
      btnApi.addEventListener('click', (e) => {
        e.preventDefault();
        updateUiForMode('api');
        showToast('Switched to Frontend API Mode (Fetch / REST)', 'info');
      });
    }

    if (btnSsr) {
      btnSsr.addEventListener('click', (e) => {
        e.preventDefault();
        updateUiForMode('ssr');
        showToast('Switched to Classic SSR Mode (Traditional POST)', 'info');
      });
    }

    // Apply stored mode
    updateUiForMode(state.mode);
  }

  // ==========================================================================
  // Client-Side Validation Feedback & Password Strength Meter
  // ==========================================================================
  function initInteractiveValidation() {
    const form = document.getElementById('studentRegistrationForm');
    if (!form) return;

    const fullNameInput = document.getElementById('fullName');
    const emailInput = document.getElementById('email');
    const ageInput = document.getElementById('age');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const courseSelect = document.getElementById('course');

    // 1. Password Strength Evaluation
    if (passwordInput) {
      const strengthContainer = document.getElementById('passwordStrengthContainer');
      const bar = document.getElementById('passwordStrengthBar');
      const label = document.getElementById('passwordStrengthText');

      // Requirement indicators
      const reqLen = document.getElementById('reqLength');
      const reqUpper = document.getElementById('reqUpper');
      const reqLower = document.getElementById('reqLower');
      const reqDigit = document.getElementById('reqDigit');
      const reqSpecial = document.getElementById('reqSpecial');

      passwordInput.addEventListener('input', () => {
        const val = passwordInput.value;
        if (!val) {
          if (strengthContainer) strengthContainer.style.display = 'none';
          return;
        }

        if (strengthContainer) strengthContainer.style.display = 'block';

        const hasLength = val.length >= 8;
        const hasUpper = /[A-Z]/.test(val);
        const hasLower = /[a-z]/.test(val);
        const hasDigit = /[0-9]/.test(val);
        const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(val);

        if (reqLen) reqLen.classList.toggle('req-met', hasLength);
        if (reqUpper) reqUpper.classList.toggle('req-met', hasUpper);
        if (reqLower) reqLower.classList.toggle('req-met', hasLower);
        if (reqDigit) reqDigit.classList.toggle('req-met', hasDigit);
        if (reqSpecial) reqSpecial.classList.toggle('req-met', hasSpecial);

        const score = [hasLength, hasUpper, hasLower, hasDigit, hasSpecial].filter(Boolean).length;

        if (bar && label) {
          bar.className = 'strength-bar-fill';
          if (score <= 2) {
            bar.style.width = '25%';
            bar.classList.add('strength-weak');
            label.textContent = 'Weak Password';
          } else if (score === 3) {
            bar.style.width = '55%';
            bar.classList.add('strength-fair');
            label.textContent = 'Fair Password';
          } else if (score === 4) {
            bar.style.width = '80%';
            bar.classList.add('strength-good');
            label.textContent = 'Good Password';
          } else {
            bar.style.width = '100%';
            bar.classList.add('strength-strong');
            label.textContent = 'Strong Password ✓';
          }
        }

        // Trigger confirm password check if confirm has value
        if (confirmPasswordInput && confirmPasswordInput.value) {
          checkPasswordMatch();
        }
      });
    }

    // 2. Confirm Password Match Checker
    function checkPasswordMatch() {
      if (!confirmPasswordInput || !passwordInput) return;
      const matchBadge = document.getElementById('passwordMatchBadge');
      if (!matchBadge) return;

      const p1 = passwordInput.value;
      const p2 = confirmPasswordInput.value;

      if (!p2) {
        matchBadge.style.display = 'none';
        return;
      }

      matchBadge.style.display = 'inline-flex';
      if (p1 === p2) {
        matchBadge.className = 'match-badge match-success';
        matchBadge.innerHTML = '✓ Passwords Match';
      } else {
        matchBadge.className = 'match-badge match-mismatch';
        matchBadge.innerHTML = '✕ Passwords do not match';
      }
    }

    if (confirmPasswordInput) {
      confirmPasswordInput.addEventListener('input', checkPasswordMatch);
    }

    // 3. Clear inline error highlights dynamically as the user types
    [fullNameInput, emailInput, ageInput, passwordInput, confirmPasswordInput, courseSelect].forEach(input => {
      if (!input) return;
      input.addEventListener('input', () => {
        if (input.classList.contains('is-invalid')) {
          input.classList.remove('is-invalid');
          const errorEl = document.getElementById(`${input.id}-error`);
          if (errorEl) errorEl.style.display = 'none';
        }
      });
    });
  }

  // ==========================================================================
  // Form Submission Handler (Dual Mode: Fetch API vs Native SSR POST)
  // ==========================================================================
  function initFormSubmission() {
    const form = document.getElementById('studentRegistrationForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      // In SSR Mode, allow natural form post to /register
      if (state.mode === 'ssr') {
        return true;
      }

      // In API Mode, intercept and handle asynchronously via fetch
      e.preventDefault();

      const submitBtn = document.getElementById('submitBtn');
      const submitText = submitBtn?.querySelector('.btn-text');
      const originalText = submitText ? submitText.textContent : 'Submit Registration';

      // Gather form fields
      const formData = {
        fullName: form.fullName?.value || '',
        email: form.email?.value || '',
        age: form.age?.value || '',
        course: form.course?.value || '',
        password: form.password?.value || '',
        confirmPassword: form.confirmPassword?.value || ''
      };

      // Set loading state
      if (submitBtn) {
        submitBtn.disabled = true;
        if (submitText) submitText.textContent = 'Processing Server Validation...';
      }

      // Clear previous error messages from DOM
      clearFormErrors();

      try {
        const { ok, status, data } = await apiFetch('/api/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(formData)
        });

        if (status === 201 && data.success) {
          // Success! Update UI
          showToast('Registration successful! Enrolled in memory.', 'success');
          
          // Clear password inputs
          if (form.password) form.password.value = '';
          if (form.confirmPassword) form.confirmPassword.value = '';

          // Update header badges
          const totalCount = data.totalRegistered || 1;
          document.querySelectorAll('.nav-badge').forEach(b => b.textContent = totalCount);

          // Render Success Modal
          displayRegistrationSuccessModal(data.student);
        } else if (status === 422) {
          // Server validation failed
          showToast(`Server validation rejected submission (${Object.keys(data.errors || {}).length} errors)`, 'error');
          renderFormErrors(data.errors || {});
          
          // Clear password inputs for security
          if (form.password) form.password.value = '';
          if (form.confirmPassword) form.confirmPassword.value = '';
        } else {
          showToast(`Unexpected server response: HTTP ${status}`, 'warning');
        }
      } catch (err) {
        showToast(`Network error: ${err.message}`, 'error');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          if (submitText) submitText.textContent = originalText;
        }
      }
    });
  }

  function clearFormErrors() {
    const summary = document.getElementById('errorSummary');
    if (summary) summary.remove();

    document.querySelectorAll('.form-control.is-invalid').forEach(el => el.classList.remove('is-invalid'));
    document.querySelectorAll('.field-error').forEach(el => el.remove());
  }

  function renderFormErrors(errors = {}) {
    const errorKeys = Object.keys(errors);
    if (errorKeys.length === 0) return;

    // 1. Render Top Error Summary Banner
    const cardBody = document.querySelector('.card-body');
    const form = document.getElementById('studentRegistrationForm');

    if (cardBody && form) {
      const summaryDiv = document.createElement('div');
      summaryDiv.className = 'alert alert-error';
      summaryDiv.id = 'errorSummary';
      summaryDiv.setAttribute('role', 'alert');

      const items = errorKeys
        .map(field => `<li><strong>${escapeHtml(field)}:</strong> ${escapeHtml(errors[field])}</li>`)
        .join('');

      summaryDiv.innerHTML = `
        <div class="alert-icon">⚠️</div>
        <div class="alert-content">
          <strong>Node.js Server-Side Validation Failed (${errorKeys.length} Error${errorKeys.length > 1 ? 's' : ''}):</strong>
          <p>The backend API strictly rejected this submission according to validation rules:</p>
          <ul class="alert-list">${items}</ul>
        </div>
      `;

      cardBody.insertBefore(summaryDiv, form);
      summaryDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // 2. Highlight individual fields and inject error messages
    errorKeys.forEach(field => {
      const input = document.getElementById(field);
      if (input) {
        input.classList.add('is-invalid');
        const formGroup = input.closest('.form-group');
        if (formGroup && !formGroup.querySelector('.field-error')) {
          const errP = document.createElement('p');
          errP.className = 'field-error';
          errP.id = `${field}-error`;
          errP.innerHTML = `<span class="error-bullet">✕</span> ${escapeHtml(errors[field])}`;
          formGroup.appendChild(errP);
        }
      }
    });
  }

  // ==========================================================================
  // Success Confirmation Modal (Frontend API Mode)
  // ==========================================================================
  function displayRegistrationSuccessModal(student) {
    let modal = document.getElementById('registrationSuccessModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'registrationSuccessModal';
      modal.className = 'custom-modal-backdrop';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="custom-modal-card">
        <div class="modal-header-band">
          <div class="modal-check-icon">✓</div>
          <h2 class="modal-title">Student Registration Successful!</h2>
          <p class="modal-sub">Frontend API successfully communicated with Node.js Backend.</p>
        </div>
        
        <div class="modal-body-content">
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
              <span class="details-label">Registered At</span>
              <span class="details-value">${escapeHtml(student.registeredAt)}</span>
            </div>
            <div class="details-row">
              <span class="details-label">Password Security</span>
              <span class="details-value"><span class="hash-badge">🔒 PBKDF2 SHA-512 (Hashed &amp; Salted)</span></span>
            </div>
          </div>

          <div class="security-box" style="margin-top: 1rem;">
            <div class="security-icon">🛡️</div>
            <div>
              <strong>Backend Security Guarantee:</strong> Plain-text password was cryptographically hashed on the Node.js server and never retained in plaintext.
            </div>
          </div>
        </div>

        <div class="modal-footer-actions">
          <button type="button" class="btn btn-primary" id="btnModalClose">
            + Register Another Student
          </button>
          <a href="/students" class="btn btn-secondary">
            View Registered Students Roster →
          </a>
        </div>
      </div>
    `;

    modal.style.display = 'flex';

    document.getElementById('btnModalClose')?.addEventListener('click', () => {
      modal.style.display = 'none';
      const form = document.getElementById('studentRegistrationForm');
      if (form) form.reset();
      clearFormErrors();
      const strengthContainer = document.getElementById('passwordStrengthContainer');
      if (strengthContainer) strengthContainer.style.display = 'none';
      const matchBadge = document.getElementById('passwordMatchBadge');
      if (matchBadge) matchBadge.style.display = 'none';
    });
  }

  // ==========================================================================
  // Interactive Students Roster Controller (on /students view)
  // ==========================================================================
  function initStudentsRoster() {
    const tableContainer = document.getElementById('studentsTableContainer');
    const searchInput = document.getElementById('studentSearchInput');
    const courseFilter = document.getElementById('studentCourseFilter');
    const btnRefresh = document.getElementById('btnRefreshStudents');
    const btnExportJson = document.getElementById('btnExportJson');
    const btnExportCsv = document.getElementById('btnExportCsv');

    if (!tableContainer) return;

    let localStudents = [];

    async function fetchStudentsFromBackend() {
      try {
        if (btnRefresh) {
          btnRefresh.classList.add('is-loading');
          btnRefresh.textContent = 'Refreshing...';
        }

        const { ok, data } = await apiFetch('/api/students');
        if (ok && data.success) {
          localStudents = data.students || [];
          renderStudentsTable(filterStudents(localStudents));
          
          // Update count badges
          document.querySelectorAll('.nav-badge').forEach(b => b.textContent = localStudents.length);
          const rosterCountEl = document.getElementById('rosterCountDisplay');
          if (rosterCountEl) rosterCountEl.textContent = localStudents.length;

          showToast(`Loaded ${localStudents.length} students from Backend API`, 'info');
        }
      } catch (err) {
        showToast('Failed to load students from Backend: ' + err.message, 'error');
      } finally {
        if (btnRefresh) {
          btnRefresh.classList.remove('is-loading');
          btnRefresh.textContent = '🔄 Refresh Live';
        }
      }
    }

    function filterStudents(list) {
      const q = (searchInput?.value || '').trim().toLowerCase();
      const course = courseFilter?.value || '';

      return list.filter(s => {
        const matchesQuery = !q || 
          s.fullName.toLowerCase().includes(q) || 
          s.email.toLowerCase().includes(q) || 
          s.id.toLowerCase().includes(q);
        const matchesCourse = !course || s.course === course;
        return matchesQuery && matchesCourse;
      });
    }

    function renderStudentsTable(list) {
      if (!list || list.length === 0) {
        tableContainer.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">👥</div>
            <h3 style="font-size: 1.25rem; font-weight: 700; color: var(--slate-800); margin-bottom: 0.5rem;">No Students Found</h3>
            <p style="margin-bottom: 1.5rem; max-width: 480px; margin-left: auto; margin-right: auto; color: var(--slate-600);">
              ${localStudents.length === 0 ? 'The in-memory database is currently empty.' : 'No students match your active filter criteria.'}
            </p>
            ${localStudents.length === 0 ? '<a href="/" class="btn btn-primary">+ Register First Student</a>' : ''}
          </div>
        `;
        return;
      }

      const rowsHtml = list.map((s, idx) => `
        <tr id="student-row-${escapeHtml(s.id)}">
          <td style="font-weight: 600; color: var(--slate-500);">${idx + 1}</td>
          <td><span class="student-id-badge">${escapeHtml(s.id)}</span></td>
          <td style="font-weight: 600; color: var(--slate-900);">${escapeHtml(s.fullName)}</td>
          <td>${escapeHtml(s.email)}</td>
          <td>${escapeHtml(String(s.age))}</td>
          <td>${escapeHtml(s.course)}</td>
          <td style="font-size: 0.8rem; color: var(--slate-500);">${escapeHtml(s.registeredAt)}</td>
          <td><span class="hash-badge">🔒 Protected</span></td>
          <td>
            <button class="btn-delete-student" data-id="${escapeHtml(s.id)}" data-name="${escapeHtml(s.fullName)}" title="Delete student via Backend API">
              🗑️
            </button>
          </td>
        </tr>
      `).join('\n');

      tableContainer.innerHTML = `
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
                <th>Security</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>
      `;

      // Attach delete handlers
      tableContainer.querySelectorAll('.btn-delete-student').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-id');
          const name = btn.getAttribute('data-name');
          if (!confirm(`Are you sure you want to delete student "${name}" (${id}) via Backend API?`)) {
            return;
          }

          try {
            btn.disabled = true;
            btn.textContent = '⏳';
            const { ok, data } = await apiFetch(`/api/students/${encodeURIComponent(id)}`, {
              method: 'DELETE'
            });

            if (ok && data.success) {
              showToast(`Removed student ${name} (${id})`, 'success');
              localStudents = localStudents.filter(s => s.id !== id);
              renderStudentsTable(filterStudents(localStudents));
              document.querySelectorAll('.nav-badge').forEach(b => b.textContent = localStudents.length);
              const rosterCountEl = document.getElementById('rosterCountDisplay');
              if (rosterCountEl) rosterCountEl.textContent = localStudents.length;
            } else {
              showToast(data.message || 'Failed to delete student', 'error');
              btn.disabled = false;
              btn.textContent = '🗑️';
            }
          } catch (err) {
            showToast('Delete request failed: ' + err.message, 'error');
            btn.disabled = false;
            btn.textContent = '🗑️';
          }
        });
      });
    }

    // Attach search and filter events
    searchInput?.addEventListener('input', () => renderStudentsTable(filterStudents(localStudents)));
    courseFilter?.addEventListener('change', () => renderStudentsTable(filterStudents(localStudents)));
    btnRefresh?.addEventListener('click', fetchStudentsFromBackend);

    // Export Handlers
    btnExportJson?.addEventListener('click', () => {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(localStudents, null, 2));
      const a = document.createElement('a');
      a.setAttribute('href', dataStr);
      a.setAttribute('download', `students_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(a);
      a.click();
      a.remove();
      showToast('Exported students as JSON', 'info');
    });

    btnExportCsv?.addEventListener('click', () => {
      if (localStudents.length === 0) {
        showToast('No students to export', 'warning');
        return;
      }
      const headers = ['ID', 'Full Name', 'Email', 'Age', 'Course', 'Registered At'];
      const rows = localStudents.map(s => [
        `"${s.id}"`,
        `"${s.fullName.replace(/"/g, '""')}"`,
        `"${s.email}"`,
        s.age,
        `"${s.course}"`,
        `"${s.registeredAt}"`
      ]);
      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      const a = document.createElement('a');
      a.setAttribute('href', encodeURI(csvContent));
      a.setAttribute('download', `students_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(a);
      a.click();
      a.remove();
      showToast('Exported students as CSV', 'info');
    });

    // Initial load from backend API
    fetchStudentsFromBackend();
  }

  // ==========================================================================
  // Inspector Drawer Toggle & Quick Actions
  // ==========================================================================
  function initInspectorUI() {
    const inspectorDrawer = document.getElementById('liveInspectorDrawer');
    const toggleBtn = document.getElementById('btnToggleInspector');
    const closeBtn = document.getElementById('btnCloseInspector');
    const clearBtn = document.getElementById('btnClearInspector');
    const pingHealthBtn = document.getElementById('btnPingHealth');
    const getStudentsBtn = document.getElementById('btnGetStudents');
    const getCoursesBtn = document.getElementById('btnGetCourses');

    if (!inspectorDrawer) return;

    function setInspectorOpen(open) {
      state.inspectorOpen = open;
      inspectorDrawer.classList.toggle('is-open', open);
    }

    toggleBtn?.addEventListener('click', () => setInspectorOpen(!state.inspectorOpen));
    closeBtn?.addEventListener('click', () => setInspectorOpen(false));

    clearBtn?.addEventListener('click', () => {
      state.inspectorLogs = [];
      renderInspectorLogs();
      showToast('Cleared Inspector logs', 'info');
    });

    pingHealthBtn?.addEventListener('click', () => {
      setInspectorOpen(true);
      apiFetch('/api/health');
    });

    getStudentsBtn?.addEventListener('click', () => {
      setInspectorOpen(true);
      apiFetch('/api/students');
    });

    getCoursesBtn?.addEventListener('click', () => {
      setInspectorOpen(true);
      apiFetch('/api/courses');
    });

    renderInspectorLogs();
  }

  // ==========================================================================
  // Initialize Everything on DOMContentLoaded
  // ==========================================================================
  document.addEventListener('DOMContentLoaded', () => {
    initModeSwitcher();
    initInteractiveValidation();
    initFormSubmission();
    initStudentsRoster();
    initInspectorUI();
  });

})();
