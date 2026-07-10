# BioGraph AI MVP

Pre-Synthesis Computational Assay MVP combining a Django API gateway and a React dashboard utilizing 3Dmol.js to predict protein stability changes (Delta Delta G).

## Codebase Architecture
- `backend/`: Django REST API Gateway connecting to the Hugging Face GNN Stability Predictor model.
- `frontend/`: Vite-scaffolded React Dashboard using Tailwind CSS and 3Dmol.js.

## Getting Started

### 1. Backend Server Setup
```bash
cd backend
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### 2. Frontend Server Setup
```bash
cd frontend
npm install
npm run dev
```

For hosting details and configuration settings, refer to the project deployment documentation.
