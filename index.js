const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

// 💡 **CORS-Fix: Alle Domains erlauben**
app.use(cors({
  origin: "*", // Erlaubt Anfragen von überall
  methods: ["GET", "POST", "DELETE"],
  allowedHeaders: ["Content-Type"]
}));

app.use(express.json());

// 💾 **SQLite-Datenbank speichern in Render**
const DB_PATH = "/data/database.db";

// Sicherstellen, dass das Datenbank-Verzeichnis existiert
if (!fs.existsSync("/data")) {
  console.log("/data-Verzeichnis nicht gefunden – erstelle es.");
  fs.mkdirSync("/data");
}

// Falls die Datenbank-Datei fehlt, erstelle sie
if (!fs.existsSync(DB_PATH)) {
  console.log("Datenbank nicht gefunden – erstelle neue Datei.");
  fs.writeFileSync(DB_PATH, "");
}

// Verbindung zur SQLite-Datenbank
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error("Fehler beim Öffnen der SQLite-Datenbank:", err);
  } else {
    console.log("Verbunden mit SQLite-Datenbank:", DB_PATH);
  }
});

// 🛠️ **Datenbank-Tabellen erstellen**
db.serialize(() => {
  db.run(
    `CREATE TABLE IF NOT EXISTS recipes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      calories INTEGER NOT NULL,
      mealTypes TEXT NOT NULL
    )`
  );

  db.run(
    `CREATE TABLE IF NOT EXISTS plans (
      name TEXT PRIMARY KEY,
      data TEXT NOT NULL
    )`
  );

  console.log("Tabellen wurden überprüft und erstellt.");
});

// ✅ **Rezepte abrufen**
app.get("/recipes", (req, res) => {
  db.all("SELECT * FROM recipes", [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    // **Fix: Gebe mealTypes IMMER als String zurück, genau wie früher!**
    res.json(rows);
  });
});

// ✅ **Neues Rezept hinzufügen**
app.post("/recipes", (req, res) => {
  const { name, calories, mealTypes } = req.body;
  const mealTypesString = JSON.stringify(mealTypes); // Speichere als String

  db.run(
    "INSERT INTO recipes (name, calories, mealTypes) VALUES (?, ?, ?)",
    [name, calories, mealTypesString],
    function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.status(201).json({ id: this.lastID, name, calories, mealTypes });
    }
  );
});

// ✅ **Rezept löschen**
app.delete("/recipes/:id", (req, res) => {
  const recipeId = req.params.id;

  db.run("DELETE FROM recipes WHERE id = ?", recipeId, function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.status(204).send();
  });
});

// ✅ **Pläne abrufen**
app.get("/plans", (req, res) => {
  db.all("SELECT * FROM plans", [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    const plans = {};
    rows.forEach((row) => {
      plans[row.name] = JSON.parse(row.data);
    });
    res.json(plans);
  });
});

// ✅ **Plan speichern**
app.post("/plans", (req, res) => {
  const { name, plan } = req.body;
  const planString = JSON.stringify(plan);

  db.run(
    "INSERT OR REPLACE INTO plans (name, data) VALUES (?, ?)",
    [name, planString],
    function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.status(201).send();
    }
  );
});

// ✅ **Starte den Server**
app.listen(PORT, () => {
  console.log(`Server läuft auf http://localhost:${PORT}`);
});
