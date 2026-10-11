---
type: settings
tags: [settings]
---
How the service talks to the model, the embeddings and the people using it. Saved changes are used from the
next question on. Passwords and connection strings are **never** written here: they are environment variables
of the `text2sql` service (`.env`, see [[How-to#Deploy]]).

## Model
- api: combine
- endpoint: http://172.16.55.28:5000/combine
- model: qwen2.5-32b-instruct
- temperature: 0
- max_tokens: 1024
- timeout_seconds: 180

`api: combine` = the current server (`{string1, string2}` -> text). `api: openai` = any OpenAI-compatible server
(vLLM, Ollama, LM Studio); then `endpoint` is its base URL, e.g. `http://172.16.55.28:8000/v1`.
For Qwen3 / QwQ in thinking mode use temperature 0.6 and max_tokens 4096 ([[How-to#LLM settings]]).

## Prompt
- max_prompt_chars: 24000

## Embeddings
- endpoint: http://embeddings:80/embed

Meaning search (bge-m3). If it does not answer, questions are still answered with keyword search.

## Answers
- chart_base_url: http://localhost:3001

The address of QuickChart **as the user's browser sees it** (the browser loads the chart image): use the server's
name or IP for users on the network.

## Who may do what
- see error details: `IT - Data`, `IT - Security`
- benchmark data: `IT - Data`
- review notes: `IT - Data`, `IT - Security`

AD group names exactly as in Active Directory. Which **tables** a group sees is set in each domain note
(*Who may see it*), not here.

## Values
- refresh_hours: 24

How often the service reads the distinct values of the catalog's text columns from the database (read-only
login), so «دفتر فروش تهران» is spelled exactly as stored. Kept in `data/`, never in the vault or in git.
