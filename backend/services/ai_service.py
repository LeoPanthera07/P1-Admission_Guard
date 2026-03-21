import google.generativeai as genai
from backend.config import settings

try:
    if settings.GEMINI_API_KEY:
        genai.configure(api_key=settings.GEMINI_API_KEY)
except Exception as e:
    print(f"Gemini init error: {e}")

import json

def get_university_suggestions(query: str) -> list[str]:
    """ 
    Calls Gemini API to suggest university or board names matching a partial query.
    """
    if not settings.GEMINI_API_KEY:
        return [f"{query} University", f"{query} Institute of Technology"]
        
    model = genai.GenerativeModel('gemini-1.5-flash')
    prompt = f"Suggest 5 real university or board names that match the partial input '{query}'. Return ONLY a JSON list of strings, no markdown blocks."
    try:
        response = model.generate_content(prompt)
        text = response.text.strip().replace("```json", "").replace("```", "")
        return json.loads(text)
    except Exception as e:
        print(f"Gemini generate error: {e}")
        return [f"{query} University", f"{query} Institute"]
