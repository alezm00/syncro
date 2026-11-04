# Configuratore Syncro per Ford Transit Custom MK1.5 (2023)

Configuratore 3D (three.js) per preparare un allestimento Syncro su un Transit Custom L1/L2 e esportare un PDF indicativo
con viste, elenco moduli e distinta con i codici del catalogo Syncro 26-1.

Apri `index.html` nel browser (serve internet per three.js, jsPDF e Tailwind da CDN).

## Funzioni
- Moduli = coppia di fianchi (KSI) con ripiani, cassetti, vasche, cassettiere estraibili/ribaltabili/laterali e pannelli di chiusura a passi di 36 mm.
- Codici controllati sulle tabelle del catalogo (`catalog.js`): se la combinazione non esiste compare un avviso.
- Controllo collisioni, ingombro del passaruota (sagoma misurata sul modello 3D), porta scorrevole e corridoio minimo (600 mm, ipotesi).
- Moduli sollevati con fianchi sovrapposti (altezze a passi da 36 mm), sostegni a terra e barra fermavaligie; configurazione personalizzata del lato sinistro (gruppo Personalizzati).
- Lunghezza utile fino ai portelloni chiusi: L1 2470 mm, L2 2870 mm (misurata sul modello 3D).
- 13 modelli di allestimento pronti (caldaie, climatizzazione, elettrico, misto; per L1 e L2) caricabili dal menu in cima ai Moduli, generati da `tools/build_presets.py` con sole combinazioni valide a catalogo; attrezzatura personale (bombole, recuperatore, ecc.) posizionabile nel vano.
- Evidenziazione al passaggio del mouse nei due sensi (pannello <-> modello 3D); clic sul modello apre il modulo.
- Annulla / ripeti (Ctrl+Z, Ctrl+Maiusc+Z o Ctrl+Y, e pulsanti sopra il 3D).
- Esporta / Importa JSON: salva e riapri la configurazione (stesso formato del server MCP).
- Scheda Catalogo: ricerca su tutto il catalogo (`catalog-full.js`), aggiunta alla distinta o posizionamento nel vano.

## Configurare con l'AI (MCP)
Il server MCP in `mcp/` permette a un assistente AI di costruire, controllare e salvare l'allestimento usando le stesse regole del configuratore (codici a catalogo, collisioni, corridoio, passaruota, distinta).
```sh
cd mcp && npm install && npm test
```
In Claude Code il server si registra da solo grazie a `.mcp.json`. Poi apri il file JSON salvato con **Importa** nel configuratore. Dettagli in [docs/mcp.md](docs/mcp.md).

## Documentazione
- [Guida al configuratore](docs/guida-utente.md): uso, modelli di allestimento, glossario codici
- [Server MCP](docs/mcp.md): installazione, client, strumenti, esempi
- [Modello dati](docs/modello-dati.md): formato JSON della configurazione e dei dati del catalogo
- [Architettura](docs/architettura.md): struttura della repo e come tenere allineati configuratore e MCP

## Materiale di terzi incluso
Il repository contiene il catalogo Syncro 26-1 (PDF), le immagini delle sue pagine (`img/`) e il modello 3D del furgone (`Assembly 1.step`, convertito in `transit.glb` / `transit.glb.js`).
Sono materiale di terzi: il catalogo e' di Syncro System, il modello 3D e' stato scaricato da internet e la sua licenza non e' stata verificata. Verifica di avere i diritti prima di riusarli o ridistribuirli.

Per rigenerare i file derivati:
```sh
# pagine del catalogo come immagini (pagine PDF 24-244)
mkdir -p img && pdftoppm -f 24 -l 244 -scale-to-x 640 -scale-to-y -1 -jpeg -jpegopt quality=55 Catalogo-26-1-ita-ted-vers-15-04-2026.pdf img/p
# dati del catalogo
python3 tools/extract_catalog.py Catalogo-26-1-ita-ted-vers-15-04-2026.pdf
python3 tools/extract_codes.py Catalogo-26-1-ita-ted-vers-15-04-2026.pdf   # catalog.js
python3 tools/build_presets.py   # modelli di allestimento in index.html
# carrozzeria: STEP -> glb -> transit.glb.js
npm i occt-import-js @gltf-transform/core
node --max-old-space-size=6000 tools/step_to_glb.mjs "Assembly 1.step" transit.glb 8
python3 tools/make_glb_js.py
```
`catalog.js` (codici validi per i componenti dei moduli) e `catalog-full.js` (elenco articoli) sono estratti dal catalogo e sono indicativi.

## Limiti
Misure del furgone da schede tecniche (fonti discordanti) e dal modello 3D: verificarle col metro. Documento indicativo, da verificare col rivenditore Syncro prima dell'ordine.
