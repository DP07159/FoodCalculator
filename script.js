const API_URL = "https://foodcalculator-server.onrender.com";

// **Rezept hinzufügen**
function addRecipe() {
  const name = document.getElementById("recipe-name").value;
  const calories = parseInt(document.getElementById("recipe-calories").value);
  const mealTypes = Array.from(document.getElementById("recipe-mealTypes").selectedOptions).map(option => option.value);

  if (!name || !calories || mealTypes.length === 0) {
    alert("Bitte alle Felder ausfüllen.");
    return;
  }

  fetch(`${API_URL}/recipes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, calories, mealTypes })
  })
  .then(response => response.json())
  .then(() => {
    console.log("✅ Rezept gespeichert");
    loadRecipes();
  })
  .catch(error => console.error("❌ Fehler beim Speichern:", error));
}

// **Rezepte laden & anzeigen**
function loadRecipes() {
  fetch(`${API_URL}/recipes`)
    .then(response => response.json())
    .then((recipes) => {
      const recipeList = document.getElementById("recipe-list");
      recipeList.innerHTML = "";

      recipes.forEach(recipe => {
        const li = document.createElement("li");
        li.innerHTML = `<strong>${recipe.name}</strong> - ${recipe.calories} kcal | ${recipe.mealTypes.join(", ")}`;

        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Löschen";
        deleteButton.onclick = () => deleteRecipe(recipe.id);

        li.appendChild(deleteButton);
        recipeList.appendChild(li);
      });
    })
    .catch(error => console.error("❌ Fehler beim Laden der Rezepte:", error));
}

// **Rezept löschen**
function deleteRecipe(recipeId) {
  fetch(`${API_URL}/recipe/${recipeId}`, { method: "DELETE" })
    .then(() => {
      console.log(`✅ Rezept mit ID ${recipeId} gelöscht`);
      loadRecipes();
    })
    .catch(error => console.error("❌ Fehler beim Löschen:", error));
}

// **Beim Laden der Seite alle Rezepte abrufen**
document.addEventListener("DOMContentLoaded", loadRecipes);
