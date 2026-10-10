# Instructions for Claude in this vault

This folder is the Obsidian vault of the Text2SQL project. Before answering or editing:

1. Read `Me.md` - who the user is, their environment and how they want answers
   (Persian explanations, English identifiers; what/why/how-verified for every change).
2. Read `Home.md` - status, open items, and the vault rules (never edit `Catalog/`, it is generated;
   no secrets or users' personal data).
3. Read `How-to.md` - the exact commands for repeatable tasks; use them instead of inventing new ones.
4. Keep the vault small: these four notes plus `Catalog/` and `Inbox/`. Add a section, not a new note.

When you change code or catalogs in the repo, also update the vault: the status list and results in
`Home.md`, the "Why" section of `Architecture.md` for a design decision, `How-to.md` for a new procedure,
and re-run
`node scripts/export-catalog-to-obsidian.js` after a catalog change.
