"""
title: Obsidian assistant
description: Answers from the Text2SQL Obsidian vault (notes the user may see), through the n8n workflow "Obsidian assistant".
version: 1.0

Paste into Open WebUI -> Admin Panel -> Functions -> + (type: Pipe), save, enable.
It appears as the model "Obsidian assistant". The n8n workflow decides what the user may see
(AD groups via LDAP), so it only needs the user's e-mail - the same body the Text2SQL webhook takes.
"""

from typing import Optional

import requests
from pydantic import BaseModel, Field


class Pipe:
    class Valves(BaseModel):
        N8N_URL: str = Field(
            default="http://n8n:5678/webhook/obsidian-assistant",
            description="The webhook of the n8n workflow 'Obsidian assistant' (same docker network: http://n8n:5678).",
        )
        TIMEOUT_SECONDS: int = Field(default=200, description="Qwen may take up to 180 s (n8n's own timeout).")

    def __init__(self):
        self.valves = self.Valves()

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
        # Open WebUI also asks the model for chat titles, tags and follow-ups; those are not questions about the vault.
        if __task__:
            return ""
        question = self._last_question(body.get("messages"))
        if not question:
            return "⛔ سوالی دریافت نشد."
        email = (__user__ or {}).get("email", "")
        try:
            r = requests.post(
                self.valves.N8N_URL,
                json={"question": question, "email": email},
                timeout=self.valves.TIMEOUT_SECONDS,
            )
            r.raise_for_status()
            return r.json().get("answer") or "⛔ پاسخی از n8n دریافت نشد."
        except requests.Timeout:
            return "⛔ پاسخ مدل بیش از حد طول کشید. لطفاً دوباره بپرسید."
        except Exception as e:  # n8n down, workflow not active, ...
            return f"⛔ دستیار Obsidian در دسترس نیست ({type(e).__name__}). اگر تکرار شد با واحد فناوری اطلاعات تماس بگیرید."
