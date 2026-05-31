# 🧠 BrainSeg AI

**Automated Brain Tumor Segmentation & Analysis System**

BrainSeg AI is a full-stack medical imaging application that combines a 3D U-Net deep learning model for brain tumor segmentation with MedGemma AI for clinical analysis. It supports multi-modal MRI input (T1, T1ce, T2, FLAIR) and generates detailed PDF reports for clinical use.

---

## ✨ Features

- **3D U-Net Segmentation** — Trained on BraTS dataset, detects 4 tumor classes: Necrotic Core, Edema, Enhancing Tumor, and Background
- **MedGemma AI Analysis** — Google's medical vision-language model provides clinical descriptions of MRI findings
- **Multi-format Support** — Accepts `.nii`, `.nii.gz`, `.dcm`, `.jpg`, `.png`, `.bmp`, `.tiff`
- **4-Modality Input** — Upload T1, T1ce, T2, and FLAIR simultaneously for best accuracy
- **Patient Management** — Create and manage patient records with scan history
- **PDF Reports** — Auto-generated clinical reports with images, segmentation results, and AI analysis
- **Modern UI** — Dark-themed React frontend with real-time progress tracking

---

## 🖼️ Screenshots

| Dashboard | Analysis | Segmentation Results |
|-----------|----------|----------------------|
| Patient overview & recent scans | Upload MRI + run analysis | 4-modality overlays with tumor classes |

---

## 🏗️ Architecture

```
brainseg-ai/
├── brainseg-backend/          # FastAPI backend
│   ├── main.py                # API endpoints
│   ├── models/
│   │   └── database.py        # SQLAlchemy models (Patient, Scan)
│   ├── services/
│   │   ├── segmentation.py    # 3D U-Net inference (TensorFlow)
│   │   ├── medgemma.py        # MedGemma AI analysis
│   │   └── pdf_service.py     # PDF report generation
│   └── requirements.txt
└── brainseg-frontend/         # React frontend
    └── src/
        ├── pages/
        │   ├── Dashboard.jsx  # Stats overview
        │   ├── Analysis.jsx   # MRI upload & results
        │   ├── Patients.jsx   # Patient management
        │   └── History.jsx    # Scan history
        └── App.jsx
```

---

## 🚀 Getting Started

### Prerequisites

- Python 3.10+
- Node.js 20+
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/brainseg-ai.git
cd brainseg-ai
```

### 2. Backend Setup

```bash
cd brainseg-backend

# Create virtual environment
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # Linux/Mac

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and add your HF_TOKEN and model path
```

### 3. Add Your Model

Place your trained model file in the backend folder and update `.env`:

```env
HF_TOKEN=hf_your_huggingface_token_here
UNET_WEIGHTS=path/to/brainseg_final.keras
DATABASE_URL=sqlite:///./brainseg.db
```

### 4. Start the Backend

```bash
uvicorn main:app --reload --port 8000
```

API docs available at **http://localhost:8000/docs**

### 5. Frontend Setup

```bash
cd brainseg-frontend
npm install
npm run dev
```

Open **http://localhost:5173**

---

## 🔬 Model Details

| Property | Value |
|----------|-------|
| Architecture | 3D U-Net |
| Framework | TensorFlow / Keras |
| Input Shape | `(1, 128, 128, 128, 4)` |
| Output Shape | `(1, 128, 128, 128, 4)` |
| Input Modalities | FLAIR, T1, T1ce, T2 |
| Output Classes | Background, Necrotic Core, Edema, Enhancing Tumor |
| Training Dataset | BraTS (Brain Tumor Segmentation) |
| Normalization | MinMaxScaler per volume |

### Tumor Classes & Colors

| Class | Color | Description |
|-------|-------|-------------|
| Background | ⬛ Black | Normal brain tissue |
| Necrotic Core | 🔴 Red | Dead tumor cells |
| Edema | 🩵 Cyan | Swelling around tumor |
| Enhancing Tumor | 🟡 Yellow | Active tumor region |

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Health check |
| `POST` | `/patients` | Create patient |
| `GET` | `/patients` | List all patients |
| `GET` | `/patients/{id}` | Get patient |
| `DELETE` | `/patients/{id}` | Delete patient |
| `GET` | `/patients/{id}/scans` | Get patient scans |
| `POST` | `/analyze/{patient_id}` | Analyze single MRI file |
| `POST` | `/analyze4ch/{patient_id}` | Analyze 4 modality files |
| `GET` | `/report/{scan_id}` | Download PDF report |

---

## 🌐 Deployment (Render)

This project is configured for deployment on [Render](https://render.com) using the included `render.yaml`.

### Steps

1. Push to GitHub
2. Go to [render.com](https://render.com) → **New** → **Blueprint**
3. Connect your GitHub repo
4. Set environment variables in the Render dashboard:

| Variable | Value |
|----------|-------|
| `HF_TOKEN` | Your Hugging Face token |
| `FRONTEND_URL` | Your deployed frontend URL |
| `UNET_WEIGHTS` | Path to your model file |

> **Note:** The 3D U-Net model requires significant RAM. Use at least the **Standard** plan on Render, or consider running inference on Google Colab with GPU for faster results.

---

## 🧪 Usage

### Single File Analysis

1. Go to **Patients** → create a patient → note the ID
2. Go to **New Scan** → select **Single File** mode
3. Enter the patient ID → upload any MRI file
4. Click **Run Analysis** → view results and download PDF

### 4-Modality Analysis (Best Accuracy)

1. Go to **New Scan** → select **4 Modalities** mode
2. Upload T1, T1ce, T2, and FLAIR NIfTI files
3. Click **Run Analysis** → view all 4 overlays with tumor segmentation

---

## 📋 Requirements

```
fastapi
uvicorn[standard]
python-multipart
sqlalchemy
psycopg2-binary
pillow
tensorflow
scikit-learn
huggingface_hub
transformers
accelerate
reportlab
nibabel
pydicom
pydantic
python-dotenv
```

---

## ⚠️ Disclaimer

BrainSeg AI is intended for **research and educational purposes only**. It is not a certified medical device and should not be used as a substitute for professional medical diagnosis. Always consult a qualified radiologist for clinical decisions.

---

## 👩‍💻 Author

**Fatima** — Software Engineering Student, Ajloun National University  
AI/ML Engineering · Medical Imaging · Deep Learning

---

## 📄 License

This project is licensed under the MIT License.
