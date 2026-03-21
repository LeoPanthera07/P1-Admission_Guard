import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GOOGLE_SHEETS_CREDENTIALS_BASE64: str = os.getenv("GOOGLE_SHEETS_CREDENTIALS_BASE64", "")
    GOOGLE_SHEET_ID: str = os.getenv("GOOGLE_SHEET_ID", "")
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")

settings = Settings()
