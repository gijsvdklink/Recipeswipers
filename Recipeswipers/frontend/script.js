// === API Configuratie ===
// Tijdens lokale ontwikkeling op Mac:
const API_BASE_URL = 'http://localhost:3000';
// ALS JE OP JE IPHONE TEST (via Wi-Fi, op hetzelfde netwerk):
// const API_BASE_URL = 'http://JOUW_MAC_IP_ADRES:3000'; // Bijv. 'http://192.168.1.10:3000'

let loggedInUserId = null; // Houd de ID van de ingelogde gebruiker bij
let currentFilters = {}; // Houd de actieve filters bij
let seenRecipeIds = new Set(); // Houd bij welke recepten de gebruiker al heeft gezien in deze sessie

// === DOM Elementen ===
const recipeCard = document.getElementById('recipe-card');
const recipeImage = document.getElementById('recipe-image');
const recipeTitle = document.getElementById('recipe-title');
const cookTimeSpan = document.querySelector('#cook-time span'); // Span binnen cook-time meta-item
const difficultySpan = document.querySelector('#difficulty span'); // Span binnen difficulty meta-item
const dislikeButton = document.getElementById('dislike-button');
const likeButton = document.getElementById('like-button');

// Filter Modals
const filterButton = document.getElementById('filter-button');
const filterModal = document.getElementById('filter-modal');
const closeModalButton = document.getElementById('close-modal-button');
const applyFiltersButton = document.getElementById('apply-filters-button');
const toggleButtons = document.querySelectorAll('.toggle-button');

const ingredientsInput = document.getElementById('ingredients-input');
const budgetSelect = document.getElementById('budget-select');
const peopleInput = document.getElementById('people-input');

// Login Modals
const loginNavButton = document.getElementById('login-nav-button'); // Nieuwe login knop
const loginModal = document.getElementById('login-modal');
const closeLoginModalButton = document.getElementById('close-login-modal-button');
const loginButton = document.getElementById('login-button');
const registerButton = document.getElementById('register-button');
const loginUsernameInput = document.getElementById('login-username');
const loginPasswordInput = document.getElementById('login-password');


// === Algemene Functies ===

function showModal(modalElement) {
    modalElement.classList.add('visible');
}

function hideModal(modalElement) {
    modalElement.classList.remove('visible');
}

// === Recept Logica ===

async function fetchRecipe() {
    try {
        const params = new URLSearchParams(currentFilters);
        // Stuur userId mee zodat backend rekening kan houden met disliked recepten
        if (loggedInUserId) {
            params.append('userId', loggedInUserId);
        }
        // Frontend's 'seenRecipeIds' wordt niet naar backend gestuurd in MVP,
        // maar de backend probeert al rekening te houden met disliked via userId.

        const response = await fetch(`${API_BASE_URL}/api/recipe?${params.toString()}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const recipe = await response.json();

        // Voeg recept ID toe aan lokaal gezien lijst (voor sessie-gebaseerd 'niet opnieuw tonen')
        // Let op: Backend AI genereert steeds nieuwe recepten, dus deze lijst helpt vooral bij snel opvolgende requests.
        if (recipe && recipe.id) {
            seenRecipeIds.add(recipe.id);
        }
        return recipe;

    } catch (error) {
        console.error("Fout bij het ophalen van recept van de backend:", error);
        alert("Kon geen recept laden. Controleer je internetverbinding en backend server (F12 voor details).");
        return null;
    }
}

function renderRecipe(recipe) {
    if (!recipe) {
        recipeTitle.textContent = 'Geen recepten gevonden!';
        recipeImage.src = 'https://via.placeholder.com/400x300?text=Geen+recepten';
        cookTimeSpan.textContent = '';
        difficultySpan.textContent = '';
        dislikeButton.style.display = 'none';
        likeButton.style.display = 'none';
        return;
    }

    recipeImage.src = recipe.imageUrl || 'https://via.placeholder.com/400x300?text=Recept';
    recipeTitle.textContent = recipe.titel || 'Onbekend Recept';
    cookTimeSpan.textContent = recipe.bereidingstijd_minuten ? `${recipe.bereidingstijd_minuten} min` : 'N/A';
    difficultySpan.textContent = recipe.moeilijkheidsgraad || 'N/A';
    
    dislikeButton.style.display = 'flex';
    likeButton.style.display = 'flex';
}

async function loadNextRecipe() {
    // Toon laad-status
    recipeImage.src = 'https://via.placeholder.com/400x300?text=Laden...';
    recipeTitle.textContent = 'Recept wordt geladen...';
    cookTimeSpan.textContent = '';
    difficultySpan.textContent = '';
    dislikeButton.style.display = 'none';
    likeButton.style.display = 'none';

    const recipe = await fetchRecipe();
    renderRecipe(recipe);
}

// === Swipe Acties ===
async function sendSwipeAction(recipeId, direction) {
    if (!loggedInUserId) {
        console.warn('Geen ingelogde gebruiker, swipe niet opgeslagen.');
        return;
    }
    try {
        await fetch(`${API_BASE_URL}/api/swipe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: loggedInUserId, recipeId, direction })
        });
    } catch (error) {
        console.error('Fout bij opslaan swipe:', error);
    }
}

