const fs = require('fs');
const path = require('path');

// Where your password file lives
const filePath = path.join(__dirname, '../public/userPasswords.js');

// Read the file
let content = fs.readFileSync(filePath, 'utf8');

// Look for the object and replace all passwords with stars
// This finds "key": "value" and replaces value with "********"
content = content.replace(/:\s*(['"`])(?:(?!\1).)*\1/gm, ': "********"');

// Save as a new file
const maskedPath = path.join(__dirname, '../public/userPasswords_masked.js');
fs.writeFileSync(maskedPath, content, 'utf8');

console.log('✅ Masked file created at', maskedPath);
