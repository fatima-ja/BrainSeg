import os
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer,
    Image as RLImage, Table, TableStyle, HRFlowable
)


def generate_pdf(patient, scan, output_path: str) -> str:
    doc    = SimpleDocTemplate(output_path, pagesize=A4,
                               leftMargin=2*cm, rightMargin=2*cm,
                               topMargin=2*cm, bottomMargin=2*cm)
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "Title", parent=styles["Title"],
        fontSize=20, textColor=colors.HexColor("#1a1a2e"), spaceAfter=4
    )
    heading_style = ParagraphStyle(
        "Heading", parent=styles["Heading2"],
        fontSize=13, textColor=colors.HexColor("#00d4ff"), spaceBefore=14, spaceAfter=6
    )
    normal_style = ParagraphStyle(
        "Normal", parent=styles["Normal"],
        fontSize=10, leading=16
    )
    label_style = ParagraphStyle(
        "Label", parent=styles["Normal"],
        fontSize=9, textColor=colors.grey
    )

    story = []

    # ── Header ──
    story.append(Paragraph("🧠 BrainSeg AI", title_style))
    story.append(Paragraph("Automated Brain Tumor Segmentation Report", normal_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#00d4ff")))
    story.append(Spacer(1, 12))

    # ── Patient Info Table ──
    story.append(Paragraph("Patient Information", heading_style))
    scan_date = scan.created_at.strftime("%Y-%m-%d %H:%M") if scan.created_at else "N/A"
    info_data = [
        ["Name",        patient.name,   "Scan Date", scan_date],
        ["Age",         str(patient.age), "Gender",  patient.gender],
        ["Patient ID",  str(patient.id),  "Format",  scan.input_format or "N/A"],
    ]
    info_table = Table(info_data, colWidths=[3*cm, 6*cm, 3*cm, 5*cm])
    info_table.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (0,-1), colors.HexColor("#f0f8ff")),
        ("BACKGROUND", (2,0), (2,-1), colors.HexColor("#f0f8ff")),
        ("FONTNAME",   (0,0), (-1,-1), "Helvetica"),
        ("FONTSIZE",   (0,0), (-1,-1), 9),
        ("FONTNAME",   (0,0), (0,-1), "Helvetica-Bold"),
        ("FONTNAME",   (2,0), (2,-1), "Helvetica-Bold"),
        ("GRID",       (0,0), (-1,-1), 0.5, colors.lightgrey),
        ("ROWBACKGROUNDS", (0,0), (-1,-1), [colors.white, colors.HexColor("#fafafa")]),
        ("PADDING",    (0,0), (-1,-1), 6),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 12))

    # ── Patient Notes ──
    if patient.notes:
        story.append(Paragraph("Clinical Notes", heading_style))
        story.append(Paragraph(patient.notes, normal_style))
        story.append(Spacer(1, 8))

    # ── Segmentation Stats ──
    story.append(Paragraph("Segmentation Results", heading_style))
    tumor_color = colors.HexColor("#ff4444") if scan.tumor_detected else colors.HexColor("#28a745")
    detected_text = "⚠ TUMOR DETECTED" if scan.tumor_detected else "✓ NO TUMOR DETECTED"
    stats_data = [
        ["Finding",          "Value"],
        ["Status",           detected_text],
        ["Tumor Coverage",   f"{scan.tumor_coverage_percent:.2f}%"],
        ["Tumor Pixels",     f"{scan.tumor_pixels:,}"],
    ]
    stats_table = Table(stats_data, colWidths=[7*cm, 10*cm])
    stats_table.setStyle(TableStyle([
        ("BACKGROUND",  (0,0), (-1,0), colors.HexColor("#1a1a2e")),
        ("TEXTCOLOR",   (0,0), (-1,0), colors.white),
        ("FONTNAME",    (0,0), (-1,0), "Helvetica-Bold"),
        ("FONTNAME",    (0,1), (0,-1), "Helvetica-Bold"),
        ("FONTSIZE",    (0,0), (-1,-1), 10),
        ("GRID",        (0,0), (-1,-1), 0.5, colors.lightgrey),
        ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.white, colors.HexColor("#fff8f8")]),
        ("PADDING",     (0,0), (-1,-1), 8),
        ("TEXTCOLOR",   (1,1), (1,1), tumor_color),
        ("FONTNAME",    (1,1), (1,1), "Helvetica-Bold"),
    ]))
    story.append(stats_table)
    story.append(Spacer(1, 16))

    # ── MRI Images side by side ──
    story.append(Paragraph("MRI Scan & Segmentation Overlay", heading_style))
    img_row = []

    if scan.scan_path and os.path.exists(scan.scan_path):
        try:
            img_row.append([
                Paragraph("Original MRI", label_style),
                RLImage(scan.scan_path, width=7*cm, height=7*cm)
            ])
        except Exception:
            pass

    if scan.segmentation_path and os.path.exists(scan.segmentation_path):
        try:
            img_row.append([
                Paragraph("Tumor Overlay", label_style),
                RLImage(scan.segmentation_path, width=7*cm, height=7*cm)
            ])
        except Exception:
            pass

    if img_row:
        flat = [item for pair in img_row for item in pair]
        if len(flat) == 4:
            img_table = Table([[flat[0], flat[2]], [flat[1], flat[3]]], colWidths=[8*cm, 8*cm])
        else:
            img_table = Table([[flat[0]], [flat[1]]], colWidths=[8*cm])
        img_table.setStyle(TableStyle([
            ("ALIGN",   (0,0), (-1,-1), "CENTER"),
            ("VALIGN",  (0,0), (-1,-1), "MIDDLE"),
            ("PADDING", (0,0), (-1,-1), 6),
        ]))
        story.append(img_table)

    story.append(Spacer(1, 16))

    # ── AI Analysis ──
    story.append(Paragraph("MedGemma AI Analysis", heading_style))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.lightgrey))
    story.append(Spacer(1, 6))
    if scan.analysis:
        for line in scan.analysis.split("\n"):
            if line.strip():
                story.append(Paragraph(line.strip(), normal_style))
                story.append(Spacer(1, 4))
    else:
        story.append(Paragraph("No analysis available.", normal_style))

    # ── Footer ──
    story.append(Spacer(1, 20))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.lightgrey))
    story.append(Spacer(1, 6))
    story.append(Paragraph(
        f"Generated by BrainSeg AI • {datetime.utcnow().strftime('%Y-%m-%d %H:%M')} UTC • "
        "For clinical use only under supervision of a qualified radiologist.",
        label_style
    ))

    doc.build(story)
    return output_path
