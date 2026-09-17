const DATA=window.YEVEON_CONTENT||{}, photos=DATA.archive||[];
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const grid=$('#grid'), viewer=$('#viewer'), viewerImg=$('#viewerImg'), viewerCaption=$('#viewerCaption'), viewerCounter=$('#viewerCounter');
const intro=$('#intro'), enterButton=$('#enterButton'), soundToggle=$('#soundToggle'), soundLabel=$('#soundLabel'), audioReadout=$('#audioReadout'), audioTime=$('#audioTime'), spTime=$('#spTime'), ambient=$('.ambient'), stage=$('.floating-stage'), progress=$('.scroll-progress span'), archive=$('#archive');
let current=0, lang='it', entered=false, activeFilter='all';
// V07.16: the fullscreen viewer originally only ever showed `photos`
// (the Archive array). KOA KI MEIRU's gallery introduces a second,
// separate set of images that are not part of the Archive, so
// openViewer()/step() below now take an explicit list and remember it
// in viewerList — every existing call site is updated to pass `photos`
// explicitly, so their behaviour is unchanged; only the new KOA gallery
// (below) passes its own list.
let viewerList=photos;

function build(){
  if(!grid)return;
  grid.innerHTML='';
  photos.forEach((p,i)=>{
    const b=document.createElement('button');
    b.className='photo-card '+(i%4===0?'tall ':'')+(i%3===1?'offset-a':'');
    b.dataset.cat=p.category; b.dataset.index=i;
    b.innerHTML=`<span class="card-index">${String(i+1).padStart(2,'0')}</span><img src="${p.image}" alt="${p.label} / ${p.title}"><span class="photo-meta"><b>${p.label}</b><span>${p.title}</span></span>`;
    b.onclick=()=>openViewer(i,photos); grid.appendChild(b);
  });
}
build();

// Archive category phrases ("All"/Landscape/Urban/Liminal/Astro) — built
// from DATA.archiveIntros (content.js) instead of being hardcoded in
// index.html, same data-layer/behavior separation already used for the
// photo grid above. Order matches the filter buttons; visual stacking is
// unaffected by DOM order (CSS overlays all of them in the same grid
// cell and toggles visibility with .is-active, see styles.css).
const archiveIntrosEl=$('#archiveIntros');
function buildArchiveIntros(){
  if(!archiveIntrosEl)return;
  archiveIntrosEl.innerHTML='';
  const order=['all','landscape','urban','liminal','astro'];
  order.forEach(cat=>{
    const d=DATA.archiveIntros&&DATA.archiveIntros[cat];
    if(!d)return;
    const wrap=document.createElement('div');
    wrap.className='archive-category-intro';
    wrap.dataset.category=cat;
    const kicker=document.createElement('span');
    kicker.className='archive-kicker';
    kicker.textContent=d.kicker;
    const quote=document.createElement('p');
    quote.className='archive-quote';
    quote.dataset.it=d.it; quote.dataset.en=d.en;
    quote.textContent=d[lang]||d.it;
    wrap.append(kicker,quote);
    archiveIntrosEl.appendChild(wrap);
  });
}
buildArchiveIntros();

// YEVEON project detail — free-form gallery (images + short editorial
// phrases from DATA.project.gallery, content.js). Same JS-generation
// pattern as build()/buildArchiveIntros() above: run before the
// IntersectionObserver setup below so the .reveal items it creates get
// observed like every other reveal element on the page, and phrases get
// data-it/data-en so the existing toggleLang() covers them.
const projectGalleryEl=$('#projectGallery');
// V07.18 — Andrea asked for YEVEON's photos to sit closer together too,
// like KOA KI MEIRU's grid (V07.17), while keeping the editorial phrases
// exactly where they already appear in the middle of the gallery. In
// content.js the gallery is images and phrases mixed (currently always
// two images, then a phrase, repeated) — so instead of switching the
// whole gallery to a grid like KOA (which is pure photos), only the
// *runs* of consecutive images are grouped into a small side-by-side
// grid (.gallery-photo-group, styles.css); a phrase always flushes the
// current run and is then appended on its own right after, completely
// unaffected — same element, same classes, same position logic
// (gallery-pos-3/6/9 for alignment) as before this release.
function buildProjectGallery(){
  if(!projectGalleryEl||!DATA.project?.gallery)return;
  projectGalleryEl.innerHTML='';
  let photoRun=[];
  const flushPhotoRun=()=>{
    if(!photoRun.length)return;
    const group=document.createElement('div');
    group.className='gallery-photo-group';
    photoRun.forEach(fig=>group.appendChild(fig));
    projectGalleryEl.appendChild(group);
    photoRun=[];
  };
  DATA.project.gallery.forEach((item,i)=>{
    const pos='gallery-pos-'+(i+1);
    if(item.type==='phrase'){
      flushPhotoRun();
      const p=document.createElement('p');
      p.className='gallery-item gallery-phrase reveal '+pos;
      p.dataset.it=item.it; p.dataset.en=item.en;
      p.textContent=item[lang]||item.it;
      projectGalleryEl.appendChild(p);
    }else{
      const fig=document.createElement('figure');
      // No more gallery-pos-N here: that class used to size/align each
      // photo individually for the old one-at-a-time layout. Sizing is
      // now handled by .gallery-photo-group in styles.css instead.
      fig.className='gallery-item gallery-photo reveal';
      // Opens the same fullscreen #viewer used by the Archive grid (same
      // crossfade transition, same next/prev/Escape handling — see
      // openViewer()/step() below), navigating the full Archive set from
      // this photo's position in it. Every YEVEON gallery photo is reused
      // from the Archive pool (content.js), so this lookup always
      // resolves; if a future gallery photo is NOT also in the Archive
      // (archiveIndex -1), it degrades gracefully to a plain, non-
      // clickable figure instead of wiring a viewer index that doesn't
      // exist.
      const archiveIndex=photos.findIndex(p=>p.image===item.image);
      if(archiveIndex>=0){
        fig.innerHTML=`<button class="gallery-photo-btn" type="button" aria-label="Open ${item.label||'photo'} fullscreen"><img src="${item.image}" alt="${item.alt||''}"></button><figcaption class="gallery-photo-meta"><span>wYre / YEVEON</span><span>${item.label||''}</span></figcaption>`;
        fig.querySelector('.gallery-photo-btn').addEventListener('click',()=>openViewer(archiveIndex,photos));
      }else{
        fig.innerHTML=`<img src="${item.image}" alt="${item.alt||''}"><figcaption class="gallery-photo-meta"><span>wYre / YEVEON</span><span>${item.label||''}</span></figcaption>`;
      }
      photoRun.push(fig);
    }
  });
  flushPhotoRun();
}
buildProjectGallery();

