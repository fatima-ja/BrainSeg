import os
import shutil
import uuid
import numpy as np

from fastapi import FastAPI, UploadFile, File, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel

from models.database import get_db, Patient, Scan
from services.segmentation import run_segmentation, run_segmentation_4ch
from services.pdf_service import generate_pdf

# ─── App Setup ───────────────────────────────────────────────────────────────

app = FastAPI(title="BrainSeg AI API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR  = os.getenv("UPLOAD_DIR",  "uploads")
REPORT_DIR  = os.getenv("REPORT_DIR",  "reports")
PATIENT_DIR = os.getenv("PATIENT_DIR", "patient_images")

os.makedirs(UPLOAD_DIR,  exist_ok=True)
os.makedirs(REPORT_DIR,  exist_ok=True)
os.makedirs(PATIENT_DIR, exist_ok=True)

app.mount("/uploads",        StaticFiles(directory=UPLOAD_DIR),  name="uploads")
app.mount("/patient_images", StaticFiles(directory=PATIENT_DIR), name="patient_images")

ALLOWED_EXTENSIONS = {".nii", ".gz", ".dcm", ".jpg", ".jpeg", ".png", ".bmp", ".tiff"}

# ─── Health ──────────────────────────────────────────────────────────────────

@app.get("/")
def health():
    return {"status": "BrainSeg AI backend running", "version": "1.0.0"}

# ─── Patients ────────────────────────────────────────────────────────────────

class PatientCreate(BaseModel):
    name:   str
    age:    int
    gender: str
    notes:  str = ""

@app.post("/patients", status_code=201)
def create_patient(body: PatientCreate, db: Session = Depends(get_db)):
    patient = Patient(**body.dict())
    db.add(patient); db.commit(); db.refresh(patient)
    _patient_folder(patient.id, patient.name)
    return patient

@app.get("/patients")
def get_patients(db: Session = Depends(get_db)):
    return db.query(Patient).order_by(Patient.created_at.desc()).all()

@app.get("/patients/{patient_id}")
def get_patient(patient_id: int, db: Session = Depends(get_db)):
    p = db.query(Patient).filter(Patient.id == patient_id).first()
    if not p:
        raise HTTPException(404, "Patient not found")
    return p

@app.delete("/patients/{patient_id}")
def delete_patient(patient_id: int, db: Session = Depends(get_db)):
    p = db.query(Patient).filter(Patient.id == patient_id).first()
    if not p:
        raise HTTPException(404, "Patient not found")
    db.delete(p); db.commit()
    return {"message": "Patient deleted"}

@app.get("/patients/{patient_id}/scans")
def get_scans(patient_id: int, db: Session = Depends(get_db)):
    return db.query(Scan).filter(
        Scan.patient_id == patient_id
    ).order_by(Scan.created_at.desc()).all()

@app.get("/scans/{scan_id}")
def get_scan(scan_id: int, db: Session = Depends(get_db)):
    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    if not scan:
        raise HTTPException(404, "Scan not found")
    return scan

@app.delete("/scans/{scan_id}")
def delete_scan(scan_id: int, db: Session = Depends(get_db)):
    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    if not scan:
        raise HTTPException(404, "Scan not found")
    db.delete(scan); db.commit()
    return {"message": "Scan deleted"}

# ─── Helpers ─────────────────────────────────────────────────────────────────

def _norm(p: str) -> str:
    return p.replace("\\", "/") if p else p


def _patient_folder(patient_id: int, patient_name: str) -> str:
    safe_name = patient_name.replace(" ", "_").replace("/", "_")
    folder = os.path.join(PATIENT_DIR, f"patient_{patient_id}_{safe_name}")
    os.makedirs(folder, exist_ok=True)
    return folder


def _axial_png_for_medgemma(vol: np.ndarray, output_path: str):
    """Middle axial slice (Z axis) -> 512x512 RGB PNG for MedGemma."""
    from PIL import Image
    mid_z       = vol.shape[2] // 2
    axial_slice = vol[:, :, mid_z]
    arr = axial_slice.astype(np.float32)
    arr = (arr - arr.min()) / (arr.max() - arr.min() + 1e-8)
    img = Image.fromarray((arr * 255).astype(np.uint8)).convert("RGB")
    img = img.resize((512, 512), Image.LANCZOS)
    img.save(output_path)
    print(f"Axial PNG saved: {output_path}")


def _run_medgemma(preview_path: str) -> str:
    try:
        from services.medgemma import analyze_mri
        return analyze_mri(preview_path)
    except Exception as e:
        return f"MedGemma analysis unavailable: {str(e)}"


def _save_segmentation_nifti(t1ce_path: str, scan_folder: str, sid: str):
    """
    Save original t1ce (no crop) + label map NIfTI with corrected affine.
    Label map: 0=Background, 1=Necrotic Core, 2=Edema, 3=Enhancing Tumor
    Compatible with 3D Slicer, ITK-SNAP, FSLeyes.
    """
    try:
        import nibabel as nib
        from services.segmentation import load_nifti_volume, get_model

        orig_nii    = nib.load(t1ce_path)
        orig_data   = orig_nii.get_fdata(dtype=np.float32)
        orig_affine = orig_nii.affine.copy()

        mdl = get_model()
        if mdl is None:
            print("Model not loaded — skipping NIfTI save")
            return

        # Compute crop offsets (must match center_crop in segmentation.py)
        shape   = orig_data.shape
        offsets = []
        for i, (s, t) in enumerate(zip(shape, [128, 128, 128])):
            offsets.append((s - t) // 2 if s >= t else 0)
        x_off, y_off, z_off = offsets
        print(f"Crop offsets: x={x_off}, y={y_off}, z={z_off}")

        # Update affine to account for crop offset
        new_affine = orig_affine.copy()
        shift = orig_affine[:3, :3] @ np.array([x_off, y_off, z_off])
        new_affine[:3, 3] += shift

        # Run model to get segmentation volume
        vol     = load_nifti_volume(t1ce_path)       # (128,128,128)
        arr_4ch = np.stack([vol] * 4, axis=-1)        # (128,128,128,4)
        tensor  = arr_4ch[np.newaxis, ...]            # (1,128,128,128,4)
        pred    = mdl.predict(tensor, verbose=0)
        seg_vol = np.argmax(pred[0], axis=-1).astype(np.uint8)  # (128,128,128)

        # Save 1: original t1ce (no crop — full resolution)
        shutil.copy2(t1ce_path,
                     os.path.join(scan_folder, f"t1ce_original_{sid}.nii.gz"))
        print(f"Saved original t1ce")

        # Save 2: label map with corrected affine
        label_img = nib.Nifti1Image(seg_vol.astype(np.uint8), new_affine)
        label_img.header['scl_slope'] = 1
        label_img.header['scl_inter'] = 0
        label_img.header.set_data_dtype(np.uint8)
        nib.save(label_img,
                 os.path.join(scan_folder, f"label_map_{sid}.nii.gz"))
        print(f"Saved label map")

        # Save 3: instructions
        with open(os.path.join(scan_folder, "HOW_TO_VIEW_3D.txt"), "w") as f:
            f.write("""HOW TO VIEW IN 3D SLICER
========================
1. Download 3D Slicer: https://www.slicer.org
2. File -> Add Data -> load both files:
   - t1ce_original_*.nii.gz   (original MRI - full resolution)
   - label_map_*.nii.gz       (tumor labels - aligned to MRI)
3. For label_map: check Show Options -> Description = LabelMap
4. Volumes module -> adjust opacity to overlay on MRI
5. Segment Editor -> Show 3D for 3D tumor view

Labels:
   0 = Background
   1 = Necrotic Core   (red)
   2 = Edema           (green)
   3 = Enhancing Tumor (blue)
""")
        print(f"NIfTI files saved in: {scan_folder}")

    except Exception as e:
        print(f"Could not save segmentation NIfTI: {e}")


# ─── Single File Analysis ────────────────────────────────────────────────────

@app.post("/analyze/{patient_id}")
async def analyze(
    patient_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(404, "Patient not found. Create the patient first.")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"Unsupported format '{ext}'.")

    sid       = str(uuid.uuid4())
    scan_path = os.path.join(UPLOAD_DIR, f"{sid}{ext}")

    with open(scan_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    pat_folder = _patient_folder(patient_id, patient.name)

    # Run segmentation
    seg_out   = os.path.join(UPLOAD_DIR, f"seg_{sid}")
    seg_stats = run_segmentation(scan_path, seg_out)

    # Axial PNG for MedGemma
    preview_path = os.path.join(UPLOAD_DIR, f"preview_{sid}.png")

    if ext in {".nii", ".gz"}:
        from services.segmentation import load_nifti_volume
        vol = load_nifti_volume(scan_path)
        _axial_png_for_medgemma(vol, preview_path)

        # Save original NIfTI + label map in patient folder
        scan_folder = os.path.join(pat_folder, f"scan_{sid}")
        os.makedirs(scan_folder, exist_ok=True)
        _save_segmentation_nifti(scan_path, scan_folder, sid)
    else:
        from services.segmentation import load_image_as_array
        from PIL import Image
        arr = load_image_as_array(scan_path)
        arr = (arr - arr.min()) / (arr.max() - arr.min() + 1e-8)
        Image.fromarray((arr * 255).astype(np.uint8)).convert("RGB") \
             .resize((512, 512), Image.LANCZOS).save(preview_path)

    analysis = _run_medgemma(preview_path)

    scan = Scan(
        patient_id             = patient_id,
        scan_path              = _norm(preview_path),
        segmentation_path      = _norm(seg_stats["segmentation_path"]),
        analysis               = analysis,
        tumor_detected         = seg_stats["tumor_detected"],
        tumor_coverage_percent = seg_stats["tumor_coverage_percent"],
        tumor_pixels           = seg_stats["tumor_pixels"],
        input_format           = ext,
    )
    db.add(scan); db.commit(); db.refresh(scan)

    return {
        "scan_id":  scan.id,
        "analysis": analysis,
        "segmentation": {
            **seg_stats,
            "segmentation_path": _norm(seg_stats["segmentation_path"]),
            "preview_path":      _norm(preview_path),
        },
    }


# ─── 4-Modality Analysis ─────────────────────────────────────────────────────

@app.post("/analyze4ch/{patient_id}")
async def analyze4ch(
    patient_id: int,
    t1:    UploadFile = File(...),
    t1ce:  UploadFile = File(...),
    t2:    UploadFile = File(...),
    flair: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(404, "Patient not found. Create the patient first.")

    sid         = str(uuid.uuid4())
    session_dir = os.path.join(UPLOAD_DIR, sid)
    os.makedirs(session_dir, exist_ok=True)

    pat_folder  = _patient_folder(patient_id, patient.name)
    scan_folder = os.path.join(pat_folder, f"scan_{sid}")
    os.makedirs(scan_folder, exist_ok=True)

    try:
        paths = {}
        for name, upload in [('t1', t1), ('t1ce', t1ce), ('t2', t2), ('flair', flair)]:
            file_ext = '.nii.gz' if upload.filename.endswith('.gz') else '.nii'
            tmp_path  = os.path.join(session_dir, f"{name}{file_ext}")
            with open(tmp_path, 'wb') as f:
                shutil.copyfileobj(upload.file, f)
            paths[name] = tmp_path

            # Copy original NIfTI to permanent patient folder
            perm_path = os.path.join(scan_folder, f"{name}{file_ext}")
            shutil.copy2(tmp_path, perm_path)
            print(f"Saved {name} -> {perm_path}")

        # Run 4-channel segmentation
        seg_out   = os.path.join(UPLOAD_DIR, f"seg_{sid}")
        seg_stats = run_segmentation_4ch(paths, seg_out)

        # Save original t1ce + label map in patient folder
        _save_segmentation_nifti(paths['t1ce'], scan_folder, sid)

        # Axial PNG from t1ce for MedGemma
        from services.segmentation import load_nifti_volume
        preview_path = os.path.join(UPLOAD_DIR, f"preview_{sid}.png")
        vol_t1ce = load_nifti_volume(paths['t1ce'])
        _axial_png_for_medgemma(vol_t1ce, preview_path)

        analysis = _run_medgemma(preview_path)

        scan = Scan(
            patient_id             = patient_id,
            scan_path              = _norm(preview_path),
            segmentation_path      = _norm(seg_stats["segmentation_path"]),
            analysis               = analysis,
            tumor_detected         = seg_stats["tumor_detected"],
            tumor_coverage_percent = seg_stats["tumor_coverage_percent"],
            tumor_pixels           = seg_stats["tumor_pixels"],
            input_format           = ".nii (4ch)",
        )
        db.add(scan); db.commit(); db.refresh(scan)

        seg_paths  = seg_stats.get("segmentation_paths", {})
        norm_paths = {k: _norm(v) for k, v in seg_paths.items()}

        return {
            "scan_id":  scan.id,
            "analysis": analysis,
            "segmentation": {
                **seg_stats,
                "segmentation_path":  _norm(seg_stats["segmentation_path"]),
                "segmentation_paths": norm_paths,
                "preview_path":       _norm(preview_path),
                "patient_folder":     _norm(scan_folder),
            },
        }

    except Exception as e:
        raise HTTPException(500, str(e))


# ─── PDF Report ──────────────────────────────────────────────────────────────

@app.get("/report/{scan_id}")
def get_report(scan_id: int, db: Session = Depends(get_db)):
    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    if not scan:
        raise HTTPException(404, "Scan not found")
    patient = db.query(Patient).filter(Patient.id == scan.patient_id).first()
    if not patient:
        raise HTTPException(404, "Patient not found")

    pdf_path  = os.path.join(REPORT_DIR, f"report_{scan_id}.pdf")
    generate_pdf(patient, scan, pdf_path)

    safe_name = patient.name.replace(" ", "_")
    return FileResponse(
        pdf_path,
        media_type="application/pdf",
        filename=f"BrainSeg_Report_{safe_name}_{scan_id}.pdf"
    )
