// api/users.js
export default function handler(req, res) {
  // 🔒 This code runs on Vercel's server, not in the browser
  const firebaseConfig = {
    apiKey: "AIzaSyBGPFSP0e0oYqKqvJHLB5eGlX9mJ8aU09s",
    authDomain: "test-da143.firebaseapp.com",
    databaseURL: "https://test-da143-default-rtdb.firebaseio.com",
    projectId: "test-da143",
    storageBucket: "test-da143.firebasestorage.app",
    messagingSenderId: "58366480447",
    appId: "1:58366480447:web:f3dd12850f09952b49688a",
    measurementId: "G-T5HK7JTWHW"
  };

  

  // 🔒 Local ID-password pairs
  const userPasswords = {
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
    "597627": "HolyShmoly77",
    "589475": "IrishLapDance67",
    "598292": "noTherCurry4U"
  };


  const idToName = { 
    "596923":"Muzafar",
    "589533":"Kyle",
    "589425":"Jeffery",
    "564380":"Harshan",
    "603974":"Dasani",
    "546766":"Camden",
    "545208":"Braylen",
    "547025":"Jostin",
    "600437":"Blake",
    "599328":"Ethan",
    "592276":"Nitya",
    "597627":"IdianShawn",
    "589475":"Liam",
    "598292":"Jacob" 
  };

  const users = {
    "596923": { name: "Muzafar", role: "Admin" },
    "547025": { name: "Jostin", role: "PremiumOG" },
    "599328": { name: "Ethan" },
    "589533": { name: "Kyle" },
    "589425": { name: "Jeffery" },
    "564380": { name: "Harshan" },
    "603974": { name: "Dasani" },
    "545208": { name: "Braylen" },
    "600437": { name: "Blake" },
    "597627": { name: "IdianShawn" },
    "589475": { name: "Liam" },
    "598292": { name: "Jacob" }
  };

  const adminUsers = ["596923"];
  const shortCooldownUsers = ["596923", "547025"];

  // 🧠 Example: basic data filter
  const { id } = req.query;
  if (id && users[id]) {
    return res.status(200).json(users[id]); // Return specific user
  }

  // Otherwise return a summary
  res.status(200).json({
    count: Object.keys(users).length,
    admins: adminUsers.length,
    users,
  });
}
