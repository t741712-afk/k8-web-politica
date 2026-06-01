import os
import requests
from app.services.ai_events import record_ai_event

TREND_AI_URL = os.getenv(
    "TREND_AI_URL",
    "https://api.eu.xdr.trendmicro.com/v3.0/aiSecurity/applyGuardrails"
)

TREND_API_KEY = os.getenv("TREND_API_KEY")
TREND_AI_APP_NAME = os.getenv("TREND_AI_APP_NAME", "ppf-partido")


def call_trend_ai_guard(text: str, direction: str) -> dict:
    print(f"[AI_GUARD] call_trend_ai_guard() direction={direction}")
    print(f"[AI_GUARD] URL={TREND_AI_URL}")
    print(f"[AI_GUARD] APP_NAME={TREND_AI_APP_NAME}")

    if not TREND_API_KEY:
        print("[AI_GUARD] ERROR: falta TREND_API_KEY")
        return {"status": "error", "details": "Falta TREND_API_KEY"}

    headers = {
        "Authorization": f"Bearer {TREND_API_KEY}",
        "TMV1-Application-Name": TREND_AI_APP_NAME,
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }

    payload = {"prompt": text}

    try:
        response = requests.post(TREND_AI_URL, headers=headers, json=payload, timeout=20)
        print(f"[AI_GUARD] HTTP status={response.status_code}")

        if response.status_code >= 300:
            return {"status": "error", "details": f"HTTP {response.status_code}: {response.text}"}

        data = response.json()
        return {"status": "ok", "result": data}

    except Exception as e:
        print(f"[AI_GUARD] EXCEPTION={str(e)}")
        return {"status": "error", "details": str(e)}


# Reglas de AI Guard que generan falsos positivos en contenido político legítimo
# y se omiten intencionadamente en este contexto.
IGNORED_RULES = {"SPAIN_FULL_SPANISH_NAME", "JP_EMAIL_ADDRESS"}


def _classify_trend_result(result: dict) -> dict:
    action = result.get("action", "Allow")
    reasons = result.get("reasons", [])

    if action == "Block":
        # Extraer IDs de reglas que dispararon el bloqueo
        sensitive_rules = set()
        sensitive_info = result.get("sensitiveInformation", {})
        for rule in sensitive_info.get("rules", []):
            sensitive_rules.add(rule.get("id", ""))

        # Si TODAS las reglas que dispararon el bloqueo están en la lista de ignoradas,
        # tratamos la respuesta como permitida (falso positivo conocido)
        if sensitive_rules and sensitive_rules.issubset(IGNORED_RULES):
            print(f"[AI_GUARD] Bloqueo ignorado por reglas excluidas: {sensitive_rules}")
            return {"allowed": True, "reason": None, "event_type": None}

        reason_text = ", ".join(reasons) if reasons else "Blocked by Trend AI Guard"
        event_type = "trend_guard_blocked"

        if any("prompt" in r.lower() for r in reasons):
            event_type = "prompt_injection_blocked"
        elif any("sensitive" in r.lower() for r in reasons):
            event_type = "sensitive_data_request_blocked"
        elif any("harmful" in r.lower() for r in reasons):
            event_type = "harmful_output_blocked"

        return {"allowed": False, "reason": reason_text, "event_type": event_type}

    return {"allowed": True, "reason": None, "event_type": None}


def inspect_prompt(prompt: str) -> dict:
    trend_result = call_trend_ai_guard(prompt, "input")

    if trend_result.get("status") != "ok":
        return {"allowed": True, "reason": None, "source": "trend_unavailable", "trend_result": trend_result}

    parsed = _classify_trend_result(trend_result["result"])

    if not parsed["allowed"]:
        record_ai_event(
            event_type=parsed["event_type"],
            prompt=prompt,
            action="blocked_input_trend",
            details=parsed["reason"] or "",
        )

    return {"allowed": parsed["allowed"], "reason": parsed["reason"], "source": "trend_ai_guard", "trend_result": trend_result}


def inspect_output(prompt: str, output_text: str) -> dict:
    trend_result = call_trend_ai_guard(output_text, "output")

    if trend_result.get("status") != "ok":
        return {"allowed": True, "reason": None, "source": "trend_unavailable", "trend_result": trend_result}

    parsed = _classify_trend_result(trend_result["result"])

    if not parsed["allowed"]:
        record_ai_event(
            event_type=parsed["event_type"],
            prompt=prompt,
            action="blocked_output_trend",
            details=parsed["reason"] or "",
        )

    return {"allowed": parsed["allowed"], "reason": parsed["reason"], "source": "trend_ai_guard", "trend_result": trend_result}
