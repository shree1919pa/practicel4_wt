/**
 * app.js
 * 
 * Main Server Entry Point
 * Student Registration System Demonstrating Server-Side Validation
 * 
 * Web Technology Practical
 */

const express = require('express');
const path = require('path');
const fs = require('fs');

const { router: studentRoutes } = require('./routes/studentRoutes');

const app = express();

// ============================================================================
// Configuration & Environment
// ============================================================================
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

// ============================================================================
// Security & Body Parsing Middleware
// ============================================================================
// Enforce body size limits (10kb) to reject excessively large request payloads
app.use(express.urlencoded({ extended: false, limit: '10kb' }));
app.use(express.json({ limit: '10kb' }));

// Serve static assets (CSS, images) from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Simple request logger for practical demonstration
app.use((req, res, next) => {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  next();
});

// ============================================================================
// Mount Modular Application Routes
// ============================================================================
app.use('/', studentRoutes);

// ============================================================================
// Custom 404 Not Found Middleware
// ============================================================================
app.use((req, res) => {
  const viewPath = path.join(__dirname, 'views', '404.html');
  try {
    let notFoundHtml = fs.readFileSync(viewPath, 'utf8');
    // Sanitize requested URL to avoid XSS
    const safeUrl = String(req.originalUrl).replace(/[&<>"']/g, c => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[c]));
    notFoundHtml = notFoundHtml.replace('{{REQUESTED_PATH}}', safeUrl);
    res.status(404).send(notFoundHtml);
  } catch (err) {
    res.status(404).send('<h1>404 - Page Not Found</h1>');
  }
});

// ============================================================================
// Centralized Error Handling Middleware
// ============================================================================
app.use((err, req, res, next) => {
  // Handle payload too large error (express body-parser limit exceeded)
  if (err.type === 'entity.too.large') {
    return res.status(413).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>413 Payload Too Large</title>
        <link rel="stylesheet" href="/style.css">
      </head>
      <body>
        <main class="main-content" style="max-width: 600px; margin-top: 4rem;">
          <div class="card">
            <div class="card-body" style="text-align: center;">
              <div style="font-size: 3rem; margin-bottom: 1rem;">🛑</div>
              <h2 class="card-title" style="color: var(--danger);">413 Payload Too Large</h2>
              <p style="margin: 1rem 0; color: var(--slate-600);">
                The request body submitted exceeds the server maximum allowed limit (10KB).
              </p>
              <a href="/" class="btn btn-primary">Return to Registration Form</a>
            </div>
          </div>
        </main>
      </body>
      </html>
    `);
  }

  console.error('Unhandled Server Error:', err);
  res.status(500).send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>500 Internal Server Error</title>
      <link rel="stylesheet" href="/style.css">
    </head>
    <body>
      <main class="main-content" style="max-width: 600px; margin-top: 4rem;">
        <div class="card">
          <div class="card-body" style="text-align: center;">
            <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
            <h2 class="card-title">500 - Internal Server Error</h2>
            <p style="margin: 1rem 0; color: var(--slate-600);">An unexpected error occurred on the server.</p>
            <a href="/" class="btn btn-primary">Return to Home</a>
          </div>
        </div>
      </main>
    </body>
    </html>
  `);
});

// ============================================================================
// Server Listener
// ============================================================================
if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(PORT, HOST, () => {
    console.log('====================================================');
    console.log('🚀 Student Registration System is running!');
    console.log(`🌐 Local URL:     http://localhost:${PORT}`);
    console.log(`📡 Network Host:  http://${HOST}:${PORT}`);
    console.log(`🛡️  Validation:   100% Server-Side Enforced`);
    console.log('====================================================');
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n❌ Error: Port ${PORT} is already in use by another running process.`);
      console.error(`💡 Tip: Close any other terminal running the server, or start with another port:`);
      console.error(`   $env:PORT=3001; npm start   (PowerShell)\n`);
    } else {
      console.error('Server error:', err);
    }
    process.exit(1);
  });
}

module.exports = app;
