import webbrowser
import time

# URLs to open
# Frontend URL, now served by the backend
FRONTEND_URL = "http://localhost:3000"

def open_urls():
    """
    Opens the predefined frontend URL in a new browser tab.
    """
    print(f"Attempting to open application: {FRONTEND_URL}")
    webbrowser.open_new_tab(FRONTEND_URL)

    print("\nScript finished.")
    print(f"If the site didn't open, ensure your backend server (node server.js) is running.")
    print(f"The application should be accessible at {FRONTEND_URL}.")
    print("You can modify the FRONTEND_URL variable in this script if your port differs.")

if __name__ == "__main__":
    open_urls()
