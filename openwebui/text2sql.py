"""
title: Text2SQL
description: Two models in Open WebUI, one n8n workflow: "Text2SQL" (numbers from the data warehouse) and "Obsidian notes" (answers from the Obsidian notes).
version: 2.0

Paste into Open WebUI -> Admin Panel -> Functions -> + (type: Pipe), save, enable. It shows two models:
  Text2SQL        a data question  -> SQL on SA_DataWarehouse                 (sends mode "sql")
  Obsidian notes  a notes question -> an answer from the notes the user may see (sends mode "notes")
Both go to the same webhook; n8n decides what the user may see from their AD groups (LDAP), so the function only
sends the question and the user's e-mail.
"""

from typing import Optional

import requests
from pydantic import BaseModel, Field

MODELS = {"text2sql": ("Text2SQL", "sql"), "notes": ("Obsidian notes", "notes")}


class Pipe:
    class Valves(BaseModel):
        N8N_URL: str = Field(
            default="http://n8n:5678/webhook/text2sql",
            description="The n8n webhook (same docker network: http://n8n:5678).",
        )
        TIMEOUT_SECONDS: int = Field(default=200, description="Qwen may take up to 180 s (n8n's own timeout).")

    def __init__(self):
        self.type = "manifold"
        self.valves = self.Valves()

    def pipes(self):
        return [{"id": key, "name": name} for key, (name, _) in MODELS.items()]

    @staticmethod
    def _last_question(messages: list) -> str:
        for m in reversed(messages or []):
            if m.get("role") == "user":
                content = m.get("content", "")
                if isinstance(content, list):  # text + images: keep the text parts
                    content = " ".join(p.get("text", "") for p in content if isinstance(p, dict))
                return str(content).strip()
        return ""

    def pipe(self, body: dict, __user__: Optional[dict] = None, __task__: Optional[str] = None) -> str:
        # Open WebUI also asks the model for chat titles, tags and follow-ups; those are not questions.
        if __task__:
            return ""
        question = self._last_question(body.get("messages"))
        if not question:
            return "⛔ سوالی دریافت نشد."
        # body["model"] is "<function id>.<model key>", e.g. "text2sql.notes"
        mode = MODELS.get(str(body.get("model", "")).split(".")[-1], MODELS["text2sql"])[1]
        try:
            r = requests.post(
                self.valves.N8N_URL,
                json={"question": question, "email": (__user__ or {}).get("email", ""), "mode": mode},
                timeout=self.valves.TIMEOUT_SECONDS,
            )
            r.raise_for_status()
            return r.json().get("answer") or "⛔ پاسخی از n8n دریافت نشد."
        except requests.Timeout:
            return "⛔ پاسخ مدل بیش از حد طول کشید. لطفاً دوباره بپرسید."
        except Exception as e:  # n8n down, workflow not active, ...
            return f"⛔ سامانه در دسترس نیست ({type(e).__name__}). اگر تکرار شد با واحد فناوری اطلاعات تماس بگیرید."
