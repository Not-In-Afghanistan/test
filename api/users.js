// api/users.js
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { id, password } = req.body;

  // 🔒 Local user-password storage (hidden on server)
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

  if (!id || !password) {
    return res.status(400).json({ ok: false, error: "Missing ID or password" });
  }

  if (!userPasswords[id] || userPasswords[id] !== password) {
    return res.status(401).json({ ok: false, error: "Invalid credentials" });
  }

  // ✅ Successful login
  return res.status(200).json({
    ok: true,
    name: idToName[id],
    role: users[id]?.role || "User"
  });
}
