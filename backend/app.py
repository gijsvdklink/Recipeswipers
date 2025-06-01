import os
import json
import re
from flask import Flask, send_from_directory, jsonify, request
from dotenv import load_dotenv

from flask_cors import CORS

import google.generativeai as genai

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
CORS(app) # Enable CORS for all routes

PORT = int(os.getenv('PORT', 5000))

GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
if not GEMINI_API_KEY:
    print("CRITICAL ERROR: GEMINI_API_KEY is not set in .env. Recipe generation will fail.")
    model = None
else:
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel("gemini-1.5-flash-latest")
        print("Gemini 'gemini-1.5-flash-latest' model loaded successfully.")
    except Exception as e:
        print(f"CRITICAL ERROR: Could not load the Gemini model 'gemini-1.5-flash-latest'. Details: {e}")
        print("Please check your GEMINI_API_KEY validity, regional access, or model availability.")
        model = None


FRONTEND_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../frontend')

@app.route('/<path:filename>')
def serve_frontend_static(filename):
    return send_from_directory(FRONTEND_FOLDER, filename)

@app.route('/')
def serve_index():
    return send_from_directory(FRONTEND_FOLDER, 'index.html')

@app.route('/api/recipe')
def get_recipe():
    print("\n--- /api/recipe called ---")
    if not model:
        print("ERROR: Gemini model is not loaded. Returning 503.")
        return jsonify({'error': 'Gemini model is not loaded, cannot generate recipe. Check backend console.'}), 503

    meal_type = request.args.get('mealType', '')
    ingredients = request.args.get('ingredients', '')
    budget = request.args.get('budget', '')
    people = request.args.get('people', '')

    # --- AANGEPASTE AI PROMPT: VRAAGT NU MEER DETAILS ---
    prompt = f"""Generate one unique, creative, and practical recipe. Provide the output strictly as a JSON object with the following structure:
{{
  "id": "unique_string_id",
  "title": "string",
  "short_description": "string (max 2 sentences, engaging and concise)",
  "image_url": "string (a placeholder URL for an image, e.g., from Unsplash.com or LoremPicsum.photos)",
  "preparation_time_minutes": "integer",
  "difficulty": "string (e.g., 'Easy', 'Medium', 'Hard')",
  "ingredients": [
    "string (ingredient 1)",
    "string (ingredient 2)",
    "..."
  ],
  "instructions": [
    "string (step 1)",
    "string (step 2)",
    "..."
  ]
}}
Ensure the recipe is not too complex and provide a unique ID that fits the recipe.
For 'image_url', use a generic placeholder like 'https://picsum.photos/400/300?random=1'
"""
    if meal_type:
        prompt += f"\n- Meal type: {meal_type}."
    if ingredients:
        prompt += f"\n- Must contain these ingredients: {ingredients}."
    if budget:
        prompt += f"\n- Budget: {budget}."
    if people:
        prompt += f"\n- Number of people: {people}."

    prompt += "\n\nImportant: ONLY return the JSON object, without any extra text before or after it. Ensure the JSON is valid and complete."

    try:
        print(f"AI Prompt:\n---\n{prompt}\n---")
        response = model.generate_content(prompt)
        raw_text = response.text
        print(f"Raw AI Response:\n---\n{raw_text}\n---")

        json_match = re.search(r'```json\s*(\{.*\})\s*```', raw_text, re.DOTALL)
        if json_match:
            cleaned_json_string = json_match.group(1)
            print(f"JSON detected in markdown block. Cleaned string:\n{cleaned_json_string}")
        else:
            json_start = raw_text.find('{')
            json_end = raw_text.rfind('}')
            if json_start != -1 and json_end != -1:
                cleaned_json_string = raw_text[json_start : json_end + 1]
                print(f"JSON detected by curly braces. Cleaned string:\n{cleaned_json_string}")
            else:
                print("No valid JSON object (or markdown block) found in the AI response.")
                raise ValueError("No valid JSON object found in the AI response.")

        parsed_recipe = json.loads(cleaned_json_string)
        # --- AANGEPASTE PARSING: INCLUSIEF NIEUWE VELDEN ---
        recipe_output = {
            'id': parsed_recipe.get('id', 'default_id_' + str(os.urandom(4).hex())), # Generate unique ID
            'title': parsed_recipe.get('title', 'Unknown Recipe'),
            'short_description': parsed_recipe.get('short_description', 'No description available.'),
            'image_url': parsed_recipe.get('image_url', 'https://picsum.photos/400/300?random=1'),
            'preparation_time_minutes': parsed_recipe.get('preparation_time_minutes', None),
            'difficulty': parsed_recipe.get('difficulty', None),
            'ingredients': parsed_recipe.get('ingredients', []),
            'instructions': parsed_recipe.get('instructions', [])
        }
        print(f"Successfully parsed recipe_output:\n{json.dumps(recipe_output, indent=2)}")
        return jsonify(recipe_output)

    except json.JSONDecodeError as e:
        print(f"ERROR: Failed to parse JSON from AI response: {e}")
        print(f"Raw AI text that caused JSON error:\n---\n{raw_text}\n---")
        return jsonify({'error': 'Error processing AI response: invalid JSON format. See backend console for raw AI text.'}), 500
    except Exception as e:
        print(f"ERROR during AI recipe generation: {e}")
        return jsonify({'error': f'Could not generate recipe. Please try again. Details: {e}'}), 500

@app.route('/hello')
def hello_world():
    return 'Hello from the Python Backend!'

if __name__ == '__main__':
    print(f"Backend server running on http://127.0.0.1:{PORT}")
    print(f"Open your browser and go to http://127.0.0.1:{PORT}")
    app.run(debug=True, port=PORT, host='0.0.0.0') # AANGEPAST: host='0.0.0.0' toegevoegd