---
type: runbook
updated: 2026-10-03
tags: [runbook, llm]
---
# LLM settings (Qwen 32B)

The model sits behind the n8n node **request to LLM** (`POST http://172.16.55.28:5000/combine`,
body `{ string1: "-", string2: <prompt> }`). n8n only sends the prompt: temperature, context length
and thinking mode are set **on that server**. These are the settings to check there.

## 1. Which Qwen 32B?
| Model | Mode | temperature | top_p | top_k | max output tokens |
|---|---|---|---|---|---|
| Qwen2.5-32B-Instruct / Qwen2.5-Coder-32B-Instruct | - | **0** (greedy) | 1.0 | - | 1024 |
| Qwen3-32B | thinking (recommended for SQL) | 0.6 | 0.95 | 20 | 4096+ |
| Qwen3-32B | non-thinking (`/no_think`) | 0.7 | 0.8 | 20 | 1024 |
| QwQ-32B | always thinks | 0.6 | 0.95 | 20-40 | 4096+ |

- Qwen2.5: greedy decoding gives the same SQL for the same question; that is what you want.
- Qwen3 / QwQ in thinking mode: **do not use temperature 0**. Qwen's model cards warn that greedy
  decoding makes the reasoning loop and repeat. The `<think>...</think>` block is already handled by the
  `Security` node and shown to the user in Open WebUI.
- If you can choose: Qwen3-32B in thinking mode, or a SQL-tuned 32B (XiYanSQL-QwenCoder-32B, OmniSQL-32B),
  usually beats plain Qwen2.5-32B-Instruct on text-to-SQL. Measure with [[Run the benchmark]] before switching.

## 2. Context length
- `BuildPrompt` caps the prompt at `MAX_PROMPT_CHARS = 24000` characters ≈ 8 000 tokens (English DDL with
  Persian comments is ~3 characters per token).
- Serve the model with a context of at least **16 384** tokens (vLLM: `--max-model-len 16384`; Ollama:
  `num_ctx 16384`). Ollama's default `num_ctx` (2048-8192 depending on version) silently cuts the
  start of the prompt: the rules and tables disappear and accuracy collapses without any error.
- Thinking mode needs prompt + up to ~4 000 reasoning tokens: use 32 768 if memory allows.

## 3. Prompt caching (speed)
The prompt starts with fixed rules and ends with the question. With vLLM `--enable-prefix-caching` the
fixed part is computed once and reused, which shortens the time to first token.

## 4. After changing any of this
Run [[Run the benchmark]] end to end and add a row to *Results* in [[Text2SQL]] with the model and settings.

Back: [[Skill Map]]
