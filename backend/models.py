from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List
from datetime import date

def to_camel(string: str) -> str:
    parts = iter(string.split("_"))
    return next(parts) + "".join(i.title() for i in parts)

class BaseSchema(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True
    )

class WorkExperience(BaseSchema):
    company: str
    start_date: date
    end_date: Optional[date] = None

class ApplicationPayload(BaseSchema):
    # Basic info
    full_name: str
    email: str
    phone: str
    university_name: str = Field(..., description="University or Board Name")
    
    # Dates for chronology validation dynamically based on Path
    tenth_completion_date: date
    iti_completion_date: Optional[date] = None
    twelfth_completion_date: Optional[date] = None
    diploma_completion_date: Optional[date] = None
    ug_completion_date: date
    
    # Repeater fields
    work_experience: List[WorkExperience] = Field(default_factory=list)
    backlogs: int = 0
    
    # Scores (Internal storage must be Percentage Float)
    tenth_score: float = Field(..., description="Percentage form")
    iti_score: Optional[float] = Field(None, description="Percentage form")
    twelfth_score: Optional[float] = Field(None, description="Percentage form")
    diploma_score: Optional[float] = Field(None, description="Percentage form")
    ug_score: float = Field(..., description="Percentage form")
    
    """
    Path A: 10th -> 12th -> UG
    Path B: 10th -> Diploma -> UG (Lateral)
    Path C: 10th -> ITI -> Diploma -> UG
    """
    path_taken: str = Field(..., description="e.g. 'A', 'B', 'C' indicating educational path")

    # Enrichment fields (Tier 3)
    is_flagged: bool = False
    flag_reason: list[str] = Field(default_factory=list)
    total_exp_months: int = 0
    normalized_score: float = 0.0
    risk_score: float = 0.0
    risk_category: str = "Low"
