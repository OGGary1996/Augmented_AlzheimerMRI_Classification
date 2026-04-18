from pydantic import BaseModel


class ClinicalData(BaseModel):
    FunctionalAssessment: float
    ADL: float
    MemoryComplaints: int
    MMSE: float
    BehavioralProblems: int
