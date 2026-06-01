import os
import shutil
from pathlib import Path
from fastapi import UploadFile
from app.services.file_security import scan_file

UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "/data/uploads"))


def ensure_directories():
    for folder in ["incoming", "clean", "quarantine"]:
        (UPLOAD_DIR / folder).mkdir(parents=True, exist_ok=True)


def save_file_incoming(file: UploadFile) -> Path:
    ensure_directories()
    dest = UPLOAD_DIR / "incoming" / file.filename
    with open(dest, "wb") as f:
        shutil.copyfileobj(file.file, f)
    return dest


def move_file_to_final_location(incoming_path: Path, verdict: str) -> Path:
    if verdict == "clean":
        final_dir = UPLOAD_DIR / "clean"
    else:
        final_dir = UPLOAD_DIR / "quarantine"

    final_dir.mkdir(parents=True, exist_ok=True)
    final_path = final_dir / incoming_path.name
    shutil.move(str(incoming_path), str(final_path))
    return final_path


def store_and_classify_file(file: UploadFile) -> dict:
    incoming_path = save_file_incoming(file)

    scan_result = scan_file(str(incoming_path))

    # Determinar veredicto
    if "error" in scan_result:
        verdict = "error"
        final_path = incoming_path
    else:
        atse = scan_result.get("result", {}).get("atse", {})
        malware_count = atse.get("malwareCount", 0)
        scan_error = atse.get("error")

        if scan_error or malware_count > 0:
            verdict = "malicious"
        else:
            verdict = "clean"

        final_path = move_file_to_final_location(incoming_path, verdict)

    return {
        "filename": file.filename,
        "verdict": verdict,
        "final_path": str(final_path),
        "scan_result": scan_result,
    }
