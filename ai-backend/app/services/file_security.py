import os
import amaas.grpc

FILE_SECURITY_REGION = os.getenv("FILE_SECURITY_REGION", "eu-central-1")
FILE_SECURITY_API_KEY = os.getenv("FILE_SECURITY_API_KEY")


def scan_file(file_path: str) -> dict:
    try:
        handle = amaas.grpc.init_by_region(FILE_SECURITY_REGION, FILE_SECURITY_API_KEY, True)
        result = amaas.grpc.scan_file(file_path, handle)
        amaas.grpc.quit(handle)

        import json
        try:
            return json.loads(result)
        except Exception:
            return {"raw": result}

    except Exception as e:
        return {"error": str(e)}
