from pathlib import Path

DATA_DIR = Path("app/data")


def load_document(filename: str) -> str:
    path = DATA_DIR / filename
    if not path.exists():
        return ""
    return path.read_text(encoding="utf-8")


def get_relevant_context(message: str) -> str:
    msg = message.lower()
    sections = []

    # Programa electoral por áreas
    if any(w in msg for w in ["educaci", "escuel", "universidad", "estudi", "becas"]):
        sections.append(load_document("programa_educacion.txt"))

    if any(w in msg for w in ["sanidad", "salud", "hospital", "medic", "sanitari"]):
        sections.append(load_document("programa_sanidad.txt"))

    if any(w in msg for w in ["econom", "empleo", "trabajo", "paro", "empresa", "impuest"]):
        sections.append(load_document("programa_economia.txt"))

    if any(w in msg for w in ["vivienda", "alquiler", "hipotec", "piso", "casa"]):
        sections.append(load_document("programa_vivienda.txt"))

    if any(w in msg for w in ["medio ambiente", "clima", "sostenibil", "energía", "verde", "contamin"]):
        sections.append(load_document("programa_medioambiente.txt"))

    # Afiliación y participación
    if any(w in msg for w in ["afili", "hacerme socio", "unirme", "militante", "inscri"]):
        sections.append(load_document("afiliacion.txt"))

    # Encuestas y actos
    if any(w in msg for w in ["encuesta", "sondeo", "opinión", "votar", "acto", "mitin", "evento"]):
        sections.append(load_document("encuestas.txt"))

    # Siempre incluir información general del partido
    sections.append(load_document("tramites_generales.txt"))

    return "\n\n".join(s for s in sections if s)
