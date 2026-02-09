# Alzheimer's Classification API

FastAPI server for predicting Alzheimer's diagnosis based on clinical data.

## Installation

Install the required dependencies:
```bash
pip install fastapi uvicorn joblib xgboost pandas numpy scikit-learn
```

## Running the Server

From the FastAPIServer directory:
```bash
uvicorn main:app --reload
```

Or from the project root:
```bash
uvicorn FastAPIServer.main:app --reload
```

The server will start at `http://127.0.0.1:8000`

## API Documentation

Once the server is running, visit:
- Swagger UI: `http://127.0.0.1:8000/docs`
- ReDoc: `http://127.0.0.1:8000/redoc`

## Endpoints

### POST /predict/clinical

Predicts Alzheimer's diagnosis based on clinical features.

**Request Body:**
```json
{
  "FunctionalAssessment": 5.5,
  "ADL": 4.2,
  "MemoryComplaints": 1,
  "MMSE": 28.5,
  "BehavioralProblems": 0
}
```

**Response:**
```json
{
  "prediction": 0,
  "diagnosis": "Negative",
  "probability": 0.15
}
```

- `prediction`: 0 (Negative) or 1 (Positive)
- `diagnosis`: "Negative" or "Positive"
- `probability`: Probability of positive diagnosis (0-1)

## Testing the API

### Using curl:
```bash
curl -X POST "http://127.0.0.1:8000/predict/clinical" \
  -H "Content-Type: application/json" \
  -d '{
    "FunctionalAssessment": 5.5,
    "ADL": 4.2,
    "MemoryComplaints": 1,
    "MMSE": 28.5,
    "BehavioralProblems": 0
  }'
```

### Using Python:
```python
import requests

url = "http://127.0.0.1:8000/predict/clinical"
data = {
    "FunctionalAssessment": 5.5,
    "ADL": 4.2,
    "MemoryComplaints": 1,
    "MMSE": 28.5,
    "BehavioralProblems": 0
}

response = requests.post(url, json=data)
print(response.json())
```

## Feature Descriptions

- **FunctionalAssessment**: Functional assessment score (float)
- **ADL**: Activities of Daily Living score (float)
- **MemoryComplaints**: Memory complaints indicator (0 or 1)
- **MMSE**: Mini-Mental State Examination score (float, typically 0-30)
- **BehavioralProblems**: Behavioral problems indicator (0 or 1)
