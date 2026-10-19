/**
 * test/test-validation.js
 * 
 * Automated Test Suite for Student Registration System
 * Tests all required validation rules, routes, and security constraints.
 */

process.env.NODE_ENV = 'test';
const http = require('http');
const app = require('../app');

let server;
let baseUrl;

// Test Runner Helper
let passedCount = 0;
let failedCount = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passedCount++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    if (details) console.error(`     Details: ${details}`);
    failedCount++;
  }
}

async function runTests() {
  console.log('\n====================================================');
  console.log('🧪 Starting Automated Validation & Route Test Suite');
  console.log('====================================================\n');

  // Start temporary test server on random open port
  await new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      baseUrl = `http://127.0.0.1:${address.port}`;
      console.log(`Test server running at ${baseUrl}\n`);
      resolve();
    });
  });

  try {
    // ---------------------------------------------------------
    // Test 1: GET / (Registration Form Page)
    // ---------------------------------------------------------
    console.log('--- Suite 1: Navigation & Form Loading ---');
    {
      const res = await fetch(`${baseUrl}/`);
      const body = await res.text();
      assert(res.status === 200, 'GET / returns HTTP 200');
      assert(body.includes('Student Registration Form'), 'GET / renders student registration form');
      assert(body.includes('novalidate'), 'Form contains "novalidate" to demonstrate server-side validation');
    }

    // ---------------------------------------------------------
    // Test 2: POST /register - Empty Form Submission
    // ---------------------------------------------------------
    console.log('\n--- Suite 2: Server-Side Field Validations ---');
    {
      const res = await fetch(`${baseUrl}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({}).toString()
      });
      const body = await res.text();
      assert(res.status === 422, 'Empty submission returns HTTP 422 (Unprocessable Entity)');
      assert(body.includes('Full Name is required'), 'Identifies missing Full Name');
      assert(body.includes('Email Address is required'), 'Identifies missing Email');
      assert(body.includes('Age is required'), 'Identifies missing Age');
      assert(body.includes('Password is required'), 'Identifies missing Password');
      assert(body.includes('Confirm Password is required'), 'Identifies missing Confirm Password');
      assert(body.includes('Please select a course'), 'Identifies missing Course');
    }

    // ---------------------------------------------------------
    // Test 3: POST /register - Invalid Full Name (Numbers/Symbols or Too Short)
    // ---------------------------------------------------------
    {
      const res = await fetch(`${baseUrl}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          fullName: 'J0hn D0e 123!',
          email: 'valid@college.edu',
          age: '20',
          password: 'Password123!',
          confirmPassword: 'Password123!',
          course: 'Computer Science and Engineering'
        }).toString()
      });
      const body = await res.text();
      assert(res.status === 422, 'Invalid Full Name with symbols/digits rejected (HTTP 422)');
      assert(body.includes('Full Name can only contain alphabetical letters and spaces'), 'Full Name rejects non-alphabetic characters');
    }

    // ---------------------------------------------------------
    // Test 4: POST /register - Invalid Email Formats
    // ---------------------------------------------------------
    {
      const res = await fetch(`${baseUrl}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          fullName: 'Alex Morgan',
          email: 'invalid-email-format@',
          age: '21',
          password: 'Password123!',
          confirmPassword: 'Password123!',
          course: 'Computer Science and Engineering'
        }).toString()
      });
      const body = await res.text();
      assert(res.status === 422, 'Malformed email rejected (HTTP 422)');
      assert(body.includes('Please provide a valid email address'), 'Displays proper email format error');
    }

    // ---------------------------------------------------------
    // Test 5: POST /register - Age Boundaries (Below 16)
    // ---------------------------------------------------------
    {
      const res = await fetch(`${baseUrl}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          fullName: 'Young Student',
          email: 'young@college.edu',
          age: '15',
          password: 'Password123!',
          confirmPassword: 'Password123!',
          course: 'Information Technology'
        }).toString()
      });
      const body = await res.text();
      assert(res.status === 422, 'Age below 16 (15) rejected (HTTP 422)');
      assert(body.includes('Age must be between 16 and 60 years'), 'Enforces lower age limit (16)');
    }

    // ---------------------------------------------------------
    // Test 6: POST /register - Age Boundaries (Above 60)
    // ---------------------------------------------------------
    {
      const res = await fetch(`${baseUrl}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          fullName: 'Senior Scholar',
          email: 'senior@college.edu',
          age: '61',
          password: 'Password123!',
          confirmPassword: 'Password123!',
          course: 'Information Technology'
        }).toString()
      });
      const body = await res.text();
      assert(res.status === 422, 'Age above 60 (61) rejected (HTTP 422)');
      assert(body.includes('Age must be between 16 and 60 years'), 'Enforces upper age limit (60)');
    }

    // ---------------------------------------------------------
    // Test 7: POST /register - Password Shorter than 8 Characters
    // ---------------------------------------------------------
    {
      const res = await fetch(`${baseUrl}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          fullName: 'Jane Smith',
          email: 'jane@college.edu',
          age: '22',
          password: 'Ab1!',
          confirmPassword: 'Ab1!',
          course: 'Computer Science and Engineering'
        }).toString()
      });
      const body = await res.text();
      assert(res.status === 422, 'Password < 8 characters rejected (HTTP 422)');
      assert(body.includes('Password must be at least 8 characters long'), 'Enforces min 8 characters rule');
    }

    // ---------------------------------------------------------
    // Test 8: POST /register - Password Missing Uppercase or Number
    // ---------------------------------------------------------
    {
      const res = await fetch(`${baseUrl}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          fullName: 'Jane Smith',
          email: 'jane@college.edu',
          age: '22',
          password: 'password!@#', // No uppercase and no number
          confirmPassword: 'password!@#',
          course: 'Computer Science and Engineering'
        }).toString()
      });
      const body = await res.text();
      assert(res.status === 422, 'Password missing uppercase/number rejected (HTTP 422)');
      assert(body.includes('Password must contain at least one uppercase letter'), 'Enforces uppercase requirement');
    }

    // ---------------------------------------------------------
    // Test 9: POST /register - Mismatched Passwords
    // ---------------------------------------------------------
    {
      const res = await fetch(`${baseUrl}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          fullName: 'Jane Smith',
          email: 'jane@college.edu',
          age: '22',
          password: 'Password123!',
          confirmPassword: 'Password999!',
          course: 'Computer Science and Engineering'
        }).toString()
      });
      const body = await res.text();
      assert(res.status === 422, 'Mismatched passwords rejected (HTTP 422)');
      assert(body.includes('Confirm Password does not match'), 'Enforces confirm password equality');
    }

    // ---------------------------------------------------------
    // Test 10: POST /register - Invalid Course (Not in Whitelist)
    // ---------------------------------------------------------
    {
      const res = await fetch(`${baseUrl}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          fullName: 'Jane Smith',
          email: 'jane@college.edu',
          age: '22',
          password: 'Password123!',
          confirmPassword: 'Password123!',
          course: 'Hacking 101 Unapproved Course'
        }).toString()
      });
      const body = await res.text();
      assert(res.status === 422, 'Arbitrary / unapproved course option rejected (HTTP 422)');
      assert(body.includes('Selected course is invalid'), 'Enforces course whitelist');
    }

    // ---------------------------------------------------------
    // Test 11: Security - Form Repopulation (Passwords never repopulated)
    // ---------------------------------------------------------
    console.log('\n--- Suite 3: Security & Input Preservation ---');
    {
      const res = await fetch(`${baseUrl}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          fullName: 'Robert Frost',
          email: 'rfrost@college.edu',
          age: '24',
          password: 'SecretPassword123!',
          confirmPassword: 'MismatchPassword!',
          course: 'Mechanical Engineering'
        }).toString()
      });
      const body = await res.text();
      assert(body.includes('value="Robert Frost"'), 'Safe field Full Name is preserved');
      assert(body.includes('value="rfrost@college.edu"'), 'Safe field Email is preserved');
      assert(body.includes('value="24"'), 'Safe field Age is preserved');
      assert(!body.includes('SecretPassword123!'), 'Security: Password input value is NEVER repopulated in HTML');
      assert(!body.includes('MismatchPassword!'), 'Security: Confirm Password input value is NEVER repopulated');
    }

    // ---------------------------------------------------------
    // Test 12: POST /register - Valid Submission & PRG Redirect
    // ---------------------------------------------------------
    console.log('\n--- Suite 4: Valid Submissions & Data Flow ---');
    let registeredStudentId = null;
    {
      const res = await fetch(`${baseUrl}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          fullName: 'Alice Johnson',
          email: 'alice.johnson@college.edu',
          age: '20',
          password: 'SecurePassword123!',
          confirmPassword: 'SecurePassword123!',
          course: 'Computer Science and Engineering'
        }).toString(),
        redirect: 'manual' // Prevent following redirect automatically to inspect 302
      });

      assert(res.status === 302, 'Valid registration triggers HTTP 302 Redirect (PRG Pattern)');
      const location = res.headers.get('location');
      assert(location && location.startsWith('/success?id=STU-'), 'Redirects to /success with assigned student ID', location);
      
      if (location) {
        const urlParams = new URL(location, baseUrl).searchParams;
        registeredStudentId = urlParams.get('id');
      }
    }

    // ---------------------------------------------------------
    // Test 13: GET /success?id=... (Render Registration Details)
    // ---------------------------------------------------------
    {
      const res = await fetch(`${baseUrl}/success?id=${registeredStudentId}`);
      const body = await res.text();
      assert(res.status === 200, 'GET /success with valid ID returns HTTP 200');
      assert(body.includes(registeredStudentId), 'Confirmation page displays Student ID');
      assert(body.includes('Alice Johnson'), 'Confirmation page displays Student Full Name');
      assert(body.includes('alice.johnson@college.edu'), 'Confirmation page displays normalized Student Email');
      assert(!body.includes('SecurePassword123!'), 'Plain-text password is NOT displayed on success page');
      assert(body.includes('PBKDF2 SHA-512'), 'Displays password cryptographic hashing security confirmation');
    }

    // ---------------------------------------------------------
    // Test 14: GET /success Directly Without Valid ID (Guarded Access)
    // ---------------------------------------------------------
    {
      const res = await fetch(`${baseUrl}/success`);
      const body = await res.text();
      assert(res.status === 200, 'GET /success directly without ID handles gracefully (HTTP 200)');
      assert(body.includes('No Active Registration Found'), 'Displays restricted state notice when accessed directly');
    }

    // ---------------------------------------------------------
    // Test 15: GET /students (Roster View)
    // ---------------------------------------------------------
    {
      const res = await fetch(`${baseUrl}/students`);
      const body = await res.text();
      assert(res.status === 200, 'GET /students returns HTTP 200');
      assert(body.includes('Alice Johnson'), 'Registered student is listed in the roster');
      assert(!body.includes('SecurePassword123!'), 'No plain-text passwords leaked in students roster');
    }

    // ---------------------------------------------------------
    // Test 16: GET /students?format=json (API View)
    // ---------------------------------------------------------
    {
      const res = await fetch(`${baseUrl}/students?format=json`);
      const json = await res.json();
      assert(res.status === 200, 'GET /students?format=json returns HTTP 200');
      assert(json.success === true, 'JSON response has success: true');
      assert(json.count >= 1, 'JSON response reports enrolled student count');
      assert(json.students[0].passwordHash === undefined, 'JSON response excludes password hashes');
      assert(json.students[0].password === undefined, 'JSON response excludes plain-text passwords');
    }

    // ---------------------------------------------------------
    // Test 17: Duplicate Email Rejection
    // ---------------------------------------------------------
    {
      const res = await fetch(`${baseUrl}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          fullName: 'Another Person',
          email: 'ALICE.JOHNSON@college.edu', // Case insensitive duplication check
          age: '23',
          password: 'SecurePassword123!',
          confirmPassword: 'SecurePassword123!',
          course: 'Information Technology'
        }).toString()
      });
      const body = await res.text();
      assert(res.status === 422, 'Duplicate email registration rejected (HTTP 422)');
      assert(body.includes('already registered'), 'Proper duplicate email warning message displayed');
    }

    // ---------------------------------------------------------
    // Test 18: GET /health (Server Health Status)
    // ---------------------------------------------------------
    console.log('\n--- Suite 5: System & Routing Checks ---');
    {
      const res = await fetch(`${baseUrl}/health`);
      const json = await res.json();
      assert(res.status === 200, 'GET /health returns HTTP 200');
      assert(json.status === 'UP', 'Health check reports status: UP');
      assert(typeof json.uptimeSeconds === 'number', 'Health check reports uptime');
    }

    // ---------------------------------------------------------
    // Test 19: Unknown Route - Custom 404 Page
    // ---------------------------------------------------------
    {
      const res = await fetch(`${baseUrl}/non-existent-exam-route`);
      const body = await res.text();
      assert(res.status === 404, 'Unknown URL returns HTTP 404');
      assert(body.includes('Page Not Found'), 'Renders custom 404 page');
      assert(body.includes('/non-existent-exam-route'), '404 page mentions requested URL safely');
    }

    // ---------------------------------------------------------
    // Test 20: Excessively Large Body Payload (Request Size Limit)
    // ---------------------------------------------------------
    {
      const hugeString = 'A'.repeat(15 * 1024); // 15 KB (exceeds 10KB limit)
      const res = await fetch(`${baseUrl}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `fullName=${hugeString}`
      });
      assert(res.status === 413, 'Excessively large body rejected with HTTP 413 (Payload Too Large)');
    }

  } finally {
    // Teardown server
    await new Promise((resolve) => server.close(resolve));
    console.log('\n====================================================');
    console.log(`Test Execution Completed: ${passedCount} Passed, ${failedCount} Failed`);
    console.log('====================================================\n');
    process.exit(failedCount > 0 ? 1 : 0);
  }
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  if (server) server.close();
  process.exit(1);
});
