// === API Configuration ===
// Ensure this matches your backend PORT in .env (e.g., 'http://127.0.0.1:5000' for local or 'https://your_ngrok_url.ngrok-free.app' for phone testing)
const API_BASE_URL = 'http://127.0.0.1:5000'; // Make sure this matches your Flask server's address on Mac

// === Global State ===
let currentFilters = {};
let savedRecipes = new Map(); // Store full recipe objects by ID for quick lookup
let recipeStack = []; // Array to hold the DOM elements of the recipe cards
const MAX_CARDS_IN_STACK = 5; // How many cards to keep ready in the stack

// === DOM Elements ===
// No longer directly reference 'recipe-card' but 'recipe-stack-container'
const recipeStackContainer = document.getElementById('recipe-stack-container');
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

// My Recipes Modal
const myRecipesNavButton = document.getElementById('my-recipes-nav-button');
const myRecipesModal = document.getElementById('my-recipes-modal');
const closeMyRecipesModalButton = document.getElementById('close-my-recipes-modal-button');
const savedRecipesList = document.getElementById('saved-recipes-list'); // Grid container
const noSavedRecipesMessage = document.getElementById('no-saved-recipes');

// Full Recipe Details Modal
const fullRecipeDetailsModal = document.getElementById('full-recipe-details-modal');
const closeFullRecipeModalButton = document.getElementById('close-full-recipe-modal-button');
const fullRecipeTitle = document.getElementById('full-recipe-title');
const fullRecipeShortDescription = document.getElementById('full-recipe-short-description');
const fullRecipeImage = document.getElementById('full-recipe-image');
const fullRecipePrepTime = document.getElementById('full-recipe-prep-time');
const fullRecipeDifficulty = document.getElementById('full-recipe-difficulty');
const fullRecipeIngredients = document.getElementById('full-recipe-ingredients');
const fullRecipeInstructions = document.getElementById('full-recipe-instructions');

// Bottom Nav Buttons
const homeNavButton = document.getElementById('home-nav-button');
const navButtons = document.querySelectorAll('.bottom-nav .nav-button');

// === General Functions ===

function showModal(modalElement) {
    modalElement.classList.add('visible');
    // document.body.style.overflow = 'hidden'; // Prevent background scroll when modal open
}

function hideModal(modalElement) {
    modalElement.classList.remove('visible');
    // document.body.style.overflow = ''; // Re-enable background scroll
}

// === Recipe Card Management ===

// Creates a single recipe card DOM element from a recipe object
function createRecipeCardElement(recipe, isInitialLoad = false) {
    const cardElement = document.createElement('div');
    cardElement.classList.add('swipe-card');
    cardElement.dataset.recipeId = recipe.id;
    cardElement.dataset.recipeData = JSON.stringify(recipe); // Store full recipe data on the element

    cardElement.innerHTML = `
        <div class="recipe-image-container">
            <img src="${recipe.image_url || 'https://picsum.photos/400/300?random=' + recipe.id}" alt="${recipe.title || 'Recipe Image'}">
        </div>
        <div class="recipe-info">
            <h2>${recipe.title || 'Unknown Recipe'}</h2>
            <p class="recipe-description">${recipe.short_description || 'No description available.'}</p>
        </div>
    `;

    // Add initial animation class if it's not the first card on load
    if (isInitialLoad) {
        // No initial animation for the first card
    } else {
        cardElement.classList.add('new-card-animate-in'); // Add class for animation
    }

    return cardElement;
}

// Updates the position and z-index of cards in the stack for visual effect
function updateCardStackPositions() {
    recipeStack.forEach((card, index) => {
        const offset = index * 8; // Adjust for desired visual separation
        const scale = 1 - (index * 0.03); // Adjust for desired scaling effect

        card.style.transform = `translateY(${offset}px) scale(${scale})`;
        card.style.zIndex = MAX_CARDS_IN_STACK - index; // Top card has highest z-index
        card.style.opacity = 1; // Ensure visibility for all cards in stack
        card.style.transition = 'transform 0.3s ease-out, z-index 0s, opacity 0.3s ease-out';
    });

    // If the stack is empty, display "No recipes found!" message
    if (recipeStack.length === 0) {
        // Display a placeholder card or message
        const emptyCard = document.getElementById('loading-card'); // Use the loading card as a placeholder
        if(emptyCard) {
            emptyCard.style.display = 'flex'; // Show it
            emptyCard.querySelector('h2').textContent = 'No recipes found!';
            emptyCard.querySelector('p').textContent = 'Try adjusting your filters or check your internet connection.';
        }
    } else {
        const emptyCard = document.getElementById('loading-card');
        if(emptyCard) emptyCard.style.display = 'none';
    }
}