// V07.16 — KOA KI MEIRU project detail gallery. Same generation pattern
// as buildProjectGallery() above (deliberately duplicated rather than
// merged into one generic function — same "one small JS block per
// project" choice already made for the dust-mote/threshold-mote layers,
// so YEVEON's gallery code above is never touched by this addition).
// Positions reuse the existing gallery-pos-1..9 CSS classes on a 9-step
// cycle (this gallery has 12 photos, more than the 9 defined positions);
// with 12 different photos/captions cycling through, the repeated
// layout slots don't read as an obviously repeating pattern.
// Unlike YEVEON, these photos are NOT part of the Archive pool — they
// only exist in this project — so the fullscreen viewer needs its own
// photo list (koaPhotos) instead of an Archive index lookup; see the
// openViewer(i,list)/viewerList generalisation above.
const projectGalleryKoaEl=$('#projectGalleryKoa');
const koaPhotos=(DATA.koaProject?.gallery||[]).filter(it=>it.type==='image').map(it=>{
  const [title,year]=(it.label||'').split(' — ');
  return {image:it.image,label:'KOA KI MEIRU',title:title||'',year:year||'',category:undefined};
});
// V07.17 — Andrea asked for the KOA gallery photos to sit closer together
// in a grouped arrangement, without any exaggeratedly large image ("un po'
// come nelle sezioni visual archive o yeveon"). YEVEON's gallery mixes
// photos with short phrases, so its free-form single-column layout (the
// gallery-pos-1..9 classes, one wide image at a time) makes sense there;
// KOA's gallery is pure photos, so it's switched instead to a proper
// multi-column grid (like Archive's own .grid), sized and gapped by CSS
// alone via #projectGalleryKoa/.gallery-photo:nth-child rules (styles.css)
// — no more position class needed per item, so this loop is simpler than
// buildProjectGallery() above (kept as its own function regardless, same
// "one small block per project" choice already made elsewhere).
function buildKoaGallery(){
  if(!projectGalleryKoaEl||!DATA.koaProject?.gallery)return;
  projectGalleryKoaEl.innerHTML='';
  DATA.koaProject.gallery.forEach((item,i)=>{
    if(item.type==='phrase'){
      const p=document.createElement('p');
      p.className='gallery-item gallery-phrase reveal';
      p.dataset.it=item.it; p.dataset.en=item.en;
      p.textContent=item[lang]||item.it;
      projectGalleryKoaEl.appendChild(p);
    }else{
      const fig=document.createElement('figure');
      fig.className='gallery-item gallery-photo reveal';
      const koaIndex=koaPhotos.findIndex(p=>p.image===item.image);
      fig.innerHTML=`<button class="gallery-photo-btn" type="button" aria-label="Open ${item.label||'photo'} fullscreen"><img src="${item.image}" alt="${item.alt||''}"></button><figcaption class="gallery-photo-meta"><span>wYre / KOA KI MEIRU</span><span>${item.label||''}</span></figcaption>`;
      if(koaIndex>=0)fig.querySelector('.gallery-photo-btn').addEventListener('click',()=>openViewer(koaIndex,koaPhotos));
      projectGalleryKoaEl.appendChild(fig);
    }
  });
}
buildKoaGallery();

function setAtmosphere(cat){
  if(!archive)return;
  archive.classList.remove('atmo-all','atmo-landscape','atmo-urban','atmo-liminal','atmo-astro');
  archive.classList.add(`atmo-${cat}`);
  const a=DATA.atmospheres?.[cat]||DATA.atmospheres?.all||{};
  document.documentElement.style.setProperty('--atmo-tint',a.tint||'#78806c');
  document.documentElement.style.setProperty('--atmo-secondary',a.secondary||'#38514a');
  archive.dataset.atmosphere=cat;
}
setAtmosphere('all');

if(DATA.project){
  const p=$('.project-text p'); if(p)p.textContent=DATA.project.description;
  const muted=$('.project-text .muted'); if(muted)muted.textContent=DATA.project.secondary;
  const quote=$('.project-quote'); if(quote)quote.textContent='“'+DATA.project.quote+'”';
}
// V07.16 — same population, scoped to #projectDetailViewKoa so it can't
// collide with the unscoped `$('.project-text p')` lookup above (which
// only ever matches the FIRST .project-text in the document — YEVEON's,
// since it comes first in index.html — so the block above is untouched
// and still yeveon-only).
if(DATA.koaProject){
  const koaRoot=document.getElementById('projectDetailViewKoa');
  const p=koaRoot?.querySelector('.project-text p'); if(p)p.textContent=DATA.koaProject.description;
  const muted=koaRoot?.querySelector('.project-text .muted'); if(muted)muted.textContent=DATA.koaProject.secondary;
  const quote=koaRoot?.querySelector('.project-quote'); if(quote)quote.textContent='“'+DATA.koaProject.quote+'”';
}
if(DATA.about){const large=$('.about-copy .large');if(large)large.textContent=DATA.about.statement;const body=$('.about-copy p:not(.large)');if(body)body.textContent=DATA.about.body;}
if(DATA.site){const e=$('.contact-links a[href^="mailto"]');if(e){e.href='mailto:'+DATA.site.email;e.childNodes[0].textContent=DATA.site.email+' ';}const ig=$('.contact-links a[aria-label="Instagram"]');if(ig)ig.href=DATA.site.instagram;}

