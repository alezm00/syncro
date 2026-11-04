# Guida al configuratore

Apri `index.html` nel browser (serve internet per three.js, jsPDF e Tailwind da CDN). Non c'e' nulla da installare.

## Schede del pannello

- **Moduli**: elenco dei moduli, oggetti nel vano e menu dei modelli di allestimento.
- **Catalogo**: ricerca su tutto il catalogo Syncro 26-1; aggiungi alla distinta o posiziona nel vano. Il pulsante "pag. N" apre la pagina.
- **Distinta**: righe con quantita', codice e descrizione. Le righe in ambra ("da verificare") non hanno un codice certo.
- **Veicolo**: passo L1/L2 e visibilita' della carrozzeria.

## Costruire un allestimento

1. Scegli il passo in **Veicolo**.
2. Parti da un modello (menu in cima a **Moduli** -> Carica) oppure premi **+ Modulo**.
3. Per ogni modulo imposta lato, distanza dalla paratia, quota da terra, larghezza, profondita e altezza; poi aggiungi i componenti dal basso.
4. Leggi gli avvisi rossi (collisione, corridoio sotto 600 mm, passaruota, porta scorrevole, codice non a catalogo) e correggi.
5. **Esporta PDF** per viste, elenco moduli e distinta; **Esporta JSON** per salvare il lavoro e **Importa** per riaprirlo.

Il passaggio del mouse evidenzia l'elemento corrispondente tra pannello e 3D; il clic sul 3D apre il modulo.
Annulla/ripeti: Ctrl+Z, Ctrl+Maiusc+Z o Ctrl+Y. La configurazione corrente e' salvata nel browser.

## Modelli di allestimento

Configurazioni complete (poi modificabili), pensate per L1 o L2: in L2 i moduli sopra il passaruota e sul retro si spostano di 400 mm.

| Chiave | Gruppo | Nome | Moduli | Oggetti |
|---|---|---|---|---|
| `misto` | Misto | Manutentore misto: caldaie, clima, elettrico | 3 | 3 |
| `caldaie-man` | Caldaie | Caldaie: manutenzione programmata e riparazioni | 3 | 1 |
| `caldaie-pi` | Caldaie | Caldaie: pronto intervento (compatto, carico leggero) | 2 | 1 |
| `caldaie-inst` | Caldaie | Caldaie: installazione e sostituzione (idraulico-termico) | 3 | 2 |
| `clima-man` | Climatizzazione | Clima: manutenzione e ricarica gas | 3 | 3 |
| `clima-rapido` | Climatizzazione | Clima: assistenza rapida su split domestici (compatto) | 2 | 2 |
| `clima-inst` | Climatizzazione | Clima: installazione split e multisplit | 3 | 3 |
| `frigo` | Climatizzazione | Frigorista: refrigerazione commerciale e VRF (carico pesante) | 3 | 3 |
| `elettr-man` | Elettrico | Elettricista: manutenzione impianti civili e industriali | 3 | 2 |
| `elettr-pi` | Elettrico | Elettricista: pronto intervento (compatto) | 2 | 1 |
| `elettr-cant` | Elettrico | Elettricista: installazione e cantieri | 3 | 3 |
| `multiservizi` | Misto | Multiservizi per condomini ed edifici (tuttofare) | 3 | 2 |
| `sx-custom` | Personalizzati | La mia scaffalatura sinistra: sollevata 55 cm, con grondaia (L1 H1) | 3 | 1 |

Le note di ogni modello (ad esempio sulle bombole di refrigeranti infiammabili e le norme ADR) compaiono sotto il menu.

## Lavorare con l'AI

Il server MCP costruisce o modifica la configurazione per te e salva un file JSON che apri con **Importa**:
vedi [mcp.md](mcp.md).

## Glossario codici

| Sigla | Componente |
|---|---|
| KSI / YSI | coppia di fianchi / fianco singolo (sostegno a terra) |
| XOS | ripiano aperto |
| KDW | cassetto frontale |
| XDS, KDS, KCP, KHS | vasche scaffale |
| KDU...KD | cassettiere MultiBox estraibili |
| KDU...KFD | cassettiere ribaltabili e laterali |
| XCP, XSP | pannelli di chiusura |
| KMH | kit fermavaligie |

## Limiti

Misure da schede tecniche (fonti discordanti) e dal modello 3D: verificale col metro. Documento indicativo, da verificare col rivenditore Syncro prima dell'ordine.
