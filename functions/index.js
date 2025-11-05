/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {setGlobalOptions} = require("firebase-functions");
const {onRequest} = require("firebase-functions/https");
const logger = require("firebase-functions/logger");

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({ maxInstances: 10 });

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

exports.loginUser = functions.https.onRequest(async (req, res) => {
  // === CORS headers ===
  res.set('Access-Control-Allow-Origin', '*'); // or your frontend URL in production
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  // === Handle preflight request ===
  if (req.method === 'OPTIONS') {
    return res.status(204).send(''); // Must respond to OPTIONS
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { userId, password } = req.body;

  if (!userId || !password) {
    return res.status(400).json({ error: 'Missing userId or password' });
  }

  try {
    const userRef = admin.database().ref(`users/${userId}`);
    const snapshot = await userRef.once('value');
    const userData = snapshot.val();

    if (!userData) return res.status(404).json({ error: 'User ID not found' });
    if (userData.password !== password) return res.status(403).json({ error: 'Incorrect password' });

    const banRef = admin.database().ref(`bans/${userId}`);
    const banSnap = await banRef.once('value');
    const banData = banSnap.val();

    if (banData && banData.expires > Date.now()) {
      return res.status(403).json({ error: `You are banned until ${new Date(banData.expires).toLocaleString()}` });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});
