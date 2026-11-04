# Server MCP: configurare il furgone con l'AI

Il server MCP (`mcp/`) permette a un assistente AI (Claude Code, Claude Desktop o qualsiasi client MCP) di
progettare l'allestimento al posto tuo: sceglie i moduli, controlla che i codici esistano a catalogo,
verifica collisioni e corridoio, produce la distinta e salva un file che apri nel configuratore 3D.

Le regole sono le stesse di `index.html` (vedi [architettura](architettura.md)): l'AI non puo' inventare
combinazioni non a catalogo, perche' i tool le rifiutano.

## Installazione

Serve Node.js 18 o superiore.

```sh
cd mcp
npm install
npm test        # prova end-to-end (avvia il server e chiama i tool)
```

## Collegarlo a un client

**Claude Code** (dalla radice della repo): il file `.mcp.json` e' gia' presente, basta aprire la cartella con `claude`
e approvare il server `syncro`. In alternativa:

```sh
claude mcp add syncro -- node /percorso/assoluto/syncro/mcp/server.mjs
```

**Claude Desktop** (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "syncro": {
      "command": "node",
      "args": ["/percorso/assoluto/syncro/mcp/server.mjs"],
      "env": { "SYNCRO_SAVE_DIR": "/percorso/dove/salvare/le/configurazioni" }
    }
  }
}
```

Variabili d'ambiente:

| Variabile | Default | Significato |
|---|---|---|
| `SYNCRO_SAVE_DIR` | `./configurazioni` (cartella da cui parte il server) | dove `save_configuration` scrive i file JSON |

Il trasporto e' stdio. La configurazione di lavoro e' in memoria: vale per la sessione del server; per conservarla usa `save_configuration`.

## Flusso tipico

1. L'AI chiama `get_vehicle_info` per le regole del furgone.
2. Parte da un modello (`list_presets` + `load_preset`) oppure costruisce da zero (`add_module` + `add_component`).
3. Per vasche e cassettiere chiama `list_options` e usa solo le varianti elencate.
4. Dopo **ogni** modifica il risultato contiene gli `avvisi`: li corregge finche' `ok` e' `true`.
5. `get_bom` per la distinta con codici e pagine del catalogo; `save_configuration` per il file.
6. Nel configuratore web: **Importa** -> scegli il file -> vedi il risultato in 3D, ritocca a mano, esporta il PDF.

Esempi di richieste:

- "Ho un Transit Custom L2, faccio manutenzione caldaie. Parti dal modello piu' vicino e aggiungi un cassetto per le guarnizioni."
- "Sul lato sinistro metti due moduli da 1014 mm, profondita 360, con vasche in basso e cassettiere sopra; lascia libera la porta scorrevole."
- "Controlla la configurazione: ci sono avvisi? Sistemali e dammi la distinta."
- "Cerca nel catalogo un porta estintore e aggiungilo alla distinta."

## Strumenti

Tutti rispondono in JSON. Le modifiche ritornano anche `moduli`, `oggetti`, `avvisi`, `codici_da_verificare` e `ok`.

| Tool | A cosa serve |
|---|---|
| `get_vehicle_info` | Misure, passaruota, porta scorrevole, larghezze/profondita valide, tipi componente |
| `list_presets` / `load_preset` | I 13 modelli pronti; `load_preset` sostituisce la configurazione e adatta al passo (L1/L2) |
| `get_configuration` | Configurazione corrente in JSON (formato in [modello-dati](modello-dati.md)) |
| `reset_configuration` | Svuota e sceglie il passo |
| `set_wheelbase` | Cambia L1/L2 (i moduli non si spostano da soli: leggi gli avvisi) |
| `list_options` | Varianti e codici validi per un tipo di componente in una data larghezza/profondita |
| `add_module` / `update_module` / `remove_module` | Moduli (coppia di fianchi), numerati da 1 |
| `add_component` / `update_component` / `remove_component` | Componenti dentro un modulo; posizione `p` automatica se omessa |
| `add_object` / `update_object` / `remove_object` | Attrezzatura personale o articoli del catalogo con ingombro, con controllo collisioni |
| `add_to_bom` / `remove_from_bom` | Articoli solo in distinta (senza posizione) |
| `search_catalog` / `list_catalog_sections` | Ricerca nel catalogo Syncro 26-1 |
| `validate_configuration` | Controllo completo con elenco di cosa correggere |
| `get_bom` | Distinta: quantita, codice, descrizione, pagina del catalogo |
| `save_configuration` / `load_configuration` / `list_saved_configurations` | File JSON compatibili con Importa/Esporta del configuratore |

## Cosa viene controllato

- Codici: fianchi KSI/YSI, ripiani XOS, cassetti KDW, vasche, cassettiere, pannelli, fermavaligie esistono nelle tabelle di `catalog.js`.
- Fianchi sovrapponibili: un'altezza qualsiasi a passi da 36 mm si ottiene con piu' coppie (es. 17 passi = 14 + 3).
- Collisioni tra moduli e oggetti, fuori dal vano, componenti sovrapposti, componente piu' profondo del modulo.
- Corridoio libero minimo 600 mm (ipotesi, costante `MIN_AISLE`), passaruota, porta scorrevole.

`codici_da_verificare` elenca le righe di distinta senza codice certo (per esempio i contenitori Euronorm): vanno confermati col rivenditore.

## Limiti

- Le misure del furgone vengono da schede tecniche e dal modello 3D: verificale col metro.
- Il server non genera il PDF: apri il JSON nel configuratore ed esporta da li'.
- Nessun controllo di peso, carico utile o norme di trasporto (es. bombole ADR).
- Un solo utente e una sola configurazione per processo.
