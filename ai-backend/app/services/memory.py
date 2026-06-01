conversation_memory = []


def add_message(role: str, content: str) -> None:
    conversation_memory.append({"role": role, "content": content})


def get_recent_messages(limit: int = 6) -> list[dict]:
    return conversation_memory[-limit:]


def clear_memory() -> None:
    conversation_memory.clear()
