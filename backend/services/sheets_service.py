import gspread
from backend.config import settings
import base64
import json

def get_sheets_client():
    if not settings.GOOGLE_SHEETS_CREDENTIALS_BASE64:
        return None
    try:
        creds_json = base64.b64decode(settings.GOOGLE_SHEETS_CREDENTIALS_BASE64).decode('utf-8')
        creds_dict = json.loads(creds_json)
        return gspread.service_account_from_dict(creds_dict)
    except Exception as e:
        print(f"Error loading sheets credentials: {e}")
        return None

def save_application_to_sheets(payload: dict) -> bool:
    """ Appends the validated application to the Google Sheet. """
    client = get_sheets_client()
    if not client:
        # Placeholder for dev mode or when no sheet is configured
        print(f"Would save to sheets: {payload}")
        return True
        
    try:
        sheet = client.open_by_key(settings.GOOGLE_SHEET_ID).sheet1
        # Extract ordered values according to your columns
        row = [
            payload.get("fullName"),
            payload.get("email"),
            payload.get("phone"),
            payload.get("tenthScore"),
            payload.get("itiScore", ""),
            payload.get("twelfthOrDiplomaScore"),
            payload.get("ugScore"),
            payload.get("normalizedScore"),
            payload.get("totalExpMonths"),
            payload.get("pathTaken"),
            payload.get("isFlagged"),
            ", ".join(payload.get("flagReason", []))
        ]
        sheet.append_row(row)
        return True
    except Exception as e:
        print(f"Failed to append row: {e}")
        return False
