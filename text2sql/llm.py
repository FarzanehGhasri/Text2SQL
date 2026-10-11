"""The model behind the service. One interface, one adapter per kind of server (Settings.md -> Model -> api).

  combine  the current server: POST {string1: '-', string2: prompt}; the reply object goes to the SQL guard as is
           (it finds the text in result / response / answer / ... and reasoning in thinking / reasoning ...)
  openai   any OpenAI-compatible server (vLLM, Ollama, LM Studio, TGI): POST {base}/chat/completions
"""
from __future__ import annotations

from typing import Protocol

import httpx

from .config import ModelSettings


class ModelError(Exception):
    """The model server did not answer usefully."""


def _timeout(s: ModelSettings) -> httpx.Timeout:
    """Generous for the answer (a 32B model can think for minutes), short for connecting: a server that is down
    must not keep the user waiting for minutes."""
    return httpx.Timeout(s.timeout_seconds, connect=10.0)


class LanguageModel(Protocol):
    def complete(self, prompt: str) -> str | dict: ...


class CombineModel:
    def __init__(self, s: ModelSettings, client: httpx.Client | None = None):
        self.s = s
        self.client = client or httpx.Client(timeout=_timeout(s))

    def complete(self, prompt: str) -> str | dict:
        try:
            r = self.client.post(self.s.endpoint, json={"string1": "-", "string2": prompt})
            r.raise_for_status()
        except httpx.HTTPError as e:
            raise ModelError(f"⛔ مدل زبانی پاسخ نداد. لطفاً کمی بعد دوباره بپرسید. ({type(e).__name__})") from e
        try:
            return r.json()
        except ValueError:
            return r.text


class OpenAICompatibleModel:
    def __init__(self, s: ModelSettings, api_key: str = "", client: httpx.Client | None = None):
        self.s = s
        self.headers = {"Authorization": f"Bearer {api_key}"} if api_key else {}
        self.client = client or httpx.Client(timeout=_timeout(s))

    def complete(self, prompt: str) -> str | dict:
        body = {"model": self.s.model, "messages": [{"role": "user", "content": prompt}],
                "temperature": self.s.temperature, "max_tokens": self.s.max_tokens, "stream": False}
        try:
            r = self.client.post(self.s.endpoint.rstrip("/") + "/chat/completions", json=body, headers=self.headers)
            r.raise_for_status()
            msg = r.json()["choices"][0]["message"]
        except (httpx.HTTPError, KeyError, IndexError, ValueError) as e:
            raise ModelError(f"⛔ مدل زبانی پاسخ نداد. لطفاً کمی بعد دوباره بپرسید. ({type(e).__name__})") from e
        out = {"response": msg.get("content") or ""}
        reasoning = msg.get("reasoning_content") or msg.get("reasoning")
        if reasoning:
            out["reasoning"] = reasoning
        return out


def make_model(s: ModelSettings, api_key: str = "") -> LanguageModel:
    if s.api == "openai":
        return OpenAICompatibleModel(s, api_key)
    return CombineModel(s)
