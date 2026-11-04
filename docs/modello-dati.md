# Modello dati

La configurazione e' un oggetto JSON. E' lo stesso formato di `localStorage` (chiave `syncro-cfg2`),
dell'export/import del configuratore e dei file del server MCP.

```json
{ "app": "syncro-configuratore", "version": 1, "len": "L1", "hgt": "H1", "mods": [], "objs": [], "extra": [] }
```

## Sistema di coordinate

| Asse | Significato |
|---|---|
| `z` | mm dalla paratia (verso i portelloni). Lunghezza utile: L1 2470, L2 2870 |
| `y` | quota da terra (mm). Altezza utile H1: 1267 |
| lato | `L` = sinistra (guidatore), `R` = destra (porta scorrevole), `C` = centro (solo oggetti) |
| larghezza vano | 1777 mm |

Le altezze dei moduli e dei componenti sono in **passi da 36 mm** (interasse dei fori dei fianchi Syncro).

## Modulo (`mods[]`)

Una coppia di fianchi (KSI) con i componenti impilati dal basso.

| Campo | Tipo | Significato |
|---|---|---|
| `side` | `L` / `R` | lato del furgone |
| `z` | mm | distanza dalla paratia del bordo anteriore |
| `y` | mm | quota da terra; se > 0 il modulo e' sollevato |
| `wi` | 2..6 | larghezza: 507, 760, 1014, 1268, 1521 mm |
| `di` | 21, 26, 31, 36, 41 | profondita, x10 mm |
| `hh` | passi | altezza (es. 34 = 1224 mm) |
| `lf`, `lr` | 1 | sostegno a terra anteriore / posteriore (solo se `y` > 0, fianchi YSI) |
| `stop` | 1 | barra fermavaligie KMH (solo se `y` > 0) |
| `items` | array | componenti |

## Componente (`items[]`)

| `t` | Tipo | Campi | Altezza |
|---|---|---|---|
| `s` | Ripiano aperto (XOS) | `c`: 1 = con contenitori Euronorm | 1 passo |
| `d` | Cassetto frontale (KDW) | `hi` = 2..6 passi | `hi` |
| `v` | Vasca scaffale | `a` = `b` bassa 72, `a` alta 180, `p` alta con pannello, `t` terminale; `o` = n. divisori | 2 o 5 |
| `x` | Cassettiera estraibile MultiBox (KDU..KD) | `a` = altezza passi, `b` = profondita (codice), `o` = n. cassetti piccoli | `a` |
| `f` | Cassettiera ribaltabile (KDU..KFD) | `a` = `a` H252, `b` H324, `c` H468, `d` H180, `e` H324 due file; `o` | 7, 9, 13, 5, 9 |
| `l` | Cassettiera laterale (263 x 110 mm, fuori dai fianchi) | `a` = altezza passi, `e` = `f` anteriore / `r` posteriore, `o` | `a` |
| `c` | Pannello di chiusura | `a` = `a` 108, `b` 144, `c` 180 (XCP), `d` 108 con aggancio vasche (XSP) | 3, 4, 5, 3 |

Per tutti: `p` = passo di partenza dal basso (0 = fondo del modulo). I componenti non si sovrappongono
(le laterali `l` sono escluse: stanno fuori dai fianchi). `hi` e `o` vengono ricalcolati dal configuratore:
se `o` non esiste a catalogo per quella larghezza/profondita si usa la prima opzione valida.

## Oggetto nel vano (`objs[]`)

| Campo | Significato |
|---|---|
| `custom` | `true` per attrezzatura non a catalogo (code `ATTREZZATURA`) |
| `code`, `page` | codice e pagina PDF del catalogo (solo articoli di catalogo) |
| `desc` | descrizione |
| `side`, `z`, `y` | posizione |
| `w`, `h`, `d` | `w` = lunghezza lungo z, `h` = altezza, `d` = profondita in larghezza (mm) |

Nei modelli (`PRESETS` in `index.html`) compaiono anche `r: 1` (ancorato al retro/passaruota: in L2 si sposta di +400 mm)
e `l2: 1` (presente solo in L2). Vengono risolti al caricamento e non finiscono nella configurazione.

## Articoli solo in distinta (`extra[]`)

`{ "code": "PT-EST/C", "desc": "...", "page": 184, "n": 1 }`. `page` e' la pagina del PDF (la pagina stampata e' `page - 2`).

## Dati del catalogo

| File | Contenuto | Generato da |
|---|---|---|
| `catalog.js` (`window.CAT`) | codici validi per i componenti dei moduli: `ksi`, `ysi`, `xos`, `kdw`, `kd`, `kfd`, `vas`, `pan`, `kmh` | `tools/extract_codes.py` |
| `catalog-full.js` (`window.CATALL`) | tutti gli articoli: `[codice, descrizione, [l,h,p], pagina PDF, sezione]` e le sezioni | `tools/extract_catalog.py` |

Sono estratti automaticamente dal PDF: indicativi, da verificare col rivenditore.
