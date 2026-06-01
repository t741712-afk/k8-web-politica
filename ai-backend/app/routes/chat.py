from fastapi import APIRouter
from pydantic import BaseModel
from app.services.chatbot import get_ai_reply
from app.services.ai_guard import inspect_prompt, inspect_output

router = APIRouter()


class ChatRequest(BaseModel):
    message: str


@router.post("")
def chat(request: ChatRequest):
    print(f"[CHAT] Mensaje recibido: {request.message}")

    # 1. Validación de entrada con Trend AI Guard
    prompt_check = inspect_prompt(request.message)
    print(f"[CHAT] prompt_check={prompt_check}")

    if not prompt_check["allowed"]:
        return {
            "reply": "Solicitud bloqueada por Trend AI Guard.",
            "guard_action": "blocked_input",
            "guard_reason": prompt_check["reason"],
            "guard_source": prompt_check.get("source"),
            "prompt_guard_result": prompt_check.get("trend_result"),
            "output_guard_result": None,
        }

    # 2. Llamada al modelo LLM
    reply = get_ai_reply(request.message)
    print(f"[CHAT] reply modelo={reply}")

    # 3. Validación de salida con Trend AI Guard
    output_check = inspect_output(request.message, reply)
    print(f"[CHAT] output_check={output_check}")

    if not output_check["allowed"]:
        return {
            "reply": "La respuesta generada ha sido bloqueada por Trend AI Guard.",
            "guard_action": "blocked_output",
            "guard_reason": output_check["reason"],
            "guard_source": output_check.get("source"),
            "prompt_guard_result": prompt_check.get("trend_result"),
            "output_guard_result": output_check.get("trend_result"),
        }

    return {
        "reply": reply,
        "guard_action": "allowed",
        "guard_reason": None,
        "guard_source": output_check.get("source", prompt_check.get("source")),
        "prompt_guard_result": prompt_check.get("trend_result"),
        "output_guard_result": output_check.get("trend_result"),
    }
