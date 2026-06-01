from fastapi import APIRouter, UploadFile, File
from app.services.storage import store_and_classify_file

router = APIRouter()


@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    result = store_and_classify_file(file)

    scan_result = result.get("scan_result", {})
    atse_result = scan_result.get("result", {}).get("atse", {})

    return {
        "message": "Archivo procesado correctamente",
        "filename": result["filename"],
        "verdict": result["verdict"],
        "final_path": result["final_path"],
        "scan_id": scan_result.get("scanId"),
        "scanner_version": scan_result.get("scannerVersion"),
        "file_sha1": scan_result.get("fileSHA1"),
        "file_sha256": scan_result.get("fileSHA256"),
        "file_type": atse_result.get("fileTypeName"),
        "malware_count": atse_result.get("malwareCount"),
        "malware": atse_result.get("malware"),
        "scan_error": atse_result.get("error"),
        "elapsed_time": atse_result.get("elapsedTime"),
        "data_source": scan_result.get("dataSource"),
        "app_name": scan_result.get("appName"),
    }
