---
type: runbook
updated: 2026-10-03
tags: [runbook, n8n, docker]
---
# Obsidian with n8n and Docker

Obsidian is a desktop app that edits a folder of Markdown files. It has no server of its own, so n8n
talks to it in one of two ways. **Option A is the recommended one.**

| | A. Shared folder (recommended) | B. Local REST API plugin |
|---|---|---|
| How | n8n writes `.md` files into a mounted vault folder; Obsidian sees them instantly | n8n calls an HTTPS API served by Obsidian on the host |
| Needs Obsidian running | No | Yes - fails when the desktop app is closed |
| Setup | one volume line + 2 nodes | plugin + API key + self-signed TLS |
| Good for | writing notes (failed questions, benchmark runs) | also reading/searching/patching notes |

## A. Shared folder

### 1. Mount the folder (docker-compose.yml, service `n8n`)
```yaml
    volumes:
      - ./n8n_data:/home/node/.n8n
      - ./catalog:/home/node/.n8n-files/catalog:ro
      - ./obsidian/Inbox/n8n:/home/node/.n8n-files/obsidian-inbox   # read-write: n8n writes notes here
```
Then `docker compose up -d n8n`. The path stays under `/home/node/.n8n-files`, the folder n8n's
file nodes are allowed to use.

> `obsidian/Inbox/n8n/` is **git-ignored**: these notes hold real users' questions, which must not be
> committed. Sort them by hand: fix the catalog, move what is worth keeping to `Catalog Notes/`
> (without user data), delete the rest.

### 2. Write a note when a question fails
Add two nodes on a **second output branch of `ErrorFormat`** (the reply to the user is unchanged):

**Code node "Obsidian note"** (*Settings → On Error: Continue*):
```js
// One Markdown note per failed / rejected question. No user identity is written.
const err = $input.first().json;
let bp = {};
try { bp = $('BuildPrompt').first().json; } catch (e) { /* failed before BuildPrompt */ }
let question = '';
try { question = $('Webhook').first().json.body.question || ''; } catch (e) {}

const now  = new Date();
const id   = now.toISOString().replace(/[-:T]/g, '').slice(0, 14);
const r    = bp.retrieval || {};
const md = `---
type: failed-question
status: open
date: ${now.toISOString().slice(0, 10)}
domains: [${(r.activeDomains || []).join(', ')}]
low_confidence: ${Boolean(r.lowConfidence)}
top_score: ${r.topScore ?? ''}
tags: [failed-question]
---
# ${question.replace(/\n/g, ' ').slice(0, 80)}

**Answer sent:** ${String(err.answer || '').split('\n')[0]}

## Tables in the prompt
${(bp.selectedEntities || []).map(n => `- [[${n}]]`).join('\n') || '- (none)'}

## Top scores
${(r.scores || []).map(s => `- [[${s.entity}]] ${(+s.score).toFixed(2)} (lex ${(+s.lex).toFixed(2)}, sem ${(+s.sem).toFixed(2)})`).join('\n')}

## Diagnosis
- [ ] Wrong table? -> add synonym in catalog
- [ ] Right table, wrong SQL? -> hint / example
- [ ] Really not supported? -> close
`;
return [{
  json: { path: `/home/node/.n8n-files/obsidian-inbox/${id} failed.md` },
  binary: { data: { data: Buffer.from(md, 'utf8').toString('base64'),
                    mimeType: 'text/markdown', fileName: `${id} failed.md` } }
}];
```

**Read/Write Files from Disk node** (*Operation: Write File to Disk*, *File Path and Name:* `{{ $json.path }}`,
*Input Binary Field:* `data`, *On Error: Continue*).

The links `[[Fact_Invoice]]` open the generated table notes, so you can go from a failed question straight to
the table and its synonyms. The same pattern works after `Summarize Results` in the benchmark workflow if you ever want each run saved
as a note.

## B. Local REST API plugin
1. Obsidian → *Settings → Community plugins → Browse* → **Local REST API** → install, enable, copy the API key.
2. n8n *HTTP Request* node: `PUT https://host.docker.internal:27124/vault/Inbox/n8n/<name>.md`,
   header `Authorization: Bearer <key>` (store it as a *Header Auth* credential, not in the node),
   body = Markdown text, content type `text/markdown`, *Ignore SSL issues* on (self-signed certificate).
   `host.docker.internal` already resolves in the n8n container (`extra_hosts` in docker-compose.yml).
3. Reading: `GET /vault/<path>.md`; search: `POST /search/simple/?query=...`.

## Not recommended
- **Reading the vault from the workflow** (e.g. taking hints from notes): the catalog JSON stays the single
  source of truth; notes are documentation and diagnosis.
- **Running Obsidian itself in Docker** (community web images): possible, but it adds a GUI container on the
  server for no gain over opening the folder on your PC.

Back: [[Skill Map]] · [[Home]]
