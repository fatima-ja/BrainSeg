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
- **NIfTI Output with Mask** — Saves the original MRI alongside a label map NIfTI file with the segmentation mask, ready for 3D visualization in 3D Slicer and ITK-SNAP
- **3D Tumor Visualization** — Label map files use corrected spatial affine matrices for accurate alignment with the original MRI in 3D viewers
- **Modern UI** — Dark-themed React frontend with real-time progress tracking

---

## 🏗️ Architecture

```
brainseg-ai/
├── brainseg-backend/
│   ├── main.py
│   ├── models/
│   │   └── database.py
│   ├── services/
│   │   ├── segmentation.py
│   │   ├── medgemma.py
│   │   └── pdf_service.py
│   └── requirements.txt
└── brainseg-frontend/
    └── src/
        ├── pages/
        │   ├── Dashboard.jsx
        │   ├── Analysis.jsx
        │   ├── Patients.jsx
        │   └── History.jsx
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
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # Linux/Mac
pip install -r requirements.txt
cp .env.example .env
# Edit .env and fill in HF_TOKEN and model path
```


### 3. Start the Backend

```bash
uvicorn main:app --reload --port 8000
```

API docs: **http://localhost:8000/docs**

### 4. Frontend Setup

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
| Input Modalities | T1, T1ce, T2, FLAIR |
| Output Classes | Background, Necrotic Core, Edema, Enhancing Tumor |
| Training Dataset | BraTS 2020 (369 scans) |
| Normalization | Z-score on non-zero voxels |
| Crop | Center crop to 128 × 128 × 128 |

### Tumor Classes

| Class | Label | Color |
|-------|-------|-------|
| Background | 0 | ⬛ Black |
| Necrotic Core | 1 | 🔴 Red |
| Edema | 2 | 🟢 Green |
| Enhancing Tumor | 3 | 🔵 Blue |

---

## 📁 NIfTI Output with Segmentation Mask

After each analysis, BrainSeg AI automatically saves files in a per-patient folder:

```
patient_images/
└── patient_1_name/
    └── scan_<uuid>/
        ├── t1.nii.gz                    ← original T1
        ├── t1ce.nii.gz                  ← original T1ce
        ├── t2.nii.gz                    ← original T2
        ├── flair.nii.gz                 ← original FLAIR
        ├── t1ce_original_<uuid>.nii.gz  ← full-resolution T1ce copy
        ├── label_map_<uuid>.nii.gz      ← segmentation mask (spatially aligned)
        └── HOW_TO_VIEW_3D.txt           ← step-by-step 3D Slicer instructions
```

The label map uses a **corrected affine matrix** that accounts for the center-crop preprocessing, ensuring the mask aligns perfectly with the original full-resolution MRI.

### Viewing in 3D Slicer

1. Download **3D Slicer**: https://www.slicer.org
2. **File → Add Data** → load both:
   - `t1ce_original_*.nii.gz` — MRI scan
   - `label_map_*.nii.gz` — tumor labels
3. For the label map: check **Show Options** → set Description = `LabelMap`
4. Adjust overlay opacity in the Volumes module
5. **Segment Editor → Show 3D** for full 3D tumor view

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
scipy
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

**Fatima Al-Jawarneh** — Software Engineering Student, Ajloun National University
AI/ML Engineering · Medical Imaging · Deep Learning

---

## 📄 License

This project is licensed under the MIT License.
