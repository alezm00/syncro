# Configuratore Syncro per Ford Transit Custom MK1.5 (2023)

Configuratore 3D (three.js) per preparare un allestimento Syncro su un Transit Custom L1/L2 e esportare un PDF indicativo
con viste, elenco moduli e distinta con i codici del catalogo Syncro 26-1.

Apri `index.html` nel browser (serve internet per three.js, jsPDF e Tailwind da CDN).

## Funzioni
- Moduli = coppia di fianchi (KSI) con ripiani, cassetti, vasche, cassettiere estraibili/ribaltabili/laterali e pannelli di chiusura a passi di 36 mm.
- Codici controllati sulle tabelle del catalogo (`catalog.js`): se la combinazione non esiste compare un avviso.
- Controllo collisioni, ingombro del passaruota (sagoma misurata sul modello 3D), porta scorrevole e corridoio minimo (600 mm, ipotesi).
- Scheda Catalogo: ricerca su tutto il catalogo (`catalog-full.js`), aggiunta alla distinta o posizionamento nel vano.

## File non inclusi (materiale di terzi)
Il catalogo Syncro, le immagini delle sue pagine e il modello 3D del furgone non sono nel repository.
Senza di essi il configuratore funziona, ma la scheda Catalogo non mostra le pagine di riferimento e non c'e' la carrozzeria 3D.
Per rigenerarli in locale, con i tuoi file:
```sh
# pagine del catalogo come immagini (pagine PDF 24-244)
mkdir -p img && pdftoppm -f 24 -l 244 -scale-to-x 640 -scale-to-y -1 -jpeg -jpegopt quality=55 Catalogo.pdf img/p
# (ri)genera i dati del catalogo
python3 tools/extract_catalog.py Catalogo.pdf
# carrozzeria: STEP -> glb -> transit.glb.js
npm i occt-import-js @gltf-transform/core
node --max-old-space-size=6000 tools/step_to_glb.mjs "Assembly 1.step" transit.glb 8
python3 tools/make_glb_js.py
```
`catalog.js` (codici validi per i componenti dei moduli) e `catalog-full.js` (elenco articoli) sono estratti dal catalogo e sono indicativi.

## Limiti
Misure del furgone da schede tecniche (fonti discordanti) e dal modello 3D: verificarle col metro. Documento indicativo, da verificare col rivenditore Syncro prima dell'ordine.
