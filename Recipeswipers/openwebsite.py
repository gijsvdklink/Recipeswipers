import webbrowser
import time

# URLs to open
# Common frontend live server URL (e.g., VS Code Live Server default)
FRONTEND_URL = "http://127.0.0.1:5500"
# Backend server URL (as defined in this project)
BACKEND_URL = "http://localhost:3000"

def open_urls():
    """
    Opens the predefined frontend and backend URLs in new browser tabs.
    """
    print(f"Attempting to open frontend: {FRONTEND_URL}")
    webbrowser.open_new_tab(FRONTEND_URL)

    # Add a small delay to allow the first tab to initiate opening
    time.sleep(1)

    print(f"Attempting to open backend: {BACKEND_URL}")
    webbrowser.open_new_tab(BACKEND_URL)

    print("\nScript finished.")
    print("If the sites didn't open, ensure your frontend live server (e.g., VS Code Live Server)")
    print("is running and configured for the frontend URL, and your backend server is running for the backend URL.")
    print("You can modify the FRONTEND_URL and BACKEND_URL variables in this script if your ports differ.")

if __name__ == "__main__":
    open_urls()
