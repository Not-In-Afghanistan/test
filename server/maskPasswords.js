// server/maskPasswords.js
// Usage:
//   node server/maskPasswords.js         -> create masked file or overwrite original (with backup)
//   node server/maskPasswords.js --overwrite  -> overwrite original file (makes .bak)
//   node server/maskPasswords.js --restore    -> restore original from .bak

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const doRestore = args.includes('--restore');
const doOverwrite = args.includes('--overwrite');

// Adjust this to the file you actually use
const clientDir = path.join(__dirname, '../client');
const jsonPath = path.join(clientDir, 'userPasswords.json');
const jsPath = path.join(clientDir, 'userPasswords.js');

// Prefer JSON if it exists, else fall back to JS
let targetPath;
if (fs.existsSync(jsonPath)) targetPath = jsonPath;
else if (fs.existsSync(jsPath)) targetPath = jsPath;
else {
  console.error('No userPasswords.json or userPasswords.js found in client/. Create one or adjust the script path.');
  process.exit(1);
}

const backupPath = targetPath + '.bak';
const maskedPath = targetPath.replace(/(\.json|\.js)$/, '_masked$1');

if (doRestore) {
  if (!fs.existsSync(backupPath)) {
    console.error('No backup (.bak) found to restore.');
    process.exit(1);
  }
  fs.copyFileSync(backupPath, targetPath);
  console.log('✅ Restored original file from', backupPath);
  process.exit(0);
}

// Read file
const content = fs.readFileSync(targetPath, 'utf8');

// If JSON file: parse and mask values
if (targetPath.endsWith('.json')) {
  const data = JSON.parse(content);
  const masked = {};
  for (const k of Object.keys(data)) masked[k] = '********';
  fs.writeFileSync(maskedPath, JSON.stringify(masked, null, 2), 'utf8');
  console.log('✅ Masked JSON written to', maskedPath);

  if (doOverwrite) {
    // backup original then overwrite
    fs.copyFileSync(targetPath, backupPath);
    fs.copyFileSync(maskedPath, targetPath);
    console.log('✅ Original overwritten (backup saved to', backupPath + ')');
  }

  process.exit(0);
}

// If JS file: try to locate object and replace string values with stars
if (targetPath.endsWith('.js')) {
  // Very simple heuristics: finds the object literal assigned to userPasswords
  // e.g. const userPasswords = { "id": "pw", ... };
  const objRegex = /const\s+userPasswords\s*=\s*({[\s\S]*?});?/m;
  const match = content.match(objRegex);
  if (!match) {
    console.error('Could not find `const userPasswords = { ... }` in', targetPath);
    process.exit(1);
  }
  const objText = match[1];

  // Replace all string values inside the object with "********"
  // This regex finds "key": "value" or 'key': 'value' and replaces the value part.
  const maskedObjText = objText.replace(/:\s*(['"`])(?:(?!\1).)*\1/gm, ': "********"');

  const newContent = content.replace(objRegex, `const userPasswords = ${maskedObjText};`);
  fs.writeFileSync(maskedPath, newContent, 'utf8');
  console.log('✅ Masked JS written to', maskedPath);

  if (doOverwrite) {
    fs.copyFileSync(targetPath, backupPath);
    fs.copyFileSync(maskedPath, targetPath);
    console.log('✅ Original overwritten (backup saved to', backupPath + ')');
  }

  process.exit(0);
}

console.error('Unknown file type. Supported: .json and .js');
process.exit(1);