// === Event Listeners ===
dislikeButton.addEventListener('click', () => {
    const currentRecipeId = recipeTitle.textContent; // Gebruik titel als simpele ID voor MVP
    if (currentRecipeId && currentRecipeId !== 'Geen recepten gevonden!' && currentRecipeId !== 'Recept wordt geladen...') {
        sendSwipeAction(currentRecipeId, 'dislike');
    }
    loadNextRecipe();
});

likeButton.addEventListener('click', () => {
    const currentRecipeId = recipeTitle.textContent; // Gebruik titel als simpele ID voor MVP
    if (currentRecipeId && currentRecipeId !== 'Geen recepten gevonden!' && currentRecipeId !== 'Recept wordt geladen...') {
        sendSwipeAction(currentRecipeId, 'like');
    }
    loadNextRecipe();
});

// Filter Modal Events
filterButton.addEventListener('click', () => {
    showModal(filterModal);
});

closeModalButton.addEventListener('click', () => {
    hideModal(filterModal);
});

applyFiltersButton.addEventListener('click', async () => {
    currentFilters = {
        ingredients: ingredientsInput.value.trim(),
        budget: budgetSelect.value,
        people: peopleInput.value
    };
    const activeMealTypeButton = document.querySelector('.toggle-button.active');
    if (activeMealTypeButton) {
        currentFilters.mealType = activeMealTypeButton.dataset.mealType;
    } else {
        delete currentFilters.mealType;
    }

    console.log('Filters toegepast:', currentFilters);
    seenRecipeIds.clear(); // Reset gezien recepten wanneer filters worden toegepast

    if (loggedInUserId) { // Sla voorkeuren op als gebruiker is ingelogd
        try {
            await fetch(`${API_BASE_URL}/api/preferences`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: loggedInUserId, preferences: currentFilters })
            });
            console.log('Voorkeuren opgeslagen voor ingelogde gebruiker.');
        } catch (error) {
            console.error('Fout bij opslaan voorkeuren:', error);
        }
    }
    hideModal(filterModal);
    loadNextRecipe(); // Laad nieuw recept met toegepaste filters
});

toggleButtons.forEach(button => {
    button.addEventListener('click', () => {
        toggleButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
    });
});

// Login Modal Events
loginNavButton.addEventListener('click', () => {
    showModal(loginModal);
});

closeLoginModalButton.addEventListener('click', () => hideModal(loginModal));

loginButton.addEventListener('click', async () => {
    const username = loginUsernameInput.value;
    const password = loginPasswordInput.value;
    try {
        const response = await fetch(`${API_BASE_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();
        if (response.ok) {
            loggedInUserId = data.userId;
            alert(data.message + ` Welkom, ${loggedInUserId}!`);
            hideModal(loginModal);
            loadNextRecipe(); // Laad nieuwe recepten na login (of met opgeslagen voorkeuren)
        } else {
            alert('Login mislukt: ' + data.message);
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Er is een fout opgetreden tijdens het inloggen.');
    }
});

registerButton.addEventListener('click', async () => {
    const username = loginUsernameInput.value;
    const password = loginPasswordInput.value;
    try {
        const response = await fetch(`${API_BASE_URL}/api/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();
        if (response.ok) {
            alert(data.message + ' U kunt nu inloggen.');
            // Optioneel: vul inlogvelden en open login modal automatisch
            // loginUsernameInput.value = username;
            // loginPasswordInput.value = password;
            // showModal(loginModal);
        } else {
            alert('Registratie mislukt: ' + data.message);
        }
    } catch (error) {
        console.error('Registratie error:', error);
        alert('Er is een fout opgetreden tijdens de registratie.');
    }
});


// === Initialisatie ===
loadNextRecipe(); // Laad het eerste recept bij het starten van de app