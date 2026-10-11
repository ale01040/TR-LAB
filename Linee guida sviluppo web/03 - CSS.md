# CSS

usare nomi adeguati

usare  in modo adeguato le unità relative, preferire rem a em per i font, fare attenzione con em,em resta utile per padding/margini proporzionali al font locale.

attenzione con gli stili con grazia, certi dispositivi a bassa risoluzione non lo leggono

sans-serif a video, serif in stampa, monospace per il codice, massimo 2–3 font per pagina

usare le unità fisse/statiche solo in modalità print

mettere sempre la possibilità di stampare la pagina

usare bene le mediaquery, adattare la pagina alla viewport

usare l'mpaginazione corretta

usare https://jigsaw.w3.org/css-validator/ per vedere se il css è scritto bene

opzionale: usare box-sizing: border-box 

Grid per la macro-struttura della pagina, Flexbox per i micro-componenti. Se ti accorgi che stai ragionando su righe e colonne insieme → Grid. Se ragioni su un'unica fila di elementi → Flexbox.Flexbox e Grid non sono alternative esclusive, sono complementari.
