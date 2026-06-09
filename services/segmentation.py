import os
import numpy as np
from PIL import Image

MODEL_PATH = os.getenv("UNET_WEIGHTS", r"D:\New folder\brainseg-backend\brainseg_final.keras")

# ── Class definitions ─────────────────────────────────────────────────────────
# Channel order from notebook: ['t1', 't1ce', 't2', 'flair']
# Label colors from notebook LABEL_COLORS (but we use our own display colors)
CLASS_COLORS = {
    0: [0,   0,   0],    # Background
    1: [255, 0,   0],    # NCR/NET — red
    2: [0,   255, 0],    # Edema   — green  (notebook uses green not cyan)
    3: [0,   0,   255],  # ET      — blue   (notebook uses blue not yellow)
}
CLASS_NAMES = {
    0: "Background",
    1: "Necrotic Core",
    2: "Edema",
    3: "Enhancing Tumor",
}

# ─── Load Model ───────────────────────────────────────────────────────────────

model = None

def get_model():
    global model
    if model is None:
        import tensorflow as tf
        if os.path.exists(MODEL_PATH):
            model = tf.keras.models.load_model(MODEL_PATH, compile=False)
            print(f"Model loaded: {model.input_shape} → {model.output_shape}")
        else:
            print(f"Model not found: {MODEL_PATH}")
    return model


# ─── Preprocessing — matches notebook EXACTLY ────────────────────────────────

def normalize(vol: np.ndarray) -> np.ndarray:
    """Z-score normalization on non-zero voxels only — matches training."""
    mask = vol > 0
    if mask.sum() == 0:
        return vol
    mean, std = vol[mask].mean(), vol[mask].std()
    if std < 1e-8:
        return vol
    return (vol - mean) / std


def center_crop(vol: np.ndarray, target=(128, 128, 128)) -> np.ndarray:
    """Center-crop or pad to target shape — matches training exactly."""
    result = np.zeros(target, dtype=vol.dtype)
    src, dst = [], []
    for i in range(3):
        s, t = vol.shape[i], target[i]
        if s >= t:
            start = (s - t) // 2
            src.append(slice(start, start + t))
            dst.append(slice(0, t))
        else:
            pad = (t - s) // 2
            src.append(slice(0, s))
            dst.append(slice(pad, pad + s))
    result[dst[0], dst[1], dst[2]] = vol[src[0], src[1], src[2]]
    return result


def load_nifti_volume(image_path: str) -> np.ndarray:
    """Load NIfTI → normalize → center_crop to (128,128,128)."""
    import nibabel as nib
    data = nib.load(image_path).get_fdata(dtype=np.float32)
    if data.ndim == 4:
        data = data[:, :, :, 0]
    data = normalize(data)
    data = center_crop(data, (128, 128, 128))
    return data.astype(np.float32)


def load_image_as_array(image_path: str) -> np.ndarray:
    """Load any 2D/3D format → normalized float32 [H, W]."""
    ext = image_path.lower()
    if ext.endswith(".nii") or ext.endswith(".nii.gz"):
        vol    = load_nifti_volume(image_path)
        scores = [(vol[:, :, i] != 0).sum() for i in range(vol.shape[2])]
        best   = int(np.argmax(scores))
        return vol[:, :, best]
    elif ext.endswith(".dcm"):
        import pydicom
        dcm       = pydicom.dcmread(image_path)
        data      = dcm.pixel_array.astype(np.float32)
        slope     = float(getattr(dcm, "RescaleSlope",     1))
        intercept = float(getattr(dcm, "RescaleIntercept", 0))
        data      = data * slope + intercept
        if data.ndim == 3:
            data = np.mean(data, axis=2)
        mn, mx = data.min(), data.max()
        if mx > mn:
            data = (data - mn) / (mx - mn)
        return data.astype(np.float32)
    else:
        img = Image.open(image_path).convert("L")
        return np.array(img, dtype=np.float32) / 255.0


def array_to_pil(arr: np.ndarray) -> Image.Image:
    # Clip to valid range after z-score
    arr_clipped = np.clip(arr, arr.min(), arr.max())
    arr_norm = (arr_clipped - arr_clipped.min()) / (arr_clipped.max() - arr_clipped.min() + 1e-8)
    return Image.fromarray((arr_norm * 255).astype(np.uint8), mode="L")


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _build_overlay(base_slice: np.ndarray, class_map: np.ndarray) -> np.ndarray:
    """Build colour overlay. base_slice can be z-score normalized."""
    h, w = class_map.shape
    # Normalize base_slice to [0,255] for display
    b = base_slice.copy().astype(np.float32)
    b = (b - b.min()) / (b.max() - b.min() + 1e-8)
    base_pil = Image.fromarray((b * 255).astype(np.uint8)).convert("RGB")
    base_pil = base_pil.resize((w, h), Image.BILINEAR)
    base_arr = np.array(base_pil, dtype=np.float32)
    overlay  = base_arr.copy()
    for cls_id, color in CLASS_COLORS.items():
        if cls_id == 0:
            continue
        overlay[class_map == cls_id] = color
    return (0.5 * base_arr + 0.5 * overlay).astype(np.uint8)