// Fetches a new recipe and adds it to the bottom of the stack
async function addNewRecipeCardToStack() {
    const recipe = await fetchRecipe();
    if (recipe) {
        const newCardElement = createRecipeCardElement(recipe, false); // Not initial load
        recipeStackContainer.appendChild(newCardElement);
        recipeStack.push(newCardElement);
        updateCardStackPositions(); // Re-position all cards including the new one
        console.log(`Added new recipe: ${recipe.title}. Stack size: ${recipeStack.length}`);
    } else {
        console.warn("Could not add new recipe to stack.");
        // If fetch fails and stack is less than MAX_CARDS, try again? Or show error state?
        // For now, it just won't add a new card.
    }
}

// Populates the stack with initial recipes
async function populateRecipeStack() {
    console.log('Function: populateRecipeStack called. Filling stack...');
    // Hide the initial loading card
    const loadingCard = document.getElementById('loading-card');
    if (loadingCard) loadingCard.style.display = 'none';


    // Clear existing stack
    recipeStack.forEach(card => card.remove());
    recipeStack = [];
    recipeStackContainer.innerHTML = ''; // Ensure container is empty

    for (let i = 0; i < MAX_CARDS_IN_STACK; i++) {
        const recipe = await fetchRecipe();
        if (recipe) {
            const cardElement = createRecipeCardElement(recipe, true); // Mark as initial load
            recipeStackContainer.appendChild(cardElement);
            recipeStack.push(cardElement);
            if (i === 0) { // First card will be the active one for ZingTouch
                bindZingTouchToTopCard();
            }
        } else {
            console.warn(`Could not fetch recipe for stack position ${i}. Stopping stack population.`);
            break; // Stop if we can't get enough recipes
        }
    }
    updateCardStackPositions();
    if (recipeStack.length === 0) {
        if(loadingCard) { // Show the loading card as a "no recipes found" message
            loadingCard.style.display = 'flex';
            loadingCard.querySelector('h2').textContent = 'No recipes found!';
            loadingCard.querySelector('p').textContent = 'Try adjusting your filters or check your internet connection.';
        }
    }
}


// === API Interaction ===

async function fetchRecipe() {
    try {
        const params = new URLSearchParams(currentFilters);
        const response = await fetch(`${API_BASE_URL}/api/recipe?${params.toString()}`);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: `HTTP Error: ${response.status}` }));
            throw new Error(`Failed to fetch recipe: ${errorData.message || response.statusText}`);
        }
        const recipe = await response.json();
        return recipe;

    } catch (error) {
        console.error("Error fetching recipe from backend:", error);
        return null;
    }
}

// === Swipe Logic ===

let touchRegion = null; // Declare outside to manage binding

