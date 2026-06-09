import os
import torch
from PIL import Image

HF_TOKEN = os.getenv("HF_TOKEN", "inter your token here")  # Hugging Face token for private model access
MODEL_ID  = "google/medgemma-4b-it"
DEVICE    = "cuda" if torch.cuda.is_available() else "cpu"

_model     = None
_processor = None


def get_model():
    """Lazy-load MedGemma on first request to avoid startup timeout on Render."""
    global _model, _processor

    if _model is None:
        from transformers import AutoProcessor, AutoModelForImageTextToText

        print("⏳ Loading MedGemma — this may take a few minutes...")
        _processor = AutoProcessor.from_pretrained(MODEL_ID, token=HF_TOKEN)
        _model = AutoModelForImageTextToText.from_pretrained(
            MODEL_ID,
            token=HF_TOKEN,
            torch_dtype=torch.bfloat16,
            device_map=None,
            low_cpu_mem_usage=True,
        )
        _model = _model.to(DEVICE)
        _model.eval()
        print("✅ MedGemma loaded")

    return _model, _processor


def analyze_mri(image_path: str) -> str:
    """Run MedGemma on any image file and return the analysis text."""
    model, processor = get_model()

    # Convert to RGB PIL image (works for jpg/png/dcm previews)
    image = Image.open(image_path).convert("RGB")

    messages = [
        {
            "role": "user",
            "content": [
                {"type": "image", "image": image},
                {
                    "type": "text",
                    "text": (
                        "You are a radiology AI assistant specialized in brain MRI analysis. "
                        "Please analyze this brain MRI scan and provide:\n"
                        "1. Overall image quality and scan type\n"
                        "2. Any visible abnormalities or lesions\n"
                        "3. Tumor location and approximate size if present\n"
                        "4. Affected brain regions\n"
                        "5. Clinical significance and recommendations\n"
                        "Be specific and professional."
                    ),
                },
            ],
        }
    ]

    inputs = processor.apply_chat_template(
        messages,
        add_generation_prompt=True,
        tokenize=True,
        return_dict=True,
        return_tensors="pt",
    )
    inputs = {k: v.to(DEVICE) if hasattr(v, "to") else v for k, v in inputs.items()}

    with torch.inference_mode():
        outputs = model.generate(
            **inputs,
            max_new_tokens=512,
            do_sample=False,
            pad_token_id=processor.tokenizer.eos_token_id,
        )

    input_len = inputs["input_ids"].shape[-1]
    response  = processor.decode(outputs[0][input_len:], skip_special_tokens=True)
    return response.strip()
