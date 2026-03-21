from backend.models import ApplicationPayload

def validate_application(payload: ApplicationPayload) -> dict:
    """ Performs Tier 1 (Hard Reject) and Tier 2 (Soft Flag) validations. """
    errors = {}
    flags = []
    
    # Chronology Check (Tier 1 & 2)
    if payload.path_taken in ["A", "B"]:
        if not (payload.tenth_completion_date < payload.twelfth_or_diploma_completion_date < payload.ug_completion_date):
            errors["chronology"] = f"For Path {payload.path_taken}, dates must follow strictly: 10th < 12th/Diploma < UG."
    elif payload.path_taken == "C":
        if not payload.iti_completion_date:
            errors["iti_date"] = "Path C strictly requires an ITI completion date."
        elif not (payload.tenth_completion_date < payload.iti_completion_date < payload.twelfth_or_diploma_completion_date < payload.ug_completion_date):
            errors["chronology"] = "For Path C, dates must follow strictly: 10th < ITI < Diploma < UG."
        
    if payload.work_start_date and payload.work_end_date:
        if payload.work_start_date < payload.ug_completion_date:
            flags.append("Work started before UG completion.")
        if payload.work_end_date <= payload.work_start_date:
            errors["work_dates"] = "Work end date must be after work start date."
            
    # Normalize paths
    valid_paths = ["A", "B", "C"]
    if payload.path_taken not in valid_paths:
        errors["path_taken"] = f"Path must be one of {valid_paths}"
        
    return {
        "tier1_rejected": len(errors) > 0,
        "errors": errors,
        "tier2_flagged": len(flags) > 0,
        "flags": flags
    }

def enrich_application(payload: ApplicationPayload) -> ApplicationPayload:
    """ Performs Tier 3 Enrichment. """
    # Calculate Total Experience Months
    if payload.work_start_date and payload.work_end_date:
        delta = payload.work_end_date - payload.work_start_date
        payload.total_exp_months = delta.days // 30
    else:
        payload.total_exp_months = 0
        
    # Normalized Score Calculation
    if payload.path_taken == "C" and payload.iti_score is not None:
        payload.normalized_score = round((payload.tenth_score + payload.iti_score + payload.twelfth_or_diploma_score + payload.ug_score) / 4.0, 2)
    else:
        payload.normalized_score = round((payload.tenth_score + payload.twelfth_or_diploma_score + payload.ug_score) / 3.0, 2)
    
    return payload
