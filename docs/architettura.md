# Architettura

```
index.html            configuratore 3D (three.js, Tailwind, jsPDF da CDN): interfaccia, regole, PDF, modelli (PRESETS)
catalog.js            codici validi dei componenti (estratti dal PDF)
catalog-full.js       elenco articoli del catalogo con pagina
transit.glb(.js)      modello 3D del furgone
img/                  pagine del catalogo come immagini (p-024..p-244)
tools/                script per rigenerare i dati derivati
mcp/core.mjs          le regole di index.html senza browser
mcp/server.mjs        server MCP (stdio) costruito su core.mjs
mcp/test.mjs          test end-to-end
.mcp.json             registrazione del server per Claude Code
docs/                 documentazione
```

## Regole duplicate: index.html e mcp/core.mjs

Il configuratore e' un unico file HTML senza build; il server MCP gira in Node. Per non introdurre un bundler,
`mcp/core.mjs` **riporta** le funzioni pure di `index.html`: `partsFor`, `opts`, `spec`, `fit`, collisioni,
corridoio, passaruota, `bomRows`. Dati (`catalog*.js`) e modelli (`PRESETS`) invece sono letti direttamente dai file originali.

Quando cambi una regola di progetto in `index.html` (ingombri, costanti `ARCH`, `DOOR`, `MIN_AISLE`, tabelle `VAS`/`FV`/`PAN`,
logica dei codici), aggiorna anche `mcp/core.mjs` ed esegui `cd mcp && npm test`: il test verifica che tutti i 13 modelli
risultino senza avvisi in L1 e L2.

## Flusso dei dati

```
catalogo PDF --tools/extract_*.py--> catalog.js, catalog-full.js
                                          |
              index.html (browser) <------+------> mcp/core.mjs <--> mcp/server.mjs <--> client AI
                    |   ^                                                  |
        Esporta JSON|   |Importa                                           | save/load_configuration
                    v   |                                                  v
                  file .json  <-------------- stesso formato --------> file .json
```

## Rigenerare i modelli di allestimento

`python3 tools/build_presets.py` riscrive la riga `const PRESETS = ...` di `index.html` usando solo combinazioni
presenti in `catalog.js` (le asserzioni falliscono se un codice non esiste). Dopo averlo eseguito lancia `npm test` in `mcp/`.
