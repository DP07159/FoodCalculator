const API_URL = "https://foodcalculator-server.onrender.com";
const DAILY_CALORIE_LIMIT = 1500;
let recipes = [];
let mealPlans = [];

// **Rezepte & Pläne laden**
function loadRecipes() {
  fetch(`${API_URL}/recipes`)
    .then(response => response.json())
    .then(data => {
      recipes = data;
      populateMealTable();
      loadMealPlans();
    })
    .catch(error => console.error("❌ Fehler beim Laden der Rezepte:", error));
}

// **Wochenplan speichern**
function saveMealPlan() {
  const name = document.getElementById("plan-name").value;
  if (!name) return alert("Bitte einen Namen eingeben!");

  const mealData = {};
  document.querySelectorAll("#meal-table tr").forEach(row => {
    const day = row.children[0].textContent;
    mealData[day] = {};
    row.querySelectorAll("select").forEach(select => {
      mealData[day][select.dataset.mealType] = select.value;
    });
  });

  fetch(`${API_URL}/meal_plans`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, data: mealData })
  }).then(() => loadMealPlans());
}

// **Wochenplan laden**
function loadMealPlans() {
  fetch(`${API_URL}/meal_plans`)
    .then(response => response.json())
    .then(data => {
      mealPlans = data;
      const select = document.getElementById("plan-select");
      select.innerHTML = `<option value="">Gespeicherte Pläne laden...</option>`;
      data.forEach(plan => {
        const option = document.createElement("option");
        option.value = plan.id;
        option.textContent = plan.name;
        select.appendChild(option);
      });
    });
}
document.addEventListener("DOMContentLoaded", loadRecipes);