def _compute_stats(class_map: np.ndarray) -> dict:
    size          = class_map.shape[0] * class_map.shape[1]
    tumor_pixels  = int((class_map > 0).sum())
    tumor_percent = round((tumor_pixels / size) * 100, 2)
    classes_found = [CLASS_NAMES[int(c)] for c in np.unique(class_map) if c > 0]
    print(f"Class distribution: { {CLASS_NAMES[int(c)]: int((class_map==c).sum()) for c in np.unique(class_map)} }")
    return {
        "tumor_detected":         tumor_pixels > 50,
        "tumor_coverage_percent": tumor_percent,
        "tumor_pixels":           tumor_pixels,
        "classes_detected":       classes_found,
    }


def _best_slice(seg_vol: np.ndarray) -> int:
    scores = [(seg_vol[:, :, i] > 0).sum() for i in range(seg_vol.shape[2])]
    return int(np.argmax(scores)) if max(scores) > 0 else seg_vol.shape[2] // 2


# ─── Main Functions ───────────────────────────────────────────────────────────

def run_segmentation(image_path: str, output_path: str) -> dict:
    """Single file segmentation — duplicates to 4 channels."""
    mdl = get_model()
    ext = image_path.lower()

    if ext.endswith(".nii") or ext.endswith(".nii.gz"):
        vol     = load_nifti_volume(image_path)            # (128,128,128)
        arr_4ch = np.stack([vol]*4, axis=-1)               # (128,128,128,4)
        tensor  = arr_4ch[np.newaxis, ...]                 # (1,128,128,128,4)
        print(f"Single NIfTI input shape: {tensor.shape}")

        if mdl is not None:
            pred    = mdl.predict(tensor, verbose=0)
            seg_vol = np.argmax(pred[0], axis=-1)          # (128,128,128)
        else:
            seg_vol = np.zeros((128, 128, 128), dtype=np.int32)

        best      = _best_slice(seg_vol)
        class_map = seg_vol[:, :, best]
        base_s    = vol[:, :, best]

    else:
        slice_2d = load_image_as_array(image_path)
        pil      = Image.fromarray((np.clip(slice_2d,0,1)*255).astype(np.uint8))
        resized  = np.array(pil.resize((128,128), Image.BILINEAR), dtype=np.float32) / 255.0
        arr_4ch  = np.stack([resized]*4, axis=-1)
        fake_vol = np.stack([arr_4ch]*128, axis=2)
        tensor   = fake_vol[np.newaxis, ...]

        if mdl is not None:
            pred      = mdl.predict(tensor, verbose=0)
            class_map = np.argmax(pred[0, :, :, 64, :], axis=-1)
        else:
            class_map = np.zeros((128, 128), dtype=np.int32)
        base_s = resized

    stats   = _compute_stats(class_map)
    blended = _build_overlay(base_s, class_map)
    out_png = os.path.splitext(output_path)[0] + ".png"
    Image.fromarray(blended).save(out_png)

    return {
        "segmentation_path": out_png,
        "input_format":      os.path.splitext(image_path)[1].lower(),
        **stats,
    }


def run_segmentation_4ch(paths: dict, output_path: str) -> dict:
    """
    4-modality segmentation — matches training notebook EXACTLY.
    Notebook MODALITIES order: ['t1', 't1ce', 't2', 'flair']
    Normalization: Z-score on non-zero voxels
    Crop: center_crop to (128,128,128)
    """
    mdl = get_model()

    # Load in exact training order: t1, t1ce, t2, flair
    channels = []
    for key in ['t1', 't1ce', 't2', 'flair']:
        vol = load_nifti_volume(paths[key])   # (128,128,128)
        channels.append(vol)
        print(f"Loaded {key}: mean={vol.mean():.4f} std={vol.std():.4f}")

    arr_4ch = np.stack(channels, axis=-1)     # (128,128,128,4)
    tensor  = arr_4ch[np.newaxis, ...]        # (1,128,128,128,4)
    print(f"4ch input shape: {tensor.shape}")

    if mdl is not None:
        pred    = mdl.predict(tensor, verbose=0)
        seg_vol = np.argmax(pred[0], axis=-1)  # (128,128,128)
    else:
        seg_vol = np.zeros((128, 128, 128), dtype=np.int32)

    best      = _best_slice(seg_vol)
    class_map = seg_vol[:, :, best]
    print(f"Best display slice: {best}")
    stats = _compute_stats(class_map)

    # Save overlay for all 4 modalities
    modality_names = ['t1', 't1ce', 't2', 'flair']
    overlay_paths  = []
    base_out       = os.path.splitext(output_path)[0]

    for i, (key, vol) in enumerate(zip(modality_names, channels)):
        base_s   = vol[:, :, best]
        blended  = _build_overlay(base_s, class_map)
        mod_path = f"{base_out}_{key}.png"
        Image.fromarray(blended).save(mod_path)
        overlay_paths.append(mod_path.replace("\\", "/"))

    # t1ce is index 1 in ['t1','t1ce','t2','flair']
    return {
        "segmentation_path":  overlay_paths[1],
        "segmentation_paths": {
            "t1":    overlay_paths[0],
            "t1ce":  overlay_paths[1],
            "t2":    overlay_paths[2],
            "flair": overlay_paths[3],
        },
        "input_format": ".nii",
        **stats,
    }
