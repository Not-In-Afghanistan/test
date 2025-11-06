// server/maskPasswords.js
// Overwrite the original userPasswords file with a masked version (creates backup .bak).
// Usage:
//   node server/maskPasswords.js         -> mask & overwrite (creates backup .bak)
//   node server/maskPasswords.js --restore -> restore original from .bak

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const doRestore = args.includes('--restore');

const clientDir = path.join(__dirname, '../public');
const jsonPath = path.join(clientDir, 'userPasswords.json');
const jsPath = path.join(clientDir, 'userPasswords.js');

// Choose the file that exists
let targetPath = null;
if (fs.existsSync(jsonPath)) targetPath = jsonPath;
else if (fs.existsSync(jsPath)) targetPath = jsPath;
else {
  console.error('No userPasswords.json or userPasswords.js found in client/. Create one or adjust the path.');
  process.exit(1);
}

const backupPath = targetPath + '.bak';

if (doRestore) {
  if (!fs.existsSync(backupPath)) {
    console.error('No backup found to restore:', backupPath);
    process.exit(1);
  }
  fs.copyFileSync(backupPath, targetPath);
  console.log('✅ Restored original file from', backupPath);
  process.exit(0);
}

// Make backup first (if not already backed up)
if (!fs.existsSync(backupPath)) {
  fs.copyFileSync(targetPath, backupPath);
  console.log('✅ Backup created at', backupPath);
} else {
  console.log('⚠️ Backup already exists at', backupPath, '(keeping it)');
}

// Read original content
const content = fs.readFileSync(targetPath, 'utf8');

let newContent = content;

if (targetPath.endsWith('.json')) {
  // For JSON: parse then replace all values with "********"
  try {
    const data = JSON.parse(content);
    const masked = {};
    for (const k of Object.keys(data)) masked[k] = '********';
    newContent = JSON.stringify(masked, null, 2);
  } catch (err) {
    console.error('Failed to parse JSON file:', err.message);
    process.exit(1);
  }
} else {
  // For JS: naive but practical replacement
  // Finds string values in object literal and replaces them with "********"
  // e.g. "id": "password"  or 'id': 'password'  or `id`: `password`
  const objRegex = /const\s+userPasswords\s*=\s*({[\s\S]*?});?/m;
  const match = content.match(objRegex);
  if (!match) {
    console.error('Could not find `const userPasswords = { ... }` in', targetPath);
    process.exit(1);
  }
  const objText = match[1];
  const maskedObjText = objText.replace(/:\s*(['"`])(?:(?!\1).)*\1/gm, ': "********"');
  newContent = content.replace(objRegex, `const userPasswords = ${maskedObjText};`);
}

// Overwrite original with masked content
fs.writeFileSync(targetPath, newContent, 'utf8');
console.log('✅ Overwrote', targetPath, 'with masked passwords (stars).');
console.log('Backup kept at', backupPath, ' — DO NOT commit the .bak to a public repo.');
