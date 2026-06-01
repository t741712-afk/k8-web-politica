from pathlib import Path
import json
from datetime import datetime

EVENTS_FILE = Path("/data/uploads/ai_security_events.json")


def ensure_events_file():
    EVENTS_FILE.parent.mkdir(parents=True, exist_ok=True)
    if not EVENTS_FILE.exists():
        EVENTS_FILE.write_text("[]", encoding="utf-8")


def load_events():
    ensure_events_file()
    try:
        return json.loads(EVENTS_FILE.read_text(encoding="utf-8"))
    except Exception:
        return []


def save_events(events):
    EVENTS_FILE.write_text(json.dumps(events, ensure_ascii=False, indent=2), encoding="utf-8")


def record_ai_event(event_type: str, prompt: str, action: str, details: str = ""):
    events = load_events()
    events.append({
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "event_type": event_type,
        "prompt": prompt[:500],
        "action": action,
        "details": details,
    })
    save_events(events)


def count_ai_events():
    events = load_events()
    return {
        "total_ai_events": len(events),
        "prompt_injection_blocked": sum(1 for e in events if e["event_type"] == "prompt_injection_blocked"),
        "sensitive_data_request_blocked": sum(1 for e in events if e["event_type"] == "sensitive_data_request_blocked"),
        "harmful_output_blocked": sum(1 for e in events if e["event_type"] == "harmful_output_blocked"),
        "trend_guard_blocked": sum(1 for e in events if e["action"] in ["blocked_input_trend", "blocked_output_trend"]),
    }
