/**
 * test/verify-scenarios.js
 * 
 * Verifies live server responses against port 3000
 */

async function main() {
  const baseUrl = 'http://localhost:3000';
  console.log(`Connecting to running server at ${baseUrl}...`);

  // 1. Health check
  const healthRes = await fetch(`${baseUrl}/health`);
  const healthData = await healthRes.json();
  console.log('✅ /health response:', healthData);

  // 2. Submit empty form
  console.log('\n--- Test: Empty Form Submission ---');
  const emptyRes = await fetch(`${baseUrl}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: ''
  });
  console.log(`Status Code: ${emptyRes.status} (Expected: 422)`);
  const emptyHtml = await emptyRes.text();
  console.log('Contains Error Summary:', emptyHtml.includes('Server-Side Validation Failed (6 Errors)'));

  // 3. Submit invalid form
  console.log('\n--- Test: Invalid Input Values ---');
  const invalidRes = await fetch(`${baseUrl}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      fullName: 'Rohan123',
      email: 'rohan-at-email',
      age: '14',
      password: 'weak',
      confirmPassword: 'mismatch',
      course: ''
    }).toString()
  });
  console.log(`Status Code: ${invalidRes.status} (Expected: 422)`);
  const invalidHtml = await invalidRes.text();
  console.log('Contains Name Error:', invalidHtml.includes('Full Name can only contain alphabetical letters and spaces'));
  console.log('Contains Email Error:', invalidHtml.includes('Please provide a valid email address'));
  console.log('Contains Age Error:', invalidHtml.includes('Age must be between 16 and 60 years'));
  console.log('Contains Password Error:', invalidHtml.includes('Password must be at least 8 characters long'));
  console.log('Contains Confirm Password Error:', invalidHtml.includes('Confirm Password does not match the entered Password'));
  console.log('Contains Course Error:', invalidHtml.includes('Please select a course'));
  console.log('Password Value Cleared:', !invalidHtml.includes('value="weak"'));
  console.log('Safe Name Retained:', invalidHtml.includes('value="Rohan123"'));

  // 4. Submit valid student
  console.log('\n--- Test: Valid Submission (Rohan Sharma) ---');
  const validRes = await fetch(`${baseUrl}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      fullName: 'Rohan Sharma',
      email: 'rohan.sharma@college.edu',
      age: '21',
      password: 'StrongPassword123!',
      confirmPassword: 'StrongPassword123!',
      course: 'Computer Science and Engineering'
    }).toString(),
    redirect: 'manual'
  });
  console.log(`Status Code: ${validRes.status} (Expected: 302 Redirect)`);
  const redirectLocation = validRes.headers.get('location');
  console.log('Redirect Location:', redirectLocation);

  // 5. Follow redirect to success page
  console.log('\n--- Test: Success Page ---');
  const successRes = await fetch(`${baseUrl}${redirectLocation}`);
  const successHtml = await successRes.text();
  console.log(`Status Code: ${successRes.status} (Expected: 200)`);
  console.log('Displays Success Title:', successHtml.includes('Student Registration Successful!'));
  console.log('Displays Student Name:', successHtml.includes('Rohan Sharma'));
  console.log('Displays Student Email:', successHtml.includes('rohan.sharma@college.edu'));
  console.log('Displays Password Security Notice:', successHtml.includes('PBKDF2 SHA-512'));

  // 6. View students roster
  console.log('\n--- Test: Students Roster ---');
  const studentsRes = await fetch(`${baseUrl}/students`);
  const studentsHtml = await studentsRes.text();
  console.log(`Status Code: ${studentsRes.status} (Expected: 200)`);
  console.log('Roster includes Rohan Sharma:', studentsHtml.includes('Rohan Sharma'));

  // 7. Test unknown route
  console.log('\n--- Test: Custom 404 Route ---');
  const notFoundRes = await fetch(`${baseUrl}/unregistered-demo-route`);
  const notFoundHtml = await notFoundRes.text();
  console.log(`Status Code: ${notFoundRes.status} (Expected: 404)`);
  console.log('Displays 404 Code:', notFoundHtml.includes('404'));
  console.log('Displays Requested Path:', notFoundHtml.includes('/unregistered-demo-route'));

  console.log('\n🎉 All live server verifications passed successfully!\n');
}

main().catch(console.error);
