# Syncro configuratore

Configuratore 3D di allestimenti Syncro per Ford Transit Custom MK1.5 (2023) + server MCP. Documentazione in `docs/`, in italiano.

- `index.html`: tutta l'app (nessuna build). Le regole di progetto sono duplicate in `mcp/core.mjs`: se ne cambi una, aggiorna entrambi e lancia `cd mcp && npm test`.
- Non modificare a mano `catalog*.js` e la riga `const PRESETS` di `index.html`: si rigenerano con gli script in `tools/` (vedi README).
- Il catalogo PDF, `Assembly 1.step` e `img/` sono materiale di terzi: non ridistribuire senza verificare i diritti.
- Testo dell'interfaccia e dei messaggi in italiano.
