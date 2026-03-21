from fastapi import FastAPI, HTTPException, status
from pydantic import ValidationError
from backend.models import ApplicationPayload
from backend.services.validation_service import validate_application, enrich_application
from backend.services.sheets_service import save_application_to_sheets

app = FastAPI(title="AdmitGuard v2 API")

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/apply")
def submit_application(payload: ApplicationPayload):
    # Tier 1 & 2 validation checks specific to business logic 
    # (Note: Tier 1 pure format validation is already done by Pydantic)
    validation_result = validate_application(payload)
    
    if validation_result.get("tier1_rejected"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=validation_result.get("errors")
        )
    
    # Tier 2 Soft Flagging
    if validation_result.get("tier2_flagged"):
        payload.is_flagged = True
        payload.flag_reason = validation_result.get("flags", [])
        
    # Tier 3 (Enrichment)
    payload = enrich_application(payload)
    
    # Save to Google Sheets
    payload_dict = payload.model_dump(by_alias=True)
    save_success = save_application_to_sheets(payload_dict)
    
    return {
        "status": "success",
        "message": "Application processed and saved" if save_success else "Processed but failed to save",
        "data": payload_dict
    }
