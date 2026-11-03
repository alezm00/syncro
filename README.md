# Configuratore Syncro per Ford Transit Custom MK1.5 (2023)

Configuratore 3D (three.js) per preparare un allestimento Syncro su un Transit Custom L1/L2 e esportare un PDF indicativo
con viste, elenco moduli e distinta con i codici del catalogo Syncro 26-1.

Apri `index.html` nel browser (serve internet per three.js, jsPDF e Tailwind da CDN).

## Funzioni
- Moduli = coppia di fianchi (KSI) con ripiani, cassetti, vasche, cassettiere estraibili/ribaltabili/laterali e pannelli di chiusura a passi di 36 mm.
- Codici controllati sulle tabelle del catalogo (`catalog.js`): se la combinazione non esiste compare un avviso.
- Controllo collisioni, ingombro del passaruota (sagoma misurata sul modello 3D), porta scorrevole e corridoio minimo (600 mm, ipotesi).
- Scheda Catalogo: ricerca su tutto il catalogo (`catalog-full.js`), aggiunta alla distinta o posizionamento nel vano.

## Materiale di terzi incluso
Il repository contiene il catalogo Syncro 26-1 (PDF), le immagini delle sue pagine (`img/`) e il modello 3D del furgone (`Assembly 1.step`, convertito in `transit.glb` / `transit.glb.js`).
Sono materiale di terzi: il catalogo e' di Syncro System, il modello 3D e' stato scaricato da internet e la sua licenza non e' stata verificata. Verifica di avere i diritti prima di riusarli o ridistribuirli.

Per rigenerare i file derivati:
```sh
# pagine del catalogo come immagini (pagine PDF 24-244)
mkdir -p img && pdftoppm -f 24 -l 244 -scale-to-x 640 -scale-to-y -1 -jpeg -jpegopt quality=55 Catalogo-26-1-ita-ted-vers-15-04-2026.pdf img/p
# dati del catalogo
python3 tools/extract_catalog.py Catalogo-26-1-ita-ted-vers-15-04-2026.pdf
# carrozzeria: STEP -> glb -> transit.glb.js
npm i occt-import-js @gltf-transform/core
node --max-old-space-size=6000 tools/step_to_glb.mjs "Assembly 1.step" transit.glb 8
python3 tools/make_glb_js.py
```
`catalog.js` (codici validi per i componenti dei moduli) e `catalog-full.js` (elenco articoli) sono estratti dal catalogo e sono indicativi.

## Limiti
Misure del furgone da schede tecniche (fonti discordanti) e dal modello 3D: verificarle col metro. Documento indicativo, da verificare col rivenditore Syncro prima dell'ordine.
