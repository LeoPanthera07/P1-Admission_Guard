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
        work_exp = payload.get("workExperience", [])
        work_exp_str = " | ".join([f"{w.get('company')} ({w.get('startDate')} to {w.get('endDate') or 'Present'})" for w in work_exp]) if work_exp else "None"

        row = [
            payload.get("fullName"),
            payload.get("email"),
            payload.get("phone"),
            payload.get("pathTaken"),
            payload.get("tenthCompletionDate"),
            payload.get("tenthScore"),
            payload.get("itiCompletionDate", ""),
            payload.get("itiScore", ""),
            payload.get("twelfthOrDiplomaCompletionDate"),
            payload.get("twelfthOrDiplomaScore"),
            payload.get("ugCompletionDate"),
            payload.get("ugScore"),
            work_exp_str,
            payload.get("backlogs", 0),
            payload.get("normalizedScore"),
            payload.get("totalExpMonths"),
            payload.get("riskCategory", "Low"),
            payload.get("isFlagged"),
            ", ".join(payload.get("flagReason", []))
        ]
        sheet.append_row(row)
        return True
    except Exception as e:
        print(f"Failed to append row: {e}")
        return False
