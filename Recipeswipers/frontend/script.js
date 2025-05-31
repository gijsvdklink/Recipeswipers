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
const recipeTitle = document.getElementById('recipe-title');
const recipeDescription = document.getElementById('recipe-description');
const likeOverlay = document.getElementById('like-overlay');
const dislikeOverlay = document.getElementById('dislike-overlay');

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
        recipeDescription.textContent = '';
        dislikeButton.style.display = 'none';
        likeButton.style.display = 'none';
        return;
    }

    recipeTitle.textContent = recipe.titel || 'Onbekend Recept';
    recipeDescription.textContent = recipe.korte_beschrijving || 'No description available.';
}

async function loadNextRecipe() {
    // Toon laad-status
    recipeTitle.textContent = 'Recept wordt geladen...';
    recipeDescription.textContent = '';

    // Reset card position and opacity before loading new content
    recipeCard.style.transform = 'translateX(0px) translateY(0px) rotate(0deg)';
    recipeCard.style.opacity = 1;
    recipeCard.classList.remove('swipe-left', 'swipe-right'); // Ensure animation classes are removed
    if(likeOverlay) likeOverlay.style.opacity = 0;
    if(dislikeOverlay) dislikeOverlay.style.opacity = 0;

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

// === ZingTouch Pan & Swipe Initialization ===
const mainContentRegion = document.querySelector('.main-content');
const touchRegion = new ZingTouch.Region(mainContentRegion, false, true); // capture: false, preventDefault: true (standard)

// Unbind previous swipe if any (e.g. from previous step, good practice)
// touchRegion.unbind(recipeCard, 'swipe'); // Not strictly needed if recipeCard was not directly bound before

let initialCardX = 0;
let initialCardY = 0; // Though Y is not used much in this horizontal swipe

touchRegion.bind(recipeCard, 'pan', function(e) {
    const card = recipeCard; // recipeCard is already the DOM element
    const distanceX = e.detail.data[0].distanceFromOriginX;
    const distanceY = e.detail.data[0].distanceFromOriginY; // Keep for potential future use
    // const direction = e.detail.data[0].directionFromOrigin; // Angle, less critical now with pan
    const threshold = card.offsetWidth / 3;

    if (e.detail.events[0].type === 'panstart') {
        // Try to get numerical value of current transform if any
        const currentTransform = window.getComputedStyle(card).transform;
        if (currentTransform && currentTransform !== 'none') {
            const matrix = new DOMMatrix(currentTransform);
            initialCardX = matrix.m41; // e value for translateX
            initialCardY = matrix.m42; // f value for translateY
        } else {
            initialCardX = 0;
            initialCardY = 0;
        }
        card.style.transition = 'none'; // Disable transition during pan for direct control
    }

    // Move card with finger
    card.style.transform = `translateX(${initialCardX + distanceX}px) translateY(${initialCardY + distanceY}px) rotate(${distanceX / 10}deg)`;

    // Show/Hide Overlays based on drag direction and distance
    const opacity = Math.min(Math.abs(distanceX) / threshold, 0.8); // Cap opacity at 0.8 for overlays
    if (distanceX > 10) { // Moving right (potential like), added a small buffer of 10px
        likeOverlay.style.opacity = opacity;
        dislikeOverlay.style.opacity = 0;
    } else if (distanceX < -10) { // Moving left (potential dislike), added a small buffer of 10px
        dislikeOverlay.style.opacity = opacity;
        likeOverlay.style.opacity = 0;
    } else {
        likeOverlay.style.opacity = 0;
        dislikeOverlay.style.opacity = 0;
    }

    if (e.detail.events[0].type === 'panend') {
        card.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out'; // Re-enable transition
        likeOverlay.style.opacity = 0;
        dislikeOverlay.style.opacity = 0;

        const currentRecipeId = recipeTitle.textContent;
        if (currentRecipeId && currentRecipeId !== 'Geen recepten gevonden!' && currentRecipeId !== 'Recept wordt geladen...') {
            if (Math.abs(distanceX) > threshold) { // Swipe confirmed
                if (distanceX > threshold) { // Swipe Right (Like)
                    console.log("Pan led to Swipe Right");
                    card.classList.add('swipe-right');
                    sendSwipeAction(currentRecipeId, 'like');
                } else { // Swipe Left (Dislike)
                    console.log("Pan led to Swipe Left");
                    card.classList.add('swipe-left');
                    sendSwipeAction(currentRecipeId, 'dislike');
                }
                setTimeout(() => {
                    loadNextRecipe(); // loadNextRecipe will remove classes and reset style
                }, 300);
            } else { // Not a swipe, reset card position
                console.log("Pan ended, not a swipe, resetting card.");
                card.style.transform = 'translateX(0px) translateY(0px) rotate(0deg)';
            }
        } else { // No valid recipe to swipe, just reset
             card.style.transform = 'translateX(0px) translateY(0px) rotate(0deg)';
        }
    }
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
// Hide the login navigation button as login functionality is not implemented
if (loginNavButton) {
    loginNavButton.style.display = 'none';
}
loadNextRecipe(); // Laad het eerste recept bij het starten van de app