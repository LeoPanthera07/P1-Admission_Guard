import google.generativeai as genai
from backend.config import settings

try:
    if settings.GEMINI_API_KEY:
        genai.configure(api_key=settings.GEMINI_API_KEY)
except Exception as e:
    print(f"Gemini init error: {e}")

def get_ai_risk_score(payload: dict) -> float:
    """ 
    Calls Gemini API to evaluate unstructured data or complex patterns in the application 
    and returns a normalized risk score from 0.0 to 1.0.
    """
    if not settings.GEMINI_API_KEY:
        # Development fallback
        return len(payload.get("flagReason", [])) * 0.1
        
    # Placeholder for actual Gemini prompt/response logic
    return 0.0