enterButton?.addEventListener('click',(e)=>{
  e.preventDefault();
  e.stopPropagation();
  if(entered)return;
  entered=true;

  // Closes the intro only. The visitor lands at the top of the site
  // (Home/Hero) and scrolls through it at their own pace, instead of
  // being jumped straight to Archive.
  document.body.classList.remove('intro-active');
  intro?.classList.add('is-exiting');

  // Audio is deliberately isolated: an audio/autoplay error must not cancel navigation.
  try{startSound();}catch(err){console.warn('YEVEON audio could not start:',err);}
  setTimeout(()=>intro?.remove(),1100);
});

// Crossfade between photos: the outgoing photo fades its opacity down,
// then — once it is fully hidden — the src is swapped and the new photo
// fades from opacity 0 to 1. Only used when stepping while the viewer is
// already open; the very first opening of a photo keeps the existing
// one-shot "imageIn" reveal (triggered by the .viewer going from
// display:none to flex), which is unaffected by this change.
let viewerFadeTimer=null;
const prefersReducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
function openViewer(i,list){
  if(!viewer)return;
  if(list)viewerList=list;
  const wasOpen=viewer.classList.contains('open');
  current=i; const p=viewerList[i];
  const applyImage=()=>{
    viewerImg.src=p.image; viewerImg.alt=p.label+' / '+p.title;
    viewerCounter.textContent=`${String(i+1).padStart(2,'0')} / ${String(viewerList.length).padStart(2,'0')}`;
    viewerCaption.innerHTML=`<span>${String(i+1).padStart(2,'0')}</span><span>${p.label}</span><strong>${p.title}</strong><span>${p.year||''}</span>`;
  };
  if(wasOpen&&!prefersReducedMotion){
    // V07.13: lengthened from 320ms to 620ms (out+in) — at the original
    // speed the dissolve was too quick to read as an intentional fade
    // between two similarly dark/desaturated photos (reported by Andrea
    // as "no transition visible"); the mechanism itself was working,
    // it just needed more time on screen. See matching CSS transition
    // duration on .viewer img (styles.css).
    viewerImg.classList.add('is-fading');
    clearTimeout(viewerFadeTimer);
    viewerFadeTimer=setTimeout(()=>{
      applyImage();
      void viewerImg.offsetWidth; // force reflow so the opacity:0 state is registered before the fade-in transition starts
      viewerImg.classList.remove('is-fading');
    },620);
  }else{
    applyImage();
  }
  viewer.classList.add('open'); viewer.setAttribute('aria-hidden','false'); react(p.category);
}
function closeViewer(){
  viewer?.classList.remove('open');
  viewer?.setAttribute('aria-hidden','true');
  clearTimeout(viewerFadeTimer);
  viewerImg?.classList.remove('is-fading');
}
function step(d){openViewer((current+d+viewerList.length)%viewerList.length);}
$('#closeViewer')?.addEventListener('click',closeViewer);$('#prevViewer')?.addEventListener('click',()=>step(-1));$('#nextViewer')?.addEventListener('click',()=>step(1));
viewer?.addEventListener('click',e=>{if(e.target===viewer)closeViewer();});
addEventListener('keydown',e=>{if(!viewer?.classList.contains('open'))return;if(e.key==='Escape')closeViewer();if(e.key==='ArrowLeft')step(-1);if(e.key==='ArrowRight')step(1);});

$$('.filter').forEach(x=>x.addEventListener('click',()=>{
  $$('.filter').forEach(b=>b.classList.remove('active')); x.classList.add('active'); activeFilter=x.dataset.filter;
  setAtmosphere(activeFilter);
  $$('.photo-card').forEach(c=>c.classList.toggle('is-hidden',activeFilter!=='all'&&c.dataset.cat!==activeFilter));
  react(activeFilter);
}));

const obs=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)e.target.classList.add('in-view');else e.target.classList.remove('in-view');}),{threshold:.12});
$$('.reveal').forEach(x=>obs.observe(x));
const sectionObs=new IntersectionObserver(es=>es.forEach(e=>e.target.classList.toggle('section-active',e.isIntersecting)),{threshold:.18});
$$('section').forEach(x=>sectionObs.observe(x));

let lastY=scrollY,vel=0;
function loop(){
  vel+=(scrollY-lastY-vel)*.075; lastY=scrollY;
  const en=Math.min(1,Math.abs(vel)/35);
  document.documentElement.style.setProperty('--scroll-energy',en);
  if(stage)stage.style.transform=`translate3d(0,${Math.sin(scrollY*.002)*5+vel*.14}px,0)`;
  if(ambient)ambient.style.transform=`translate3d(${Math.sin(scrollY*.0011)*18}px,${Math.cos(scrollY*.0008)*12}px,0) rotate(${scrollY*.002}deg)`;
  document.documentElement.style.setProperty('--scroll-progress',String(scrollY/(document.documentElement.scrollHeight-innerHeight||1)));
  requestAnimationFrame(loop);
} loop();
addEventListener('scroll',()=>{const m=document.documentElement.scrollHeight-innerHeight;if(progress)progress.style.width=(m?scrollY/m*100:0)+'%';},{passive:true});

