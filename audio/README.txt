Cartella per i file audio reali della tracklist del sound player.

Il player si apre cliccando il widget "SOUNDSCAPE" (in basso a destra,
visibile una volta entrati nel sito) e legge i brani da
content.js -> tracklist. Ogni voce punta a un file dentro questa
cartella:

  tracklist:[
    {file:'audio/track-001.mp3'},
    {file:'audio/track-002.mp3'},
    {file:'audio/track-003.mp3'},
    {file:'audio/track-004.mp3'},
    {file:'audio/track-005.mp3'}
  ]

DA V07.13: track-001.mp3 è il suono automatico del sito
Ora che track-001.mp3 è stato caricato, è diventato il suono che
parte da solo entrando nel sito (in loop continuo), al posto del
drone sintetizzato via codice usato nelle versioni precedenti. Il
player resta comunque disponibile per mettere in pausa, passare ad
un'altra traccia o scorrere la tracklist manualmente — controlla lo
stesso audio che si sente in sottofondo, non un brano separato.

Le tracce 002-005 restano segnaposto: finché il file corrispondente
non viene caricato qui con lo stesso nome, selezionarle nel player le
lascia semplicemente in pausa, senza errori mostrati all'utente.

Per aggiungere una nuova track oltre alla quinta, basta:
1) caricare il file qui (es. track-006.mp3)
2) aggiungere una riga in content.js -> tracklist:
   {file:'audio/track-006.mp3'}
Il titolo "track #006" viene generato automaticamente dalla posizione
nell'elenco — non va scritto a mano.

Formati supportati: quelli che il browser riconosce nativamente
(mp3, m4a/aac, ogg). Consigliato mp3 per la compatibilità più ampia.

Nota tecnica su track-001.mp3: il file caricato risulta internamente
un WAV (non un mp3 vero e proprio, nonostante l'estensione) — Chrome
lo riproduce comunque correttamente perché riconosce il formato dal
contenuto del file, non dal nome, ma non tutti i browser/dispositivi
garantiscono la stessa tolleranza. Per sicurezza, per i prossimi brani
conviene esportare/convertire in un vero mp3 (es. con un
convertitore online, o da un editor audio con "esporta come MP3")
prima di caricarli qui.
