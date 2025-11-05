// /api/login.js
import firebaseAdmin from "firebase-admin";

let app;

// Initialize Firebase Admin (Vercel requires this to be idempotent)
if (!firebaseAdmin.apps.length) {
  app = firebaseAdmin.initializeApp({
    credential: firebaseAdmin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
    }),
    databaseURL: process.env.FIREBASE_DATABASE_URL
  });
} else {
  app = firebaseAdmin.app();
}

const db = app.database();

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const { username, password } = req.body;

  if (!username || !password || !/^\d{6}$/.test(username)) {
    return res.status(400).json({ success: false, error: "Invalid username or password" });
  }

  try {
    const snap = await db.ref(`users/${username}`).once("value");
    const userData = snap.val();

    if (!userData) {
      return res.status(401).json({ success: false, error: "User not found" });
    }

    if (userData.password !== password) {
      return res.status(401).json({ success: false, error: "Incorrect password" });
    }

    // ✅ Success
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
}