const cursor=$('.cursor'),dot=$('.cursor-dot');
if(matchMedia('(pointer:fine)').matches){addEventListener('pointermove',e=>{if(cursor)cursor.style.transform=`translate3d(${e.clientX}px,${e.clientY}px,0)`;if(dot)dot.style.transform=`translate3d(${e.clientX}px,${e.clientY}px,0)`;});$$('a,button,.image-word').forEach(x=>{x.addEventListener('mouseenter',()=>document.body.classList.add('cursor-hover'));x.addEventListener('mouseleave',()=>document.body.classList.remove('cursor-hover'));});}
function toggleLang(){lang=lang==='it'?'en':'it';document.documentElement.lang=lang;$$('[data-it]').forEach(e=>e.textContent=e.dataset[lang]);}
// Language toggle is wired to two buttons that share this one function:
// #langBtn (main nav) and #introLangBtn (intro overlay — the nav is
// pointer-events:none while the intro is on screen, so without its own
// control the language switch would be unreachable before entering the
// site; see intro markup in index.html).
$('#langBtn')?.addEventListener('click',toggleLang);
$('#introLangBtn')?.addEventListener('click',toggleLang);

let audioCtx=null, master=null, ambientFilter=null, ambientEl=null, soundOn=true, soundStart=0;
// Keeps #audioReadout's a11y/focus state in sync with its visual
// visibility: while hidden (opacity 0, ambient sound off) it must
// also be unreachable by keyboard Tab and invisible to assistive
// tech, since a native <button> stays focusable by default even
// when only hidden via opacity/pointer-events (unlike display:none).
function setReadoutInteractive(on){
  if(!audioReadout)return;
  audioReadout.setAttribute('aria-hidden',on?'false':'true');
  if(on)audioReadout.removeAttribute('tabindex');else audioReadout.setAttribute('tabindex','-1');
}
// V07.13 — ambient sound now plays the real track (DATA.tracklist[0],
// track-001) instead of the procedurally synthesised drone this used
// to build (oscillators/noise buffer, removed). On Andrea's explicit
// request: now that a real file exists, it becomes the site's actual
// automatic soundtrack (starts on entering the site, loops), rather
// than a separate manual-only jukebox. The #soundPlayer (tracklist
// panel) still opens from the same #audioReadout widget and still
// lets Andrea browse/select tracks manually — it now controls this
// SAME shared <audio> element instead of a separate one, so opening/
// closing the panel or picking a track there directly affects what's
// actually playing as the site's ambient sound.
//
// Still routed through the Web Audio API (not just a plain <audio>
// play() call) so the existing fade()/react() infrastructure keeps
// working: a GainNode for the on/off fade, and a lowpass filter whose
// cutoff still responds to the Archive category being viewed —
// previously done by re-tuning oscillator pitches (meaningless for a
// real recording), now done by brightening/darkening the filter
// instead. Same reactive-to-category *idea*, adapted to real audio.
function startSound(){
  if(audioCtx)return;
  ambientEl=$('#soundPlayerAudio');
  const track=(DATA.tracklist||[])[0];
  if(!ambientEl||!track)return;
  audioCtx=new(window.AudioContext||window.webkitAudioContext)(); if(audioCtx.state==='suspended')audioCtx.resume();
  master=audioCtx.createGain(); master.gain.value=.0001; master.connect(audioCtx.destination);
  ambientFilter=audioCtx.createBiquadFilter(); ambientFilter.type='lowpass'; ambientFilter.frequency.value=2200; ambientFilter.Q.value=.5; ambientFilter.connect(master);
  audioCtx.createMediaElementSource(ambientEl).connect(ambientFilter);
  if(!ambientEl.src)ambientEl.src=track.file;
  ambientEl.loop=true;
  ambientEl.play().catch(err=>console.warn('wYre ambient track could not start —',err?.message||err));
  soundStart=performance.now(); audioReadout?.classList.add('visible'); setReadoutInteractive(true); timer(); fade(true);
}
function fade(on){if(!audioCtx)return;const n=audioCtx.currentTime;master.gain.cancelScheduledValues(n);master.gain.setTargetAtTime(on?1:.0001,n,on?.9:.18);}
function react(cat){
  if(!audioCtx||!ambientFilter||!soundOn)return;
  const hz={all:2200,landscape:1600,urban:3400,liminal:1200,astro:850}[cat]??2200;
  ambientFilter.frequency.linearRampToValueAtTime(hz,audioCtx.currentTime+1.6);
  document.documentElement.style.setProperty('--sound-temperature',cat==='astro'?.72:cat==='urban'?.42:cat==='landscape'?.25:.55);
}
soundToggle?.addEventListener('click',()=>{if(!audioCtx){startSound();return;}soundOn=!soundOn;fade(soundOn);soundToggle.classList.toggle('off',!soundOn);soundLabel.textContent=soundOn?'SOUND ON':'SOUND OFF';audioReadout?.classList.toggle('visible',soundOn);setReadoutInteractive(soundOn);});
// V07.14: writes the SAME computed string to both #audioTime (fixed
// widget, visible while browsing) and #spTime (inside the sound
// player panel) in this one function call — both read from the same
// ambientEl.currentTime, so they cannot drift apart from each other,
// per Andrea's request that the two stay in sync.
function timer(){if(!audioCtx)return;const s=Math.floor(ambientEl?ambientEl.currentTime||0:0);const t=String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');if(audioTime)audioTime.textContent=t;if(spTime)spTime.textContent=t;requestAnimationFrame(timer);}
$$('img').forEach(i=>i.ondragstart=e=>e.preventDefault());

if(archive){
  const field=document.createElement("div"); field.className="world-field";
  const waves=document.createElement("div"); waves.className="world-waves";
  const grain=document.createElement("div"); grain.className="world-grain";
  const glow=document.createElement("div"); glow.className="world-glow";
  archive.prepend(field,waves,grain,glow);

  let raf=0, lastY=window.scrollY;
  const moveWorld=()=>{
    const rect=archive.getBoundingClientRect();
    const viewport=innerHeight;
    const center=viewport/2;
    const delta=(rect.top+rect.height/2-center)/Math.max(rect.height,1);
    const x=Math.max(-34,Math.min(34,delta*42));
    const y=Math.max(-42,Math.min(42,-delta*52));
    archive.style.setProperty("--archive-x",x.toFixed(2));
    archive.style.setProperty("--archive-y",y.toFixed(2));
    archive.classList.add("is-scrolling");
    clearTimeout(raf);
    raf=setTimeout(()=>archive.classList.remove("is-scrolling"),120);
    lastY=scrollY;
  };
  addEventListener("scroll",moveWorld,{passive:true});
  addEventListener("resize",moveWorld,{passive:true});
  moveWorld();
}

// Project/YEVEON section — decorative background layers (same "prepend
// via JS, style purely in CSS" pattern as the Archive world-* layers
// above). .project-glow is the black/glass atmosphere shown in the
// project LIST view; .project-wave and .project-fog are the fuller
// colour atmosphere that crossfades in while the YEVEON detail is
// open (see the PROJECTS list/detail toggle below, which adds/removes
// .detail-open).
const projectSection=$('.project');
if(projectSection){
  const glow=document.createElement('div'); glow.className='project-glow';
  const wave=document.createElement('div'); wave.className='project-wave';
  const fog=document.createElement('div'); fog.className='project-fog';
  projectSection.prepend(glow,wave,fog);

  // V07.16 — KOA KI MEIRU's own "scintillii" layer (.project-koa-sparkle,
  // requested as an ethereal background: slow-moving glows + twinkling
  // light + gentle wave motion, in gold/olive/navy-blue/white). The
  // slow glow drift and wave motion reuse .project-wave above (see its
  // detail-project-koa-ki-meiru colour override in styles.css) — this
  // extra layer supplies just the twinkling points of light on top,
  // using the same "many individually-randomised elements" idiom as
  // .threshold-mote/.dust-mote (script.js elsewhere) instead of a
  // tiled/repeating pattern, for the same "not geometric" reason
  // Andrea asked for on About/Threshold. Reuses the existing generic
  // dustFloat keyframe (styles.css) — animates via custom properties
  // only, so referencing it here doesn't touch About/Threshold's rules.
  const koaSparkle=document.createElement('div'); koaSparkle.className='project-koa-sparkle';
  const KOA_SPARKLE_COUNT=50;
  const KOA_SPARKLE_COLORS=['rgba(201,162,39,COL)','rgba(216,184,74,COL)','rgba(139,148,110,COL)','rgba(58,82,120,COL)','rgba(239,233,218,COL)'];
  for(let i=0;i<KOA_SPARKLE_COUNT;i++){
    const m=document.createElement('div');
    m.className='koa-mote';
    m.style.setProperty('--dust-x',(2+Math.random()*96).toFixed(1)+'%');
    m.style.setProperty('--dust-y',(4+Math.random()*92).toFixed(1)+'%');
    m.style.setProperty('--dust-size',(1+Math.random()*2.8).toFixed(1)+'px');
    m.style.setProperty('--dust-blur',(Math.random()*1.4).toFixed(1)+'px');
    const opBase=.12+Math.random()*.22;
    m.style.setProperty('--dust-op-base',opBase.toFixed(2));
    m.style.setProperty('--dust-op-peak',(opBase+.3+Math.random()*.4).toFixed(2));
    m.style.setProperty('--dust-dur',(5+Math.random()*12).toFixed(1)+'s');
    m.style.setProperty('--dust-delay',(-Math.random()*12).toFixed(1)+'s');
    m.style.setProperty('--dust-dx',Math.round((Math.random()<.5?-1:1)*(14+Math.random()*24))+'px');
    m.style.setProperty('--dust-dy',Math.round((Math.random()<.5?-1:1)*(14+Math.random()*24))+'px');
    const color=KOA_SPARKLE_COLORS[i%KOA_SPARKLE_COLORS.length].replace('COL',(.65+Math.random()*.35).toFixed(2));
    m.style.setProperty('--dust-color',color);
    koaSparkle.appendChild(m);
  }
  projectSection.prepend(koaSparkle);
}

// About — floating dust texture layer (.about-dust/.dust-mote,
// styles.css), paired with the animated colour drift already on
// #about::before. V07.14: Andrea reported two problems with the
// previous version of this layer (.section-grain, a single element
// tiling two fixed-size repeating dot patterns): it was also being
// injected into #contact (removed here — About only now, per his
// request), and it bled visually onto the Projects section above
// About (fixed with overflow:hidden on #about in styles.css — see the
// comment there for the stacking-context vs. clipping explanation).
// He also disliked the look itself: a regular tiled grid reads as
// geometric, not like dust. Replaced with the same
// "many independently-randomised elements" idiom already used for
// .about-droplet/.float/the YEVEON gallery below, instead of a
// repeating CSS pattern — every mote gets its own position, size,
// blur, opacity and drift path via inline custom properties, so
// nothing lines up into a visible pattern.
const aboutDustSection=$('#about');
if(aboutDustSection){
  const dustLayer=document.createElement('div');
  dustLayer.className='about-dust';
  const DUST_COUNT=55;
  for(let i=0;i<DUST_COUNT;i++){
    const m=document.createElement('div');
    m.className='dust-mote';
    m.style.setProperty('--dust-x',(2+Math.random()*96).toFixed(1)+'%');
    m.style.setProperty('--dust-y',(4+Math.random()*92).toFixed(1)+'%');
    m.style.setProperty('--dust-size',(1+Math.random()*2.4).toFixed(1)+'px');
    m.style.setProperty('--dust-blur',(Math.random()*1.4).toFixed(1)+'px');
    const opBase=.06+Math.random()*.16;
    m.style.setProperty('--dust-op-base',opBase.toFixed(2));
    m.style.setProperty('--dust-op-peak',(opBase+.12+Math.random()*.18).toFixed(2));
    m.style.setProperty('--dust-dur',(5+Math.random()*14).toFixed(1)+'s');
    m.style.setProperty('--dust-delay',(-Math.random()*14).toFixed(1)+'s');
    m.style.setProperty('--dust-dx',Math.round((Math.random()<.5?-1:1)*(14+Math.random()*22))+'px');
    m.style.setProperty('--dust-dy',Math.round((Math.random()<.5?-1:1)*(14+Math.random()*22))+'px');
    dustLayer.appendChild(m);
  }
  aboutDustSection.prepend(dustLayer);
}

// Intro — slow colour-cycling atmosphere layer (.intro-atmosphere),
// same prepend-an-empty-styled-div pattern as every other decorative
// layer on this page. Sits above .intro-wash, below .intro-center
// (z-index handled entirely in CSS, not DOM order) so it never
// competes with the wordmark/CTA.
if(intro){
  const atmo=document.createElement('div');
  atmo.className='intro-atmosphere';
  atmo.setAttribute('aria-hidden','true');
  intro.prepend(atmo);
}

// Threshold — "onde invisibili" (.threshold-waves) layer, same
// prepend-an-empty-styled-div pattern as every other decorative layer
// on this page (styles.css has the actual gradients/keyframes). Added
// behind .threshold::before (already set by CSS in V07.9), z-index:-1
// within the section's own isolate context, so it never sits above
// the text.
const thresholdSection=$('.threshold');
if(thresholdSection){
  const waves=document.createElement('div'); waves.className='threshold-waves';
  thresholdSection.prepend(waves);
}

// Threshold — "scintillii" (points of light), V07.15 rewrite. Andrea
// found the previous version (.threshold-sparkle, V07.12/13) too
// basic/geometric: it was a single element tiling three fixed-size
// repeating dot patterns via background-image, the exact same
// "regular grid" problem already fixed for About's dust layer in
// V07.14 (.about-dust/.dust-mote) — for the identical reason,
// replaced with the same idiom instead of re-tuning the old one:
// .threshold-dust holds 45 individually-randomised .threshold-mote
// elements (styles.css), each with its own position, size, blur,
// opacity and drift path, so nothing lines up into a visible pattern.
// Reuses the generic dustFloat keyframe already defined for .dust-mote
// (styles.css) — that keyframe only reads custom properties, so a
// second selector can animate with it without touching the existing
// About rule at all. Colour stays close to the original sparkle's
// warm ivory tone (with per-mote alpha variation for a twinkling
// feel) and keeps the same screen blend mode, so it still reads as
// "points of light" rather than the more muted dust look on About.
if(thresholdSection){
  const dustLayer=document.createElement('div');
  dustLayer.className='threshold-dust';
  const THRESHOLD_DUST_COUNT=45;
  for(let i=0;i<THRESHOLD_DUST_COUNT;i++){
    const m=document.createElement('div');
    m.className='threshold-mote';
    m.style.setProperty('--dust-x',(2+Math.random()*96).toFixed(1)+'%');
    m.style.setProperty('--dust-y',(4+Math.random()*92).toFixed(1)+'%');
    m.style.setProperty('--dust-size',(1+Math.random()*2.6).toFixed(1)+'px');
    m.style.setProperty('--dust-blur',(Math.random()*1.4).toFixed(1)+'px');
    const opBase=.1+Math.random()*.2;
    m.style.setProperty('--dust-op-base',opBase.toFixed(2));
    m.style.setProperty('--dust-op-peak',(opBase+.25+Math.random()*.35).toFixed(2));
    m.style.setProperty('--dust-dur',(4+Math.random()*10).toFixed(1)+'s');
    m.style.setProperty('--dust-delay',(-Math.random()*10).toFixed(1)+'s');
    m.style.setProperty('--dust-dx',Math.round((Math.random()<.5?-1:1)*(12+Math.random()*20))+'px');
    m.style.setProperty('--dust-dy',Math.round((Math.random()<.5?-1:1)*(12+Math.random()*20))+'px');
    m.style.setProperty('--dust-color','rgba(233,226,196,'+(.7+Math.random()*.3).toFixed(2)+')');
    dustLayer.appendChild(m);
  }
  thresholdSection.prepend(dustLayer);
}

// About — floating blurred "digital droplets" (.about-droplet), each
// with its own randomised position/size/speed so they drift up and
// down independently rather than as one flat repeating pattern (same
// "several independently-timed elements" idiom as .float in the hero
// and the YEVEON gallery photos). Purely decorative, z-index:-1, no
// interaction — safe to size with Math.random() since nothing else on
// the page depends on their exact position.
const aboutSection=$('#about');
if(aboutSection){
  const layer=document.createElement('div');
  layer.className='about-droplets';
  // V07.13: Andrea reported the droplets weren't visible — confirmed by
  // screenshot review (opacity .18-.4 with a 10-20px blur was reading as
  // near-invisible against the black background). Count, size and
  // opacity raised, blur reduced, so each droplet reads as a distinct
  // soft glow.
  const DROPLET_COUNT=9;
  for(let i=0;i<DROPLET_COUNT;i++){
    const d=document.createElement('div');
    d.className='about-droplet';
    d.style.setProperty('--drop-x',(6+Math.random()*88)+'%');
    d.style.setProperty('--drop-y',(6+Math.random()*88)+'%');
    d.style.setProperty('--drop-size',Math.round(70+Math.random()*110)+'px');
    d.style.setProperty('--drop-blur',Math.round(6+Math.random()*8)+'px');
    d.style.setProperty('--drop-op',(.4+Math.random()*.35).toFixed(2));
    d.style.setProperty('--drop-dur',(10+Math.random()*10).toFixed(1)+'s');
    d.style.setProperty('--drop-delay',(-Math.random()*10).toFixed(1)+'s');
    d.style.setProperty('--drop-range',(-30-Math.random()*40)+'px');
    layer.appendChild(d);
  }
  aboutSection.prepend(layer);
}






/* =========================================================
   ARCHIVE — CATEGORY INTRO ACTIVATION
   Shows the phrase whose data-category matches the active filter.
   (V07.3: consolidated. This used to be bundled inside a larger
   "V07 — CINEMATIC ARCHIVE EXPERIENCE" block together with a
   duplicate fullscreen viewer and a second, disconnected language
   system; both were removed as part of the V07.3 hygiene pass —
   the viewer at #viewer already covers this, and the language
   toggle now covers brand-tagline/brand-alias directly via
   data-it/data-en, see index.html.)
   ========================================================= */
(function(){
  const archive=document.getElementById("archive");
  if(!archive) return;
  function activateArchiveIntro(name){
    const n=String(name||"").toLowerCase();
    document.querySelectorAll(".archive-category-intro").forEach(el=>{
      el.classList.toggle("is-active",el.dataset.category===n);
    });
  }
  // Read the filter that is actually marked active in the markup,
  // instead of assuming one — keeps this in sync with the default
  // "ALL" filter state instead of forcing "landscape" on load.
  const initialFilter=document.querySelector(".filter.active")?.dataset.filter||"all";
  activateArchiveIntro(initialFilter);
  document.addEventListener("click",e=>{
    const b=e.target.closest("[data-filter]");
    if(b) activateArchiveIntro(b.dataset.filter);
  },true);
})();

/* =========================================================
   PROJECTS — list / detail toggle
   Clicking a project in the list swaps it for that project's detail
   view (image, text, quote); any of its back controls reverses it.
   V07.16: generalised from a single hardcoded detail view (YEVEON) to
   any number of `.project-detail-view[data-project]` elements, to add
   KOA KI MEIRU as a second project without touching how YEVEON's own
   toggle behaves — a click still just shows the one matching
   data-project and hides the rest, exactly as before when there was
   only one. Also adds a per-project `detail-project-<id>` class on the
   section (alongside the existing `detail-open`) so CSS can give each
   project's background its own colours/layers (see .project-wave and
   the new .project-koa-sparkle in styles.css) without the two projects'
   backgrounds bleeding into each other.
   ========================================================= */
(function(){
  const listView=document.getElementById('projectListView');
  const detailViews=$$('.project-detail-view');
  if(!listView||!detailViews.length) return;
  const section=listView.closest('.project');
  const projectClasses=detailViews.map(v=>'detail-project-'+v.dataset.project);
  function openDetail(id){
    detailViews.forEach(v=>{v.hidden=(v.dataset.project!==id);});
    listView.hidden=true;
    section?.classList.remove(...projectClasses);
    section?.classList.add('detail-open','detail-project-'+id);
  }
  function closeDetail(){
    detailViews.forEach(v=>v.hidden=true);
    listView.hidden=false;
    section?.classList.remove('detail-open',...projectClasses);
  }
  $$('.project-list-item').forEach(btn=>{
    btn.addEventListener('click',()=>openDetail(btn.dataset.project));
  });
  $$('.project-back').forEach(btn=>{
    btn.addEventListener('click',closeDetail);
  });
})();

/* =========================================================
   NAV BRAND — shows the name of the section currently in view,
   e.g. "wYre / ARCHIVE". Independent of the existing sectionObs
   observer (which only toggles .section-active) so that observer
   is left untouched.
   Driven by requestAnimationFrame rather than IntersectionObserver
   or the 'scroll' event: testing showed a fast anchor-link / CTA
   jump between distant sections can occasionally skip dispatching
   a 'scroll' event and can batch several sections' IntersectionObserver
   entries into one callback (only the last of which would have been
   applied). Recomputing the true current section from geometry every
   frame sidesteps both issues; the six getBoundingClientRect() calls
   involved are inexpensive.
   ========================================================= */
(function(){
  const label=document.getElementById('navSectionLabel');
  if(!label) return;
  const names={home:'HOME',threshold:'THRESHOLD',archive:'ARCHIVE',yeveon:'PROJECTS',about:'ABOUT',contact:'CONTACT'};
  const sections=$$('main > section[id]');
  function currentSection(){
    const mid=innerHeight/2;
    let best=null,bestDist=Infinity;
    sections.forEach(s=>{
      const r=s.getBoundingClientRect();
      if(r.top<=mid&&r.bottom>=mid){
        const dist=Math.abs((r.top+r.bottom)/2-mid);
        if(dist<bestDist){bestDist=dist;best=s;}
      }
    });
    return best;
  }
  let lastId=null;
  function tick(){
    const s=currentSection();
    if(s&&s.id!==lastId&&names[s.id]){lastId=s.id;label.textContent=names[s.id];}
    requestAnimationFrame(tick);
  }
  tick();
})();

/* =========================================================
   V07.10/V07.11 — SOUND PLAYER
   Opened by clicking the .audio-readout widget (the fixed
   bottom-right "SOUNDSCAPE" readout, #audioReadout) — it is
   position:fixed, so it stays reachable from any section once the
   ambient sound has started, not just from Home. V07.10 originally
   opened this player from a separate "SOUND / FIELD 001" text in
   the Home hero (#soundNoteBtn); that element was removed in
   V07.11 in favour of reusing this one, per Andrea's request, so
   there is a single "open player" entry point instead of two.

   Fully independent from the ambient background engine above
   (startSound/fade/react/soundToggle): opening or using this
   player does not start, stop or otherwise touch the continuous
   ambient drone, and vice versa — two separate systems on purpose,
   to avoid any risk of regressing the existing one. This does mean
   #audioReadout now does double duty (ambient-sound status readout
   + player launcher): only visible/reachable while the ambient
   drone is on (see startSound()/soundToggle above), same as before
   V07.11 — clicking it never toggles the ambient drone itself, only
   opens the player.

   Tracklist comes from DATA.tracklist (content.js): currently
   placeholder file paths under /audio that do not exist yet
   (Andrea will add the real audio files later). Track titles
   ("track #001", "track #002"...) are generated here from each
   entry's position, not stored in content.js, so adding a real
   track later only means adding one {file:...} line there.
   Playback errors (missing file, autoplay restrictions) are caught
   so the player UI never breaks — it just stays in a paused state.
   ========================================================= */
(function(){
  const openBtn=$('#audioReadout');
  const player=$('#soundPlayer');
  const closeBtn=$('#soundPlayerClose');
  const list=$('#soundPlayerList');
  const prevBtn=$('#spPrev');
  const playBtn=$('#spPlay');
  const nextBtn=$('#spNext');
  const audioEl=$('#soundPlayerAudio');
  const tracks=DATA.tracklist||[];
  if(!openBtn||!player||!list||!audioEl||!tracks.length)return;

  let index=0;

  tracks.forEach((t,i)=>{
    const num=String(i+1).padStart(3,'0');
    const li=document.createElement('li');
    const row=document.createElement('button');
    row.type='button';
    row.className='sound-player-track';
    row.innerHTML=`<span class="sound-player-track-title">track #${num}</span><span class="track-playing-icon" aria-hidden="true"><i></i><i></i><i></i><i></i></span>`;
    row.addEventListener('click',()=>{
      if(i===index){togglePlay();return;}
      selectTrack(i,true);
    });
    li.appendChild(row);
    list.appendChild(li);
  });
  const rows=$$('.sound-player-track');

  function highlight(){rows.forEach((r,i)=>r.classList.toggle('is-active',i===index));}

  function pauseUI(){
    player.classList.remove('is-playing');
    playBtn?.classList.remove('is-playing');
    playBtn?.setAttribute('aria-pressed','false');
    playBtn?.setAttribute('aria-label','Play');
  }
  function playingUI(){
    player.classList.add('is-playing');
    playBtn?.classList.add('is-playing');
    playBtn?.setAttribute('aria-pressed','true');
    playBtn?.setAttribute('aria-label','Pause');
  }
  function play(){
    audioEl.play().then(playingUI).catch(err=>{
      // Placeholder track with no real file yet, or an autoplay
      // restriction: fail silently into a paused state instead of
      // breaking the player or throwing in the console as an error.
      console.warn('wYre sound player: track not available yet —',err?.message||err);
      pauseUI();
    });
  }
  function pause(){audioEl.pause();pauseUI();}
  function togglePlay(){
    if(!audioEl.src){selectTrack(index,true);return;}
    if(audioEl.paused)play();else pause();
  }
  function selectTrack(i,autoplay){
    index=(i+tracks.length)%tracks.length;
    audioEl.src=tracks[index].file;
    highlight();
    if(autoplay)play();else pauseUI();
  }
  function next(){const wasPlaying=!audioEl.paused;selectTrack(index+1,wasPlaying);}
  function prev(){const wasPlaying=!audioEl.paused;selectTrack(index-1,wasPlaying);}

  audioEl.addEventListener('ended',()=>selectTrack(index+1,true));
  audioEl.addEventListener('error',pauseUI);

  function openPlayer(){
    // V07.13: audioEl.src is already set by startSound() (ambient
    // playback starts on entering the site, before the player is ever
    // opened) — sync the play button to whatever is actually already
    // playing instead of assuming paused, so the panel reflects reality
    // the moment it opens.
    if(!audioEl.src)selectTrack(0,false);else{highlight();audioEl.paused?pauseUI():playingUI();}
    player.classList.add('open');
    player.setAttribute('aria-hidden','false');
  }
  function closePlayer(){
    // V07.13: no longer pauses on close. The tracklist here now
    // controls the site's actual ambient soundtrack (see startSound()),
    // so closing this panel should leave it playing in the background —
    // same as any other overlay on the site doesn't stop the ambient
    // sound. Use the play/pause button, or the nav SOUND ON/OFF toggle,
    // to actually stop it.
    player.classList.remove('open');
    player.setAttribute('aria-hidden','true');
  }

  openBtn.addEventListener('click',openPlayer);
  closeBtn?.addEventListener('click',closePlayer);
  player.addEventListener('click',e=>{if(e.target===player)closePlayer();});
  playBtn?.addEventListener('click',togglePlay);
  nextBtn?.addEventListener('click',next);
  prevBtn?.addEventListener('click',prev);
  addEventListener('keydown',e=>{
    if(!player.classList.contains('open'))return;
    if(e.key==='Escape')closePlayer();
    if(e.key==='ArrowRight')next();
    if(e.key==='ArrowLeft')prev();
  });
})();
