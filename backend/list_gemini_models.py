import os
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')

if not GEMINI_API_KEY:
    print("ERROR: GEMINI_API_KEY not found in .env file.")
    exit()

try:
    genai.configure(api_key=GEMINI_API_KEY)
    print("Gemini API configured.")
except Exception as e:
    print(f"ERROR configuring Gemini API: {e}")
    exit()

print("\nListing available Gemini models that support 'generateContent':")
found_model = False
for m in genai.list_models():
    if "generateContent" in m.supported_generation_methods:
        print(f"  - Model Name: {m.name}, Supported Methods: {m.supported_generation_methods}")
        found_model = True

if not found_model:
    print("No models supporting 'generateContent' found. This might indicate an API key issue or regional restrictions.")