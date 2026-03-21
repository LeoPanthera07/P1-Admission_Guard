from backend.models import ApplicationPayload
from datetime import date

class ValidationEngine:
    @staticmethod
    def validate(payload: ApplicationPayload) -> dict:
        """ Performs Tier 1 (Hard Reject) and Tier 2 (Soft Flag) validations. """
        errors = {}
        flags = []
        
        # Chronology Check (Tier 1 & 2)
        if payload.path_taken in ["A", "B"]:
            mid_date = payload.twelfth_completion_date if payload.path_taken == "A" else payload.diploma_completion_date
            if not mid_date or not (payload.tenth_completion_date < mid_date < payload.ug_completion_date):
                errors["chronology"] = f"For Path {payload.path_taken}, dates must follow strictly: 10th < 12th/Diploma < UG."
        elif payload.path_taken == "C":
            if not payload.iti_completion_date or not payload.diploma_completion_date:
                errors["iti_date"] = "Path C strictly requires ITI and Diploma completion dates."
            elif not (payload.tenth_completion_date < payload.iti_completion_date < payload.diploma_completion_date < payload.ug_completion_date):
                errors["chronology"] = "For Path C, dates must follow strictly: 10th < ITI < Diploma < UG."
            
        # Work Experience Repeater Chronology
        for idx, exp in enumerate(payload.work_experience):
            if exp.end_date and exp.end_date <= exp.start_date:
                errors[f"work_dates_{idx}"] = f"Job {idx+1} end date must be after start date."
            if exp.start_date < payload.ug_completion_date:
                flags.append(f"Job {idx+1} ({exp.company}) started before UG completion.")
                
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

    @staticmethod
    def enrich(payload: ApplicationPayload) -> ApplicationPayload:
        """ Performs Tier 3 Enrichment (Derived Math). """
        # Calculate Total Experience Months
        payload.total_exp_months = 0
        for exp in payload.work_experience:
            end = exp.end_date or date.today()
            delta = end - exp.start_date
            payload.total_exp_months += delta.days // 30
            
        # Normalized Score Calculation
        t_score = payload.twelfth_score if payload.path_taken == "A" else payload.diploma_score
        t_score = t_score or 0.0
        if payload.path_taken == "C" and payload.iti_score is not None:
            payload.normalized_score = round((payload.tenth_score + payload.iti_score + t_score + payload.ug_score) / 4.0, 2)
        else:
            payload.normalized_score = round((payload.tenth_score + t_score + payload.ug_score) / 3.0, 2)
            
        # Risk Scoring Algorithm
        base_score = 100
        base_score -= (payload.backlogs * 20)
        
        if payload.normalized_score >= 80.0:
            base_score += 15
            
        # Simplistic Gap Check (if UG finished more than 1 year before first job)
        if payload.work_experience:
            first_job_start = min([w.start_date for w in payload.work_experience])
            if (first_job_start - payload.ug_completion_date).days > 365:
                base_score -= 10
                
        payload.risk_score = base_score
        if base_score >= 80:
            payload.risk_category = "Low"
        elif base_score >= 50:
            payload.risk_category = "Medium"
        else:
            payload.risk_category = "High"
            
        return payload
