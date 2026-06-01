import os
import amaas.grpc

FILE_SECURITY_REGION = os.getenv("FILE_SECURITY_REGION", "eu-central-1")
FILE_SECURITY_API_KEY = os.getenv("FILE_SECURITY_API_KEY")


def scan_file(file_path: str) -> dict:
    print(f"[FILE_SECURITY] scan_file path={file_path}")
    print(f"[FILE_SECURITY] region={FILE_SECURITY_REGION}")
    print(f"[FILE_SECURITY] api_key_set={bool(FILE_SECURITY_API_KEY)}")

    if not FILE_SECURITY_API_KEY:
        print("[FILE_SECURITY] ERROR: FILE_SECURITY_API_KEY no configurada")
        return {"error": "FILE_SECURITY_API_KEY no configurada"}

    try:
        print("[FILE_SECURITY] Inicializando conexión gRPC...")
        handle = amaas.grpc.init_by_region(FILE_SECURITY_REGION, FILE_SECURITY_API_KEY, True)
        print("[FILE_SECURITY] Escaneando archivo...")
        result = amaas.grpc.scan_file(handle, file_path)
        amaas.grpc.quit(handle)
        print(f"[FILE_SECURITY] Resultado raw: {result}")

        import json
        try:
            parsed = json.loads(result)
            print(f"[FILE_SECURITY] Resultado parsed: {parsed}")
            return parsed
        except Exception:
            return {"raw": result}

    except Exception as e:
        print(f"[FILE_SECURITY] EXCEPTION: {str(e)}")
        return {"error": str(e)}
