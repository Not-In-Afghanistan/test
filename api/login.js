import admin from "firebase-admin";

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_KEY);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://test-da143-default-rtdb.firebaseio.com"
  });
}

const db = admin.database();

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { username, password } = req.body;

  // 🧠 Hidden data — secure on server
  const users = {
    "596923": "UrWrong67",
    "589533": "Monk3y41",
    "589425": "Crossing22",
    "564380": "CurryLover99",
    "603974": "ninjastar123",
    "546766": "MitlerWasRight2",
    "545208": "Boondocks697",
    "547025": "IhaveLigma43",
    "600437": "Niggalodian69",
    "599328": "PreFredom88",
    "592276": "SoccerIsLife22",
    "598292": "noTherCurry4U"
  };

  if (!users[username]) {
    return res.status(400).json({ success: false, error: "User ID not found." });
  }

  if (users[username] !== password) {
    return res.status(403).json({ success: false, error: "Incorrect password." });
  }

  // ✅ On success, push to Firebase (hidden logic)
  await db.ref("users").push({
    username,
    timestamp: Date.now()
  });

  res.status(200).json({ success: true });
}