function bindZingTouchToTopCard() {
    if (recipeStack.length === 0) {
        console.log("No cards in stack to bind ZingTouch to.");
        if (touchRegion) { // If a region existed, unbind it
            touchRegion.unbind(touchRegion.element, 'pan');
        }
        return;
    }

    const topCard = recipeStack[0];
    const mainContentRegion = document.querySelector('.main-content'); // Region is the swipeable area

    // If a touchRegion already exists, unbind from previous card if any
    if (touchRegion) {
        touchRegion.unbind(mainContentRegion, 'pan'); // Unbind from the region's element itself
        console.log("ZingTouch: Previous binding removed.");
    }

    // Bind ZingTouch to the current top card element
    touchRegion = new ZingTouch.Region(mainContentRegion, false, true); // preventDefault: true

    let initialCardX = 0;
    let initialCardY = 0;

    touchRegion.bind(topCard, 'pan', function(e) {
        const card = topCard;
        const distanceX = e.detail.data[0].distanceFromOriginX;
        const distanceY = e.detail.data[0].distanceFromOriginY;
        const threshold = card.offsetWidth / 3;

        if (e.detail.events[0].type === 'panstart') {
            const currentTransform = window.getComputedStyle(card).transform;
            if (currentTransform && currentTransform !== 'none') {
                const matrix = new DOMMatrix(currentTransform);
                initialCardX = matrix.m41;
                initialCardY = matrix.m42;
            } else {
                initialCardX = 0;
                initialCardY = 0;
            }
            card.style.transition = 'none'; // Disable transition during pan
        }

        // Apply transform based on pan distance
        card.style.transform = `translateX(${initialCardX + distanceX}px) translateY(${initialCardY + distanceY}px) rotate(${distanceX / 10}deg)`;

        // Show/Hide Overlays based on drag direction and distance
        const opacity = Math.min(Math.abs(distanceX) / threshold, 0.8);
        if (distanceX > 10) {
            likeOverlay.style.opacity = opacity;
            dislikeOverlay.style.opacity = 0;
        } else if (distanceX < -10) {
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

            if (Math.abs(distanceX) > threshold) { // Swipe confirmed
                if (distanceX > threshold) { // Swipe Right (Like)
                    card.classList.add('swipe-right');
                    handleSwipeAction('like', topCard);
                } else { // Swipe Left (Dislike)
                    card.classList.add('swipe-left');
                    handleSwipeAction('dislike', topCard);
                }
                
                // Remove card after animation and load new one
                setTimeout(() => {
                    card.remove(); // Remove swiped card from DOM
                    recipeStack.shift(); // Remove from array
                    updateCardStackPositions(); // Re-position remaining cards
                    addNewRecipeCardToStack(); // Add new card to fill stack
                    bindZingTouchToTopCard(); // Bind ZingTouch to the new top card
                }, 300);
            } else { // Not a swipe, reset card position
                card.style.transform = 'translateX(0px) translateY(0px) rotate(0deg)';
            }
        }
    });
    console.log("ZingTouch: Bound to new top card.");
}

async function handleSwipeAction(direction, swipedCardElement) {
    const recipeDataString = swipedCardElement.dataset.recipeData;
    if (!recipeDataString) {
        console.warn('No recipe data found on swiped card.');
        return;
    }
    const swipedRecipe = JSON.parse(recipeDataString);

    console.log(`Action: Recipe '${swipedRecipe.title}' (ID: ${swipedRecipe.id}) was ${direction}d.`);

    if (direction === 'like') {
        savedRecipes.set(swipedRecipe.id, swipedRecipe);
        saveRecipesToLocalStorage(); // Persist liked recipes
        console.log(`Recipe '${swipedRecipe.title}' saved! Total saved: ${savedRecipes.size}`);
    }
}


// === Local Storage for Saved Recipes ===
function saveRecipesToLocalStorage() {
    try {
        localStorage.setItem('savedRecipes', JSON.stringify(Array.from(savedRecipes.entries())));
    } catch (e) {
        console.error('Error saving recipes to local storage:', e);
    }
}

function loadRecipesFromLocalStorage() {
    try {
        const stored = localStorage.getItem('savedRecipes');
        if (stored) {
            savedRecipes = new Map(JSON.parse(stored));
            console.log(`Loaded ${savedRecipes.size} recipes from local storage.`);
        }
    } catch (e) {
        console.error('Error loading recipes from local storage:', e);
        savedRecipes = new Map(); // Reset if corrupted
    }
}

// === Filter Modal Events ===
if (filterButton) {
    filterButton.addEventListener('click', () => {
        showModal(filterModal);
    });
}
if (closeModalButton) {
    closeModalButton.addEventListener('click', () => {
        hideModal(filterModal);
    });
}
if (applyFiltersButton) {
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

        console.log('Filters applied:', currentFilters);
        hideModal(filterModal);
        populateRecipeStack(); // Re-populate stack with new filters
    });
}
toggleButtons.forEach(button => {
    button.addEventListener('click', () => {
        toggleButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
    });
});

// === My Recipes Modal Events ===
if (myRecipesNavButton) {
    myRecipesNavButton.addEventListener('click', () => {
        renderSavedRecipesList();
        showModal(myRecipesModal);
        homeNavButton.classList.remove('active');
        myRecipesNavButton.classList.add('active');
    });
}

if (closeMyRecipesModalButton) {
    closeMyRecipesModalButton.addEventListener('click', () => {
        hideModal(myRecipesModal);
        homeNavButton.classList.add('active');
        myRecipesNavButton.classList.remove('active');
    });
}

function renderSavedRecipesList() {
    savedRecipesList.innerHTML = ''; // Clear previous list
    if (savedRecipes.size === 0) {
        noSavedRecipesMessage.style.display = 'block';
    } else {
        noSavedRecipesMessage.style.display = 'none';
        savedRecipes.forEach(recipe => {
            const recipeElement = document.createElement('div');
            recipeElement.classList.add('saved-recipe-card');
            recipeElement.dataset.recipeId = recipe.id;
            recipeElement.innerHTML = `
                <img src="${recipe.image_url || 'https://picsum.photos/150/100?random=' + recipe.id}" alt="${recipe.title || 'Recipe Image'}">
                <div class="saved-recipe-info">
                    <h4>${recipe.title || 'Unknown Recipe'}</h4>
                    <p>${recipe.short_description || ''}</p>
                </div>
            `;
            recipeElement.addEventListener('click', () => {
                showFullRecipeDetails(recipe.id);
            });
            savedRecipesList.appendChild(recipeElement);
        });
    }
}

// === Full Recipe Details Modal Events ===
if (closeFullRecipeModalButton) {
    closeFullRecipeModalButton.addEventListener('click', () => {
        hideModal(fullRecipeDetailsModal);
    });
}

function showFullRecipeDetails(recipeId) {
    const recipe = savedRecipes.get(recipeId);
    if (!recipe) {
        console.error(`Recipe with ID ${recipeId} not found in saved recipes.`);
        alert('Recipe details could not be loaded.');
        return;
    }

    fullRecipeTitle.textContent = recipe.title || 'Recipe Details';
    fullRecipeShortDescription.textContent = recipe.short_description || '';
    fullRecipeImage.src = recipe.image_url || 'https://picsum.photos/400/300?random=' + recipe.id;
    fullRecipeImage.alt = recipe.title || 'Recipe Image';

    fullRecipePrepTime.textContent = recipe.preparation_time_minutes ? `${recipe.preparation_time_minutes}` : 'N/A';
    fullRecipeDifficulty.textContent = recipe.difficulty || 'N/A';

    fullRecipeIngredients.innerHTML = '';
    if (recipe.ingredients && recipe.ingredients.length > 0) {
        recipe.ingredients.forEach(item => {
            const li = document.createElement('li');
            li.textContent = item;
            fullRecipeIngredients.appendChild(li);
        });
    } else {
        fullRecipeIngredients.innerHTML = '<li>No ingredients listed.</li>';
    }

    fullRecipeInstructions.innerHTML = '';
    if (recipe.instructions && recipe.instructions.length > 0) {
        recipe.instructions.forEach(step => {
            const li = document.createElement('li');
            li.textContent = `${step}`; // Added step number automatically by <ol>
            fullRecipeInstructions.appendChild(li);
        });
    } else {
        fullRecipeInstructions.innerHTML = '<li>No instructions listed.</li>';
    }

    showModal(fullRecipeDetailsModal);
}

// === Bottom Nav Button Logic ===
if (homeNavButton) {
    homeNavButton.addEventListener('click', () => {
        navButtons.forEach(btn => btn.classList.remove('active'));
        homeNavButton.classList.add('active');
        hideModal(myRecipesModal);
        hideModal(fullRecipeDetailsModal);
        // Only re-populate if needed, but for Tinder-like, always re-populate on home
        populateRecipeStack();
    });
}

// === Initialization ===
loadRecipesFromLocalStorage(); // Load saved recipes from local storage on app start
populateRecipeStack(); // Fill the stack with recipes on app start