import os
from dotenv import load_dotenv
import google.generativeai as genai

# Load environment variables from .env file
# This is crucial to get your GEMINI_API_KEY
load_dotenv()

# Get the API key from environment variables
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')

if not GEMINI_API_KEY:
    print("ERROR: GEMINI_API_KEY not found in your .env file.")
    print("Please ensure your .env file in the 'backend' folder contains: GEMINI_API_KEY=YOUR_KEY_HERE")
    exit()

print(f"API Key loaded. First 5 chars: {GEMINI_API_KEY[:5]}...")

# Configure the Gemini API
try:
    genai.configure(api_key=GEMINI_API_KEY)
    print("Gemini API configured successfully.")
except Exception as e:
    print(f"ERROR: Could not configure Gemini API. Details: {e}")
    print("Please check if your GEMINI_API_KEY is valid and correctly formatted.")
    exit()

# Initialize the Gemini model with the newly found working model name
try:
    # Use the model name identified from the list_gemini_models.py output
    model = genai.GenerativeModel("gemini-1.5-flash-latest")
    print("Gemini 'gemini-1.5-flash-latest' model loaded successfully.")
except Exception as e:
    print(f"ERROR: Could not load Gemini model 'gemini-1.5-flash-latest'. Details: {e}")
    print("This might happen if the model is not available or your API key has restrictions.")
    exit()

# Define a simple test prompt
test_prompt = "Give me a very short, simple recipe idea, e.g., for scrambled eggs. Respond in 2-3 sentences."

print(f"\nSending test prompt to Gemini: '{test_prompt}'")

# Generate content from the model
try:
    response = model.generate_content(test_prompt)
    print("\n--- Gemini Response (Raw Text) ---")
    print(response.text)
    print("\n--- End Response ---")

    # Optional: Try to parse it as JSON if you expect JSON, though for this simple test, raw text is enough
    # If you want to see how the JSON parsing in app.py would work, uncomment this block
    # import json
    # import re
    # json_match = re.search(r'```json\s*(\{.*\})\s*```', response.text, re.DOTALL)
    # if json_match:
    #     cleaned_json_string = json_match.group(1)
    #     try:
    #         parsed_data = json.loads(cleaned_json_string)
    #         print("\n--- Parsed JSON ---")
    #         print(json.dumps(parsed_data, indent=2))
    #     except json.JSONDecodeError:
    #         print("\n--- Raw response was not valid JSON, even after cleaning ---")
    # else:
    #     print("\n--- No valid JSON found in response (not in markdown block) ---")

except Exception as e:
    print(f"ERROR: Failed to get response from Gemini. Details: {e}")
    print("This often indicates a network issue, an invalid API key, or an issue with the Gemini service itself.")