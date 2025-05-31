# Recipeswipers Project

This project consists of a frontend application and a backend API for suggesting recipes.

## Project Structure

- `/frontend`: Contains the HTML, CSS, and JavaScript for the user interface.
- `/backend`: Contains the Node.js Express server and API logic, including integration with the Gemini AI for recipe generation.
- `openwebsite.py`: A utility script to quickly open the default frontend and backend URLs in your web browser.

## Running the Application

### 1. Backend Server

- Navigate to the `Recipeswipers/backend` directory.
- **Important:** Ensure you have a `.env` file in this directory with your `GEMINI_API_KEY`. Example:
  ```
  GEMINI_API_KEY=your_actual_api_key_here
  PORT=3000
  ```
- Install dependencies: `npm install`
- Start the server: `npm start` (or `npm run dev` for development with nodemon)
- The backend will typically run on `http://localhost:3000`.

### 2. Frontend Application

- The frontend consists of static files in `Recipeswipers/frontend`.
- You'll need to serve these files using a local web server. A common way is to use the "Live Server" extension in VS Code (which often defaults to `http://127.0.0.1:5500`).
- Open `Recipeswipers/frontend/index.html` with your live server.

### 3. Using `openwebsite.py`

To quickly open the typical URLs for both the frontend live server and the backend server:

- Make sure you are in the main `Recipeswipers` directory in your terminal.
- Run the script using Python:
  ```bash
  python openwebsite.py
  ```
- This will attempt to open:
    - `http://127.0.0.1:5500` (for the frontend)
    - `http://localhost:3000` (for the backend)
- If your ports are different, you can modify the `FRONTEND_URL` and `BACKEND_URL` variables directly within the `openwebsite.py` script.

## Error: "Kon geen recept laden"

If you encounter the "Kon geen recept laden" (Could not load recipe) error in the frontend:

1.  **Check your `GEMINI_API_KEY`**: Ensure the `GEMINI_API_KEY` in `Recipeswipers/backend/.env` is correct and active. The backend server console will show an error if the key is missing or invalid.
2.  **Check Backend Server Logs**: Look at the console output from your backend server. It might show errors related to the AI API call (e.g., "Fout bij AI receptgeneratie") or provide a "Raw AI Response" that was not valid JSON.
3.  **Check Browser Developer Console (F12)**: In the Network tab, inspect the failed `/api/recipe` request. The response might give more details.
