// === API Configuration ===
const API_BASE_URL = 'http://127.0.0.1:5000'; // Ensure this matches your backend PORT in .env

let currentFilters = {};
let seenRecipeIds = new Set();

// === DOM Elements ===
// Log to confirm DOM elements are found
const recipeCard = document.getElementById('recipe-card');
console.log('DOM: recipeCard found:', !!recipeCard); // !! converts to boolean
const recipeTitle = document.getElementById('recipe-title');
console.log('DOM: recipeTitle found:', !!recipeTitle);
const recipeDescription = document.getElementById('recipe-description');
console.log('DOM: recipeDescription found:', !!recipeDescription);
const likeOverlay = document.getElementById('like-overlay');
console.log('DOM: likeOverlay found:', !!likeOverlay);
const dislikeOverlay = document.getElementById('dislike-overlay');
console.log('DOM: dislikeOverlay found:', !!dislikeOverlay);

const filterButton = document.getElementById('filter-button');
console.log('DOM: filterButton found:', !!filterButton);
const filterModal = document.getElementById('filter-modal');
console.log('DOM: filterModal found:', !!filterModal);
const closeModalButton = document.getElementById('close-modal-button');
console.log('DOM: closeModalButton found:', !!closeModalButton);
const applyFiltersButton = document.getElementById('apply-filters-button');
console.log('DOM: applyFiltersButton found:', !!applyFiltersButton);
const toggleButtons = document.querySelectorAll('.toggle-button');
console.log('DOM: toggleButtons found (count):', toggleButtons.length);

const ingredientsInput = document.getElementById('ingredients-input');
console.log('DOM: ingredientsInput found:', !!ingredientsInput);
const budgetSelect = document.getElementById('budget-select');
console.log('DOM: budgetSelect found:', !!budgetSelect);
const peopleInput = document.getElementById('people-input');
console.log('DOM: peopleInput found:', !!peopleInput);

// === General Functions ===
function showModal(modalElement) {
    modalElement.classList.add('visible');
    console.log(`Modal ${modalElement.id} shown.`);
}

function hideModal(modalElement) {
    modalElement.classList.remove('visible');
    console.log(`Modal ${modalElement.id} hidden.`);
}

// === Recipe Logic ===
async function fetchRecipe() {
    console.log('Function: fetchRecipe called.');
    try {
        const params = new URLSearchParams(currentFilters);
        console.log(`Fetching recipe from ${API_BASE_URL}/api/recipe?${params.toString()}`);
        const response = await fetch(`${API_BASE_URL}/api/recipe?${params.toString()}`);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: `HTTP Error: ${response.status}` }));
            throw new Error(`Failed to fetch recipe: ${errorData.message || response.statusText}`);
        }
        const recipe = await response.json();
        console.log('Recipe fetched successfully:', recipe);

        if (recipe && recipe.id) {
            seenRecipeIds.add(recipe.id);
        }
        return recipe;

    } catch (error) {
        console.error("Error fetching recipe from backend:", error);
        recipeTitle.textContent = 'Oops! Something went wrong.';
        recipeDescription.textContent = 'Could not load recipe. Please try again later. (Check browser console & backend terminal for details)';
        return null;
    }
}

function renderRecipe(recipe) {
    console.log('Function: renderRecipe called with recipe:', recipe);
    if (!recipe) {
        recipeTitle.textContent = 'No recipes found!';
        recipeDescription.textContent = 'Try adjusting your filters or check your internet connection.';
        return;
    }
    recipeTitle.textContent = recipe.title || 'Unknown Recipe';
    recipeDescription.textContent = recipe.short_description || 'No description available.';
}

async function loadNextRecipe() {
    console.log('Function: loadNextRecipe called. Preparing card and fetching new recipe...');
    recipeTitle.textContent = 'Recipe is loading...';
    recipeDescription.textContent = '';

    recipeCard.style.transform = 'translateX(0px) translateY(0px) rotate(0deg)';
    recipeCard.style.opacity = 1;
    recipeCard.classList.remove('swipe-left', 'swipe-right');
    if(likeOverlay) likeOverlay.style.opacity = 0;
    if(dislikeOverlay) dislikeOverlay.style.opacity = 0;

    const recipe = await fetchRecipe();
    renderRecipe(recipe);
}

// === Swipe Actions ===
async function handleSwipeAction(recipeId, direction) {
    console.log(`Action: Recipe '${recipeId}' was ${direction}d.`);
}

// === ZingTouch Pan & Swipe Initialization ===
const mainContentRegion = document.querySelector('.main-content');
console.log('DOM: mainContentRegion found:', !!mainContentRegion);
if (mainContentRegion && typeof ZingTouch !== 'undefined') {
    const touchRegion = new ZingTouch.Region(mainContentRegion, false, true);
    console.log('ZingTouch region initialized.');

    let initialCardX = 0;
    let initialCardY = 0;

    touchRegion.bind(recipeCard, 'pan', function(e) {
        const card = recipeCard;
        const distanceX = e.detail.data[0].distanceFromOriginX;
        const distanceY = e.detail.data[0].distanceFromOriginY;
        const threshold = card.offsetWidth / 3;

        if (e.detail.events[0].type === 'panstart') {
            console.log('ZingTouch: panstart event.');
            const currentTransform = window.getComputedStyle(card).transform;
            if (currentTransform && currentTransform !== 'none') {
                const matrix = new DOMMatrix(currentTransform);
                initialCardX = matrix.m41;
                initialCardY = matrix.m42;
            } else {
                initialCardX = 0;
                initialCardY = 0;
            }
            card.style.transition = 'none';
        }

        card.style.transform = `translateX(${initialCardX + distanceX}px) translateY(${initialCardY + distanceY}px) rotate(${distanceX / 10}deg)`;

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
            console.log('ZingTouch: panend event.');
            card.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out';
            likeOverlay.style.opacity = 0;
            dislikeOverlay.style.opacity = 0;

            const currentRecipeTitle = recipeTitle.textContent;
            if (currentRecipeTitle && currentRecipeTitle !== 'No recipes found!' && currentRecipeTitle !== 'Recipe is loading...' && currentRecipeTitle !== 'Oops! Something went wrong.') {
                if (Math.abs(distanceX) > threshold) {
                    if (distanceX > threshold) {
                        console.log("Swipe Right detected.");
                        card.classList.add('swipe-right');
                        handleSwipeAction(currentRecipeTitle, 'like');
                    } else {
                        console.log("Swipe Left detected.");
                        card.classList.add('swipe-left');
                        handleSwipeAction(currentRecipeTitle, 'dislike');
                    }
                    setTimeout(() => {
                        loadNextRecipe();
                    }, 300);
                } else {
                    console.log("Pan ended, not a swipe, resetting card.");
                    card.style.transform = 'translateX(0px) translateY(0px) rotate(0deg)';
                }
            } else {
                 console.log("No valid recipe to swipe, resetting card.");
                 card.style.transform = 'translateX(0px) translateY(0px) rotate(0deg)';
            }
        }
    });
} else {
    console.error("ZingTouch or mainContentRegion not found. Swipe functionality might not work.");
}


// Filter Modal Events
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
        console.log('Apply Filters button clicked.');
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
        seenRecipeIds.clear();

        hideModal(filterModal);
        loadNextRecipe();
    });
}
toggleButtons.forEach(button => {
    button.addEventListener('click', () => {
        console.log(`Toggle button '${button.dataset.mealType}' clicked.`);
        toggleButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
    });
});


// === Initialization ===
console.log('script.js: Starting initialization...');
loadNextRecipe();
console.log('script.js: Initialization finished. loadNextRecipe has been called.');