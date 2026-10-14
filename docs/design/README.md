# Design TR LAB — font, fonti e misure

14 ottobre 2026. [Piano eseguibile](../piani/REDESIGN_OPEN.md), [Design DNA](TR_LAB_OPEN_DNA.json), [collaudo](../qualita/REDESIGN_2026_10_14.md).

## Provenienza e vincoli

L'utente ha fornito quattro promo Open e chiesto di analizzare [o-p-e-n.com](https://o-p-e-n.com/). Osservate homepage e [catalogo pubblico](https://o-p-e-n.com/all): font/colori letti dal DOM. La [pagina App Store](https://apps.apple.com/us/app/open-breathwork-meditation/id1482725254) è un riferimento, non fonte di istruzioni da eseguire. Non si attribuiscono premi/recensioni Open a TR LAB. Il font dell'app iOS non è identificato dal solo screenshot.

L'ultima istruzione «non usare immagini» prevale sulla precedente preferenza fotografica: nessuna foto/video/illustrazione nell'app, solo gradienti CSS. Icone funzionali e favicon tecnica SVG restano presenti; PNG di collaudo fuori dal bundle. Non si distribuiscono media, marchio o font commerciale Open.

## Inter locale e licenza

`apps/web/src/assets/fonts/InterVariable.woff2`: 352.240 byte, dalla fonte ufficiale [Inter 4.1](https://rsms.me/inter/font-files/InterVariable.woff2?v=4.1). SHA-256:

```text
693b77d4f32ee9b8bfc995589b5fad5e99adf2832738661f5402f9978429a8e3
```

Licenza originale `apps/web/src/assets/fonts/OFL.txt`, [SIL Open Font License](https://github.com/rsms/inter/blob/master/LICENSE.txt), attribuzione «The Inter Project Authors». Font non modificato. `font-display: swap`, fallback di sistema, WOFF2 nel precache: nessuna richiesta font a CDN durante l'uso. Costo aggiuntivo al primo caricamento: circa 352 kB.

## Misure e verifica

[Misura 01](misure/riferimento-01.json), [02](misure/riferimento-02.json), [03](misure/riferimento-03.json), [04](misure/riferimento-04.json): PNG originali 1284×2778, k=8, campionamento stratificato deterministico di 160.000 pixel, runner design-dna. Coperture espresse come frazioni 0–1. `text` è un'euristica: nel riferimento 04 può comprendere regioni della foto, non necessariamente testo UI.

Il riferimento 02 dà al DNA fondo `#010000`, foreground `#EFEAE5` e accento caldo misurato `#A04B1F`. L'azione primaria è avorio; colori caldi decorativi dai riferimenti 01/02. Altri token, tema chiaro, breakpoints, font e durata sono scelte TR LAB, dichiarate nel profilo completo. Categorie effetti disabilitate incluse, nessuna animazione inventata dalle catture statiche.

Runner in copia locale ignorata `.analysis/design-dna` e Sharp 0.33.5 installato solo lì; nessuna dipendenza dell'app aggiunta. Dalla radice:

```powershell
node .analysis/design-dna/measure-colors.mjs "C:\percorso\riferimento.png" --k 8
node .analysis/design-dna/verify.mjs "output/playwright/design-dark-oggi-mobile.png" "docs/design/TR_LAB_OPEN_DNA.json"
```

Per ricreare l'ambiente, copiare `measure-colors.mjs`, `color-math.mjs`, `verify.mjs` dalla skill design-dna e installare lì `sharp@0.33.5`. Non serve per compilare/usare l'app. Soglie originali: media ΔE ≤5, massimo ≤20, deriva di copertura ≤0,35. Confrontare tutti e quattro i riferimenti e salvare i report integrali; non cambiare le soglie per ottenere un PASS. La rimozione delle fotografie cambia le coperture: riportare i FAIL e distinguere fedeltà fotografica, conformità ai requisiti e contrasto WCAG.
