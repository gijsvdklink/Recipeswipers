require('dotenv').config(); // Laad omgevingsvariabelen
const express = require('express');
const cors = require('cors'); // Nodig voor communicatie met frontend
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Schakel CORS in (laat frontend verbinden)
app.use(express.json()); // Voor het parsen van JSON body's

// In-memory opslag voor MVP gebruikers en swipe-geschiedenis (NIET voor productie!)
const users = {}; // { username: { password, preferences: {}, likedRecipes: [], dislikedRecipes: [] } }

// Initialiseer Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

// === API Endpoints ===

// Endpoint voor gebruikersregistratie
app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: 'Gebruikersnaam en wachtwoord verplicht.' });
    if (users[username]) return res.status(409).json({ message: 'Gebruikersnaam bestaat al.' });

    users[username] = { password: password, preferences: {}, likedRecipes: [], dislikedRecipes: [] };
    console.log(`Nieuwe gebruiker: ${username}`);
    res.status(201).json({ message: 'Registratie succesvol!', userId: username });
});

// Endpoint voor gebruikerslogin
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: 'Gebruikersnaam en wachtwoord verplicht.' });
    const user = users[username];
    if (!user || user.password !== password) return res.status(401).json({ message: 'Ongeldige gebruikersnaam of wachtwoord.' });

    console.log(`Gebruiker ingelogd: ${username}`);
    res.json({ message: 'Login succesvol!', userId: username });
});

// Endpoint om swipe-acties op te slaan
app.post('/api/swipe', (req, res) => {
    const { userId, recipeId, direction } = req.body;
    if (!userId || !recipeId || !direction) return res.status(400).json({ message: 'Ontbrekende swipe-informatie.' });
    const user = users[userId];
    if (!user) return res.status(404).json({ message: 'Gebruiker niet gevonden.' });

    if (direction === 'like') {
        if (!user.likedRecipes.includes(recipeId)) user.likedRecipes.push(recipeId);
        user.dislikedRecipes = user.dislikedRecipes.filter(id => id !== recipeId);
    } else if (direction === 'dislike') {
        if (!user.dislikedRecipes.includes(recipeId)) user.dislikedRecipes.push(recipeId);
        user.likedRecipes = user.likedRecipes.filter(id => id !== recipeId);
    } else {
        return res.status(400).json({ message: 'Ongeldige swipe-richting.' });
    }
    console.log(`Swipe voor ${userId}: ${recipeId} - ${direction}`);
    res.status(200).json({ message: 'Swipe geregistreerd.' });
});

// Endpoint om gebruikersvoorkeuren op te slaan
app.post('/api/preferences', (req, res) => {
    const { userId, preferences } = req.body;
    if (!userId || !preferences) return res.status(400).json({ message: 'Ontbrekende voorkeuren.' });
    const user = users[userId];
    if (!user) return res.status(404).json({ message: 'Gebruiker niet gevonden.' });

    user.preferences = { ...user.preferences, ...preferences };
    console.log(`Voorkeuren voor ${userId} opgeslagen:`, user.preferences);
    res.status(200).json({ message: 'Voorkeuren opgeslagen.' });
});

// Endpoint om AI-gegenereerde recepten op te halen
app.get('/api/recipe', async (req, res) => {
    const { mealType, ingredients, budget, people, userId } = req.query; // Haal userId ook op

    let prompt = `Genereer één uniek, creatief en praktisch recept. Geef de uitvoer als een JSON-object met de volgende structuur:
{
  "id": "unieke_string_id",
  "titel": "string",
  "korte_beschrijving": "string (max 2 zinnen, engaging and concise)"
}
Do not include fields such as imageUrl, bereidingstijd_minuten, moeilijkheidsgraad, ingredienten, or instructies in the JSON response.`;
    if (mealType) prompt += `\n- Type maaltijd: ${mealType}.`;
    if (ingredients) prompt += `\n- Moet deze ingrediënten bevatten: ${ingredients}.`; // Assuming ingredients is a string from query
    if (budget) prompt += `\n- Budget: ${budget}.`;
    if (people) prompt += `\n- Aantal personen: ${people}.`;
    prompt += `\nZorg dat het recept niet te complex is en geef een unieke ID die past bij het recept.`;

    // Voeg disliked recepten van de gebruiker toe aan de prompt als userId bekend is
    if (userId && users[userId] && users[userId].dislikedRecipes.length > 0) {
        prompt += `\n- Vermijd recepten die lijken op (ID's): ${users[userId].dislikedRecipes.join(', ')}. Genereer iets nieuws.`;
    }
    prompt += "\n\nBelangrijk: Geef ALLEEN het JSON object terug, zonder extra tekst ervoor of erna. Zorg dat de JSON geldig is."

    if (!process.env.GEMINI_API_KEY) {
        console.error("GEMINI_API_KEY is not configured.");
        return res.status(503).json({
            error: "Server configuration error",
            message: "GEMINI_API_KEY is not configured. Please check server environment variables."
        });
    }

    try {
        console.log("AI Prompt:", prompt);
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        console.log("Raw AI Response:", text);

        const cleanedText = text.replace(/```json|```/g, '').trim();
        const parsedRecipe = JSON.parse(cleanedText);

        res.json(parsedRecipe);

    } catch (error) {
        console.error('Fout bij AI receptgeneratie:', error);
        if (error.response && error.response.text) {
            console.error('Ruwe AI-respons bij fout (om te debuggen):', error.response.text());
        }
        res.status(500).json({ error: 'Kon geen recept genereren. Probeer opnieuw.', details: error.message });
    }
});


// Start de server
app.listen(PORT, () => {
    console.log(`Backend server draait op http://localhost:${PORT}`);
});