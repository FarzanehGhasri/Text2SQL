"""HTTP API for Open WebUI and the benchmark.

  POST /webhook/text2sql      the old n8n contract: {question, email, username} -> {answer}
                              (header x-eval-mode: true + a benchmark group -> also rows / SQL)
  POST /v1/chat/completions   OpenAI-compatible: add the service in Open WebUI as an OpenAI connection; the user's
                              e-mail comes from Open WebUI's X-OpenWebUI-User-Email header
                              (ENABLE_FORWARD_USER_INFO_HEADERS=true in Open WebUI)
  GET  /v1/models             the one "model": text2sql
  GET  /health                catalog, notes with problems, embeddings, value index - no secrets

Authentication: with TEXT2SQL_API_KEY set, every call needs `Authorization: Bearer <key>` (or `X-API-Key`).
The e-mail inside a request is trusted only because the caller holds the key - so set it.
"""
from __future__ import annotations

import hmac
import json
import logging
import time
import uuid

from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import JSONResponse, StreamingResponse

from .answer import format_error
from .directory import Directory, UnknownUser
from .service import Text2Sql

log = logging.getLogger(__name__)
MODEL_ID = "text2sql"


def create_app(service: Text2Sql, directory: Directory, api_key: str = "") -> FastAPI:
    app = FastAPI(title="Text2SQL", version="1.0", docs_url=None, redoc_url=None)
    if not api_key:
        log.warning("TEXT2SQL_API_KEY is not set: anyone who can reach this port can ask as any e-mail")

    def authorised(authorization: str | None = Header(None), x_api_key: str | None = Header(None)) -> None:
        if not api_key:
            return
        given = x_api_key or (authorization or "").removeprefix("Bearer ").strip()
        if not hmac.compare_digest(given.encode(), api_key.encode()):
            raise HTTPException(status_code=401, detail="invalid API key")

    def answer_for(question: str, email: str, username: str, eval_requested: bool) -> dict:
        try:
            user = directory.lookup(email, username)
        except UnknownUser as e:
            return {"answer": format_error(str(e), False)}
        except Exception as e:  # noqa: BLE001 - the directory being down is still a readable answer
            log.exception("directory lookup failed")
            return {"answer": format_error(str(e), False)}
        return service.ask(question, user, eval_requested).response()

    @app.post("/webhook/text2sql", dependencies=[Depends(authorised)])
    async def webhook(request: Request, x_eval_mode: str | None = Header(None)):
        body = await request.json()
        eval_requested = str(x_eval_mode or "").lower() == "true"
        return await run_in_threadpool(answer_for, str(body.get("question") or ""), str(body.get("email") or ""),
                                       str(body.get("username") or ""), eval_requested)

    @app.get("/v1/models", dependencies=[Depends(authorised)])
    async def models():
        return {"object": "list", "data": [{"id": MODEL_ID, "object": "model", "created": 0, "owned_by": "text2sql"}]}

    @app.post("/v1/chat/completions", dependencies=[Depends(authorised)])
    async def chat(request: Request, x_openwebui_user_email: str | None = Header(None),
                   x_openwebui_user_name: str | None = Header(None)):
        body = await request.json()
        question = next((m.get("content") for m in reversed(body.get("messages") or [])
                         if m.get("role") == "user"), "") or ""
        if isinstance(question, list):         # multi-part content: keep the text parts
            question = " ".join(p.get("text", "") for p in question if isinstance(p, dict))
        result = await run_in_threadpool(answer_for, str(question), x_openwebui_user_email or "",
                                         x_openwebui_user_name or "", False)
        text = result["answer"]
        cid, created = f"chatcmpl-{uuid.uuid4().hex}", int(time.time())
        if body.get("stream"):
            def events():
                chunk = {"id": cid, "object": "chat.completion.chunk", "created": created, "model": MODEL_ID,
                         "choices": [{"index": 0, "delta": {"role": "assistant", "content": text}, "finish_reason": None}]}
                yield f"data: {json.dumps(chunk, ensure_ascii=False)}\n\n"
                done = dict(chunk, choices=[{"index": 0, "delta": {}, "finish_reason": "stop"}])
                yield f"data: {json.dumps(done, ensure_ascii=False)}\n\ndata: [DONE]\n\n"
            return StreamingResponse(events(), media_type="text/event-stream")
        return {"id": cid, "object": "chat.completion", "created": created, "model": MODEL_ID,
                "choices": [{"index": 0, "message": {"role": "assistant", "content": text}, "finish_reason": "stop"}],
                "usage": {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}}

    @app.get("/health")
    async def health():
        try:
            catalog = service.catalog.current()
            tables, ok = len(catalog.tables), True
            meaning = not service.vectors.current(catalog).empty
        except Exception:  # noqa: BLE001
            tables, ok, meaning = 0, False, False
        problems = service.catalog.problems
        age = service.values.age_hours()
        body = {"ok": ok and not problems, "tables": tables, "notes_with_problems": len(problems),
                "meaning_search": meaning, "value_index_age_hours": None if age is None else round(age, 1),
                "api_key_required": bool(api_key)}
        return JSONResponse(body, status_code=200 if ok else 503)

    return app
