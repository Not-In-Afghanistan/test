import admin from "firebase-admin";

// Initialize Firebase Admin only once
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://test-da143-default-rtdb.firebaseio.com",
  });
}

const db = admin.database();

// Example password store — you can later move this to Firebase
const userPasswords = {
  "596923": "UrWrong67",
  "589533": "Monk3y41",
  "589425": "mynameisjeff512",
  "564380": "CurryLover99",
  "603974": "ninjastar123",
  "546766": "HitlerWasRight1",
  "545208": "Boondocks697",
  "547025": "IhaveLigma43",
  "600437": "iggalodian69",
  "599328": "brycedallasisaSmash",
  "592276": "SoccerIsLife22",
  "598292": "noTherCurry4U",
};

// Handle POST requests for login
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { username, password } = req.body || {};

  // Validation
  if (!username || !password) {
    return res.status(400).json({ error: "Missing username or password" });
  }

  if (!userPasswords[username]) {
    return res.status(401).json({ error: "Invalid username" });
  }

  if (userPasswords[username] !== password) {
    return res.status(401).json({ error: "Incorrect password" });
  }

  // ✅ Check ban in Firebase
  const banSnap = await db.ref(`bans/${username}`).once("value");
  const banData = banSnap.val();
  if (banData && banData.expires > Date.now()) {
    return res.status(403).json({
      error: "banned",
      expires: banData.expires,
    });
  }

  // 🧹 Remove expired ban
  if (banData && banData.expires <= Date.now()) {
    await db.ref(`bans/${username}`).remove();
  }

  // ✅ Record login
  await db.ref("users").push({ username, timestamp: Date.now() });

  res.status(200).json({ success: true });
}
