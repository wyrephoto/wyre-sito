// V07.19 — Ponte tra il CMS (Sveltia CMS, pannello /admin) e il sito.
//
// Il sito (index.html/script.js/styles.css) NON è stato toccato in
// questa release: legge ancora esattamente come prima window.YEVEON_
// CONTENT da content.js, sincrono, nessun cambiamento di comportamento.
//
// Quello che cambia è dove vive il contenuto "sorgente": prima era
// scritto a mano direttamente dentro content.js (un oggetto JS); ora
// vive in content.json (JSON puro), che è il formato che il pannello
// /admin (Sveltia CMS, vedi admin/config.yml) sa leggere e scrivere
// quando Andrea modifica testi o foto da lì.
//
// Questo script fa da ponte: legge content.json e rigenera content.js
// nell'identico formato che il sito si aspetta. Va eseguito ad ogni
// pubblicazione — su Cloudflare Pages questo è il "build command"
// (vedi ISTRUZIONI_PUBBLICAZIONE.txt), quindi succede automaticamente
// ogni volta che Andrea salva una modifica dal pannello /admin, prima
// che il sito aggiornato vada online. Nessuna libreria esterna: solo
// il modulo "fs" già incluso in Node, per restare più semplice ed
// affidabile possibile.
const fs = require('fs');
const path = require('path');

const contentPath = path.join(__dirname, 'content.json');
const outputPath = path.join(__dirname, 'content.js');

const raw = fs.readFileSync(contentPath, 'utf8');
const data = JSON.parse(raw); // fallisce rumorosamente se il JSON è invalido, non genera un content.js rotto in silenzio

const output = 'window.YEVEON_CONTENT=' + JSON.stringify(data) + ';\n';
fs.writeFileSync(outputPath, output);

console.log('content.js rigenerato da content.json (' + Object.keys(data).length + ' sezioni).');
