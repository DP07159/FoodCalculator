const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

// **Datenbank initialisieren**
const db = new sqlite3.Database("./food_calculator.sqlite", (err) => {
  if (err) console.error("❌ Fehler beim Öffnen der Datenbank:", err.message);
  else console.log("✅ Erfolgreich mit SQLite verbunden.");
});

// **Rezepte-Tabelle erstellen**
db.run(
  `CREATE TABLE IF NOT EXISTS recipes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    calories INTEGER NOT NULL,
    mealTypes TEXT NOT NULL
  )`
);

// **Wochenplan-Tabelle erstellen**
db.run(
  `CREATE TABLE IF NOT EXISTS meal_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    data TEXT NOT NULL
  )`
);

// **GET: Alle Rezepte abrufen**
app.get("/recipes", (req, res) => {
  console.log("🔍 GET /recipes wurde aufgerufen");

  db.all("SELECT * FROM recipes", [], (err, rows) => {
    if (err) {
      console.error("❌ Fehler beim Abrufen der Rezepte:", err.message);
      return res.status(500).json({ error: err.message });
    }

    try {
      const formattedRecipes = rows.map(recipe => ({
        id: recipe.id,
        name: recipe.name,
        calories: recipe.calories,
        mealTypes: JSON.parse(recipe.mealTypes) || []
      }));

      console.log("✅ Rezepte erfolgreich geladen:", formattedRecipes);
      res.json(formattedRecipes);
    } catch (parseError) {
      console.error("❌ JSON-Parsing-Fehler:", parseError.message);
      res.status(500).json({ error: "Fehler beim Verarbeiten der Rezepte" });
    }
  });
});

// **POST: Neues Rezept hinzufügen**
app.post("/recipes", (req, res) => {
  let { name, calories, mealTypes } = req.body;

  if (!Array.isArray(mealTypes)) mealTypes = [mealTypes];
  const mealTypesJSON = JSON.stringify(mealTypes);

  db.run(
    "INSERT INTO recipes (name, calories, mealTypes) VALUES (?, ?, ?)",
    [name, calories, mealTypesJSON],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: this.lastID, name, calories, mealTypes });
    }
  );
});

// **DELETE: Rezept löschen**
app.delete("/recipe/:id", (req, res) => {
  const { id } = req.params;
  db.run("DELETE FROM recipes WHERE id = ?", [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(200).json({ message: "Rezept gelöscht", id });
  });
});

// **POST: Wochenplan speichern**
app.post("/meal_plans", (req, res) => {
  const { name, data } = req.body;
  const jsonData = JSON.stringify(data);

  db.run(
    "INSERT INTO meal_plans (name, data) VALUES (?, ?)",
    [name, jsonData],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: this.lastID, name, data });
    }
  );
});

// **GET: Alle gespeicherten Wochenpläne abrufen**
app.get("/meal_plans", (req, res) => {
  db.all("SELECT * FROM meal_plans", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// **GET: Einen Wochenplan abrufen**
app.get("/meal_plans/:id", (req, res) => {
  const { id } = req.params;
  db.get("SELECT * FROM meal_plans WHERE id = ?", [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: "Plan nicht gefunden" });
    res.json({ id: row.id, name: row.name, data: JSON.parse(row.data) });
  });
});

// **Server starten**
app.listen(PORT, () => console.log(`🚀 Server läuft auf Port ${PORT}`));
