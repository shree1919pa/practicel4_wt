/**
 * validators/studentValidator.js
 * 
 * Server-Side Validation Module for Student Registration
 * 
 * Rules enforced:
 * 1. Full Name: Required, 3–50 chars, letters and spaces only.
 * 2. Email Address: Required, valid email format, normalized to lowercase.
 * 3. Age: Required, positive integer strictly between 16 and 60.
 * 4. Password: Required, min 8 chars, at least 1 uppercase, 1 lowercase, 1 digit, 1 special char.
 * 5. Confirm Password: Required, must strictly match password.
 * 6. Course: Required, must be in the predefined whitelist of valid courses.
 * 
 * Note: Browser validation is never trusted. All checks are verified on the Node.js server.
 */

// Predefined list of legitimate courses offered for registration
const ALLOWED_COURSES = [
  'Computer Science and Engineering',
  'Information Technology',
  'Artificial Intelligence & Data Science',
  'Electronics & Telecommunication Engineering',
  'Mechanical Engineering',
  'Civil Engineering'
];

/**
 * Validates student registration form data.
 * 
 * @param {Object} rawData - Incoming request body fields
 * @param {Array} existingStudents - Current in-memory registered students array (for uniqueness checks)
 * @returns {Object} { isValid: boolean, errors: Object, sanitized: Object }
 */
function validateStudentRegistration(rawData = {}, existingStudents = []) {
  const errors = {};
  
  // Guard against non-object inputs
  const data = (typeof rawData === 'object' && rawData !== null) ? rawData : {};

  // ---------------------------------------------------------
  // 1. Sanitize & Normalize Inputs (Trim text, lowercase email)
  // ---------------------------------------------------------
  const fullName = typeof data.fullName === 'string' ? data.fullName.trim() : '';
  const email = typeof data.email === 'string' ? data.email.trim().toLowerCase() : '';
  const ageRaw = typeof data.age === 'string' ? data.age.trim() : (typeof data.age === 'number' ? String(data.age) : '');
  const password = typeof data.password === 'string' ? data.password : '';
  const confirmPassword = typeof data.confirmPassword === 'string' ? data.confirmPassword : '';
  const course = typeof data.course === 'string' ? data.course.trim() : '';

  // ---------------------------------------------------------
  // 2. Validate Full Name
  // ---------------------------------------------------------
  if (!fullName) {
    errors.fullName = 'Full Name is required.';
  } else if (fullName.length < 3 || fullName.length > 50) {
    errors.fullName = 'Full Name must be between 3 and 50 characters in length.';
  } else if (!/^[A-Za-z\s]+$/.test(fullName)) {
    errors.fullName = 'Full Name can only contain alphabetical letters and spaces.';
  }

  // ---------------------------------------------------------
  // 3. Validate Email Address
  // ---------------------------------------------------------
  // Standard RFC-compliant email regular expression
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  if (!email) {
    errors.email = 'Email Address is required.';
  } else if (email.length > 100) {
    errors.email = 'Email Address cannot exceed 100 characters.';
  } else if (!emailRegex.test(email)) {
    errors.email = 'Please provide a valid email address (e.g., student@college.edu).';
  } else if (Array.isArray(existingStudents) && existingStudents.some(s => s.email === email)) {
    errors.email = 'A student with this email address is already registered.';
  }

  // ---------------------------------------------------------
  // 4. Validate Age
  // ---------------------------------------------------------
  if (!ageRaw) {
    errors.age = 'Age is required.';
  } else if (!/^\d+$/.test(ageRaw)) {
    // Rejects decimals, negative signs, and non-numeric characters
    errors.age = 'Age must be a valid whole number (integer).';
  } else {
    const ageNum = parseInt(ageRaw, 10);
    if (ageNum < 16 || ageNum > 60) {
      errors.age = 'Age must be between 16 and 60 years.';
    }
  }

  // ---------------------------------------------------------
  // 5. Validate Password
  // ---------------------------------------------------------
  if (!password) {
    errors.password = 'Password is required.';
  } else if (password.length < 8) {
    errors.password = 'Password must be at least 8 characters long.';
  } else if (password.length > 128) {
    errors.password = 'Password cannot exceed 128 characters.';
  } else if (!/[A-Z]/.test(password)) {
    errors.password = 'Password must contain at least one uppercase letter (A-Z).';
  } else if (!/[a-z]/.test(password)) {
    errors.password = 'Password must contain at least one lowercase letter (a-z).';
  } else if (!/[0-9]/.test(password)) {
    errors.password = 'Password must contain at least one numeric digit (0-9).';
  } else if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password)) {
    errors.password = 'Password must contain at least one special character (e.g. !@#$%^&*).';
  }

  // ---------------------------------------------------------
  // 6. Validate Confirm Password
  // ---------------------------------------------------------
  if (!confirmPassword) {
    errors.confirmPassword = 'Confirm Password is required.';
  } else if (password !== confirmPassword) {
    errors.confirmPassword = 'Confirm Password does not match the entered Password.';
  }

  // ---------------------------------------------------------
  // 7. Validate Course Name
  // ---------------------------------------------------------
  if (!course) {
    errors.course = 'Please select a course.';
  } else if (!ALLOWED_COURSES.includes(course)) {
    errors.course = 'Selected course is invalid. Please pick a course from the allowed list.';
  }

  // ---------------------------------------------------------
  // 8. Sanitized output (Never include password fields!)
  // ---------------------------------------------------------
  const sanitized = {
    fullName,
    email,
    age: ageRaw,
    course
  };

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitized
  };
}

module.exports = {
  ALLOWED_COURSES,
  validateStudentRegistration
};
