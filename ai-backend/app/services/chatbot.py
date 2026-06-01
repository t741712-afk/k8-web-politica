import os
from dotenv import load_dotenv
from openai import OpenAI

from app.services.knowledge_base import get_relevant_context
from app.services.memory import add_message, get_recent_messages

load_dotenv()

client = OpenAI(
    api_key=os.getenv("GROQ_API_KEY"),
    base_url="https://api.groq.com/openai/v1",
)

SYSTEM_PROMPT = """
Eres el asistente virtual oficial del Partido por el Futuro (PPF).

El PPF es un partido político español que se presenta a las elecciones generales de mayo de 2027
con un programa basado en la modernización del país, la sostenibilidad y la justicia social.

Tu función es informar a ciudadanos, militantes y simpatizantes sobre:
- El programa electoral del PPF por áreas (educación, sanidad, economía, medio ambiente, vivienda)
- El proceso de afiliación al partido
- Las encuestas y actos del partido
- Las propuestas concretas del PPF para las elecciones de 2027
- Información sobre candidatos y estructura del partido

Instrucciones:
- Responde siempre en español
- Sé claro, cercano y entusiasta pero riguroso
- No inventes propuestas concretas que no conozcas; si no tienes el dato, indícalo
- Usa el contexto documental del partido cuando esté disponible
- Orienta al ciudadano hacia el siguiente paso práctico (afiliarse, participar en encuesta, acudir a un acto)
- Mantén un tono político moderno, positivo y propositivo
- Recuerda que las elecciones son en mayo de 2027 y el partido está en campaña activa
- IMPORTANTE: No menciones nombres propios de personas reales ni ficticias en tus respuestas
- IMPORTANTE: No incluyas direcciones de correo electrónico en tus respuestas
"""


def get_ai_reply(message: str) -> str:
    if not os.getenv("GROQ_API_KEY"):
        return "Falta configurar la API key de Groq en el backend."

    relevant_context = get_relevant_context(message)
    recent_messages = get_recent_messages(limit=6)

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {
            "role": "system",
            "content": f"Contexto documental del PPF disponible:\n\n{relevant_context}",
        },
    ]

    messages.extend(recent_messages)
    messages.append({"role": "user", "content": message})

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=messages,
        temperature=0.3,
    )

    reply = response.choices[0].message.content or "No se ha podido generar una respuesta."

    add_message("user", message)
    add_message("assistant", reply)

    return reply
