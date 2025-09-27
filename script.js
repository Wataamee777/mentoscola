// MentosCola game v1
// - Title screen
// - First-time name registration (saved to localStorage permanently)
// - 10s gameplay: tap to spawn mentos at tap-x, they fall; if they hit bottle mouth => +1 and spawn bubbles
// - After 10s: panel with bottom fade-in bubble animation, ranking fetch on demand and X-post prep

// ============== Configuration ==============
const GAME_TIME = 10; // seconds
const GRAVITY = 0.6;
const MENTOS_RADIUS = 8;
const PARTICLES_PER_HIT = 14;
const PARTICLE_LIFE = 50;
const COLA_WIDTH = 110;
const COLA_HEIGHT = 120;

// ============== DOM ==============
const titleScreen = document.getElementById('titleScreen');
const titleTap = document.getElementById('titleTap');
const nameModal = document.getElementById('nameModal');
const nameInput = document.getElementById('playerName');
const saveNameBtn = document.getElementById('saveName');
const skipNameBtn = document.getElementById('skipName');

const gameScreen = document.getElementById('gameScreen');
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const timerEl = document.getElementById('timer');
const scoreEl = document.getElementById('score');
const nameBadge = document.getElementById('nameBadge');

const resultPanel = document.getElementById('resultPanel');
const finalScoreEl = document.getElementById('finalScore');
const fetchRankBtn = document.getElementById('fetchRankBtn');
const shareBtn = document.getElementById('shareBtn');
const rankingListEl = document.getElementById('rankingList');
const restartBtn = document.getElementById('restartBtn');

// ============== storage keys ==============
const KEY_UUID = 'mc_uuid';
const KEY_NAME = 'mc_name';
const KEY_HIGHSCORE = 'mc_highscore';

// ============== state ==============
let uuid = localStorage.getItem(KEY_UUID);
if(!uuid){ uuid = crypto.randomUUID(); localStorage.setItem(KEY_UUID, uuid); }

let playerName = localStorage.getItem(KEY_NAME) || '';
if(playerName) nameBadge.textContent = playerName;

let myHighScore = parseInt(localStorage.getItem(KEY_HIGHSCORE)) || 0;

// canvas logical size (keeps resolution good on retina)
function fitCanvas(){
  const ratio = window.devicePixelRatio || 1;
  const displayW = Math.min(460, Math.max(320, window.innerWidth * 0.92));
  const displayH = Math.min(820, Math.max(600, window.innerHeight * 0.72));
  canvas.style.width = displayW + 'px';
  canvas.style.height = displayH + 'px';
  canvas.width = Math.floor(displayW * ratio);
  canvas.height = Math.floor(displayH * ratio);
  ctx.setTransform(ratio,0,0,ratio,0,0);
}
fitCanvas();
window.addEventListener('resize', fitCanvas);

// Cola bounding box (relative to canvas)
function getColaBox(){
  const w = COLA_WIDTH;
  const h = COLA_HEIGHT;
  const x = (canvas.width/ (window.devicePixelRatio||1) - w) / 2;
  const y = (canvas.height/ (window.devicePixelRatio||1)) - h - 18;
  return { x, y, w, h };
}

// game objects
let mentoses = []; // {x,y,vy,hit}
let particles = []; // {x,y,vx,vy,life,alpha}
let score = 0;
let timeLeft = GAME_TIME;
let playing = false;
let rafId = null;

// ============== Title flow ==============
titleTap.addEventListener('click', async () => {
  // On title tap: if name not set => open modal, else start
  if(!playerName){
    nameModal.classList.remove('hidden');
    // focus
    nameInput.focus();
  } else {
    startGame();
  }
});

// name modal actions
saveNameBtn.onclick = () => {
  const v = nameInput.value.trim();
  playerName = v ? v : '名無し';
  localStorage.setItem(KEY_NAME, playerName);
  nameBadge.textContent = playerName;
  nameModal.classList.add('hidden');
  titleScreen.classList.add('hidden');
  startGame();
};
skipNameBtn.onclick = () => {
  playerName = '名無し';
  localStorage.setItem(KEY_NAME, playerName);
  nameBadge.textContent = playerName;
  nameModal.classList.add('hidden');
  titleScreen.classList.add('hidden');
  startGame();
};

// allow tapping Enter to save
nameInput.addEventListener('keydown', (e)=>{ if(e.key==='Enter') saveNameBtn.click(); });

// ============== Game logic ==============
function spawnMentosAt(clientX){
  const rect = canvas.getBoundingClientRect();
  const x = Math.max(MENTOS_RADIUS, Math.min(rect.width - MENTOS_RADIUS, clientX - rect.left));
  // push with y= -10 so it drops from slightly above
  mentoses.push({ x, y: -10, vy: 0, hit:false });
}

canvas.addEventListener('pointerdown', (e) => {
  if(!playing) return;
  spawnMentosAt(e.clientX);
});

function spawnParticles(x, y, intensity = 1){
  const n = Math.min(80, Math.floor(PARTICLES_PER_HIT * intensity));
  for(let i=0;i<n;i++){
    particles.push({
      x: x + (Math.random()-0.5)*12,
      y: y + (Math.random()-0.5)*8,
      vx: (Math.random()-0.5)*3,
      vy: -Math.random()*3 - 1.2,
      life: PARTICLE_LIFE + Math.floor(Math.random()*30),
      alpha: 1
    });
  }
}

function updatePhysics(){
  const cola = getColaBox();
  // mentos
  for(let m of mentoses){
    if(m.hit) continue;
    m.vy += GRAVITY;
    m.y += m.vy;
    // collision with cola mouth: we treat mouth as top opening region: x in [cola.x+20, cola.x+cola.w-20], y >= cola.y + 6
    const mouthLeft = cola.x + 16;
    const mouthRight = cola.x + cola.w - 16;
    const mouthY = cola.y + 14;
    if(m.y >= mouthY && m.x >= mouthLeft && m.x <= mouthRight){
      m.hit = true;
      score++;
      scoreEl.textContent = score;
      // intensity proportional to score per hit? keep modest
      spawnParticles(m.x, cola.y + 8, 1.0);
    } else if(m.y > canvas.height / (window.devicePixelRatio||1) + 50){
      m.hit = true; // fell off screen
    }
  }
  // particles
  for(let p of particles){
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.06; // small gravity
    p.life--;
    p.alpha = p.life / (PARTICLE_LIFE + 30);
  }
  // cleanup
  mentoses = mentoses.filter(m=>!m.hit);
  particles = particles.filter(p=>p.life>0);
}

// drawing
function draw(){
  // clear
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // background sky / table gradient
  const w = canvas.width/(window.devicePixelRatio||1);
  const h = canvas.height/(window.devicePixelRatio||1);
  // sky
  const g = ctx.createLinearGradient(0,0,0,h);
  g.addColorStop(0, '#bfe9ff');
  g.addColorStop(1, '#ecfafe');
  ctx.fillStyle = g;
  ctx.fillRect(0,0,w,h);

  // ground / table shadow
  ctx.fillStyle = '#e8f5ff';
  ctx.fillRect(0,h - 110, w, 110);

  // cola (simple stylized bottle)
  const colaBox = getColaBox();
  // bottle body
  const radius = 14;
  ctx.fillStyle = '#6b2b0f';
  roundRect(ctx, colaBox.x, colaBox.y, colaBox.w, colaBox.h, 12, true, false);
  // bottle mouth highlight
  ctx.fillStyle = '#4e1e0c';
  roundRect(ctx, colaBox.x + 6, colaBox.y + 8, colaBox.w - 12, colaBox.h - 18, 10, true, false);
  // mouth opening (lighter)
  ctx.fillStyle = '#e9f8ff';
  ctx.fillRect(colaBox.x + 30, colaBox.y + 4, colaBox.w - 60, 8);

  // draw mentos
  for(let m of mentoses){
    ctx.beginPath();
    ctx.fillStyle = '#ffffff';
    ctx.arc(m.x, m.y, MENTOS_RADIUS, 0, Math.PI*2);
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(0,0,0,0.07)';
    ctx.stroke();
  }

  // draw particles (bubbles)
  for(let p of particles){
    ctx.beginPath();
    ctx.fillStyle = `rgba(255,255,255,${Math.max(0, p.alpha)})`;
    ctx.arc(p.x, p.y, 3 + Math.random()*2, 0, Math.PI*2);
    ctx.fill();
  }
}

// helper: rounded rect
function roundRect(ctx, x, y, w, h, r, fill, stroke){
  if (typeof r === 'undefined') r = 5;
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.arcTo(x+w, y, x+w, y+h, r);
  ctx.arcTo(x+w, y+h, x, y+h, r);
  ctx.arcTo(x, y+h, x, y, r);
  ctx.arcTo(x, y, x+w, y, r);
  ctx.closePath();
  if(fill) ctx.fill();
  if(stroke){ ctx.stroke(); }
}

// main loop
function loop(){
  updatePhysics();
  draw();
  rafId = requestAnimationFrame(loop);
}

// ============== Game start / end ==============
function startGame(){
  // reset
  mentoses = [];
  particles = [];
  score = 0;
  scoreEl.textContent = score;
  timeLeft = GAME_TIME;
  timerEl.textContent = Math.ceil(timeLeft);
  playing = true;
  // hide result panel
  resultPanel.classList.add('hidden');
  // show game screen
  gameScreen.classList.remove('hidden');
  // start timer
  const startTs = performance.now();
  // tick timer
  const timerInterval = setInterval(()=>{
    const elapsed = (performance.now() - startTs) / 1000;
    timeLeft = Math.max(0, GAME_TIME - elapsed);
    timerEl.textContent = Math.ceil(timeLeft);
    if(timeLeft <= 0){
      clearInterval(timerInterval);
      endGame(); // triggers end state but leave animations alive
    }
  }, 120);
  // kick loop
  if(!rafId) loop();
}

function endGame(){
  playing = false;
  // show result panel with fade-in bubble overlay (we'll create particles from bottom)
  // spawn a stronger bubble-emission effect from cola mouth based on score
  // let remaining mentoses fall naturally (we keep RAF on)
  // schedule bottom overlay fade-in + more particles
  spawnEndBubbles();
  // update local high score
  if(score > myHighScore){
    myHighScore = score;
    localStorage.setItem(KEY_HIGHSCORE, myHighScore);
  }
  // show result panel after short delay to allow dramatic bubbles
  setTimeout(()=> {
    showResultPanel();
  }, 900);
}

function spawnEndBubbles(){
  // spawn a burst tied to score
  const cola = getColaBox();
  const intensity = Math.min(4, Math.max(1, score / 3));
  // central big burst
  for(let i=0;i< Math.min(180, Math.floor(40 * intensity)); i++){
    particles.push({
      x: cola.x + cola.w/2 + (Math.random()-0.5)*40,
      y: cola.y + 12 + Math.random()*8,
      vx: (Math.random()-0.5)*4,
      vy: -Math.random()*6 - 1.5,
      life: 40 + Math.floor(Math.random()*50),
      alpha: 1
    });
  }
  // gentle bottom rising soft bubbles (visual only)
  startBottomBubbleOverlay(intensity);
}

// bottom bubble overlay: fade in a translucent overlay with rising translucent circles
let bottomOverlayInterval = null;
function startBottomBubbleOverlay(intensity){
  // create a temporary overlay canvas (positioned fixed)
  if(document.querySelector('.bubbleOverlay')) return;
  const overlay = document.createElement('canvas');
  overlay.className = 'bubbleOverlay';
  overlay.width = canvas.width;
  overlay.height = canvas.height / (window.devicePixelRatio||1) * 0.45;
  overlay.style.height = (canvas.height / (window.devicePixelRatio||1) * 0.45) + 'px';
  overlay.style.left = canvas.getBoundingClientRect().left + 'px';
  overlay.style.bottom = (window.innerHeight - canvas.getBoundingClientRect().bottom) + 'px';
  overlay.style.width = canvas.getBoundingClientRect().width + 'px';
  overlay.style.transition = 'opacity 700ms ease';
  overlay.style.opacity = '0';
  overlay.style.pointerEvents = 'none';
  document.body.appendChild(overlay);
  // position update on resize
  function updatePos(){
    const rect = canvas.getBoundingClientRect();
    overlay.style.left = rect.left + 'px';
    overlay.style.width = rect.width + 'px';
    overlay.style.bottom = (window.innerHeight - rect.bottom) + 'px';
  }
  window.addEventListener('resize', updatePos);
  // draw loop for overlay
  const octx = overlay.getContext('2d');
  const bubbles = [];
  function overlayTick(){
    octx.clearRect(0,0,overlay.width, overlay.height);
    // occasionally spawn
    if(Math.random() < 0.25 * intensity) {
      const x = Math.random()*overlay.width;
      const r = 6 + Math.random()*14 * intensity;
      bubbles.push({x, y: overlay.height + r, r, vy: - (0.4 + Math.random()*1.2*intensity), alpha: 0.8});
    }
    for(let b of bubbles){
      b.y += b.vy;
      b.alpha -= 0.003;
      octx.beginPath();
      octx.fillStyle = `rgba(255,255,255,${Math.max(0, b.alpha*0.18)})`;
      octx.arc(b.x, b.y, Math.max(2,b.r * Math.max(0, b.alpha)), 0, Math.PI*2);
      octx.fill();
    }
    // remove
    for(let i=bubbles.length-1;i>=0;i--) if(bubbles[i].alpha <= 0) bubbles.splice(i,1);
  }
  // fade-in
  requestAnimationFrame(()=> { overlay.style.opacity = '1'; });
  bottomOverlayInterval = setInterval(overlayTick, 40);
  // stop after some seconds
  setTimeout(()=> {
    overlay.style.opacity = '0';
    setTimeout(()=> {
      clearInterval(bottomOverlayInterval);
      bottomOverlayInterval = null;
      overlay.remove();
      window.removeEventListener('resize', updatePos);
    }, 700);
  }, 4500);
}

// show result panel (ranking fetch on demand)
function showResultPanel(){
  finalScoreEl.textContent = `スコア: ${score}（あなたの最高: ${myHighScore}）`;
  resultPanel.classList.remove('hidden');
  // reveal share button only after fetching ranking
  shareBtn.style.display = 'none';
}

// restart
restartBtn.onclick = () => {
  // reset screens
  resultPanel.classList.add('hidden');
  gameScreen.classList.add('hidden');
  titleScreen.classList.remove('hidden');
  // stop animation loop
  if(rafId){ cancelAnimationFrame(rafId); rafId = null; }
  // re-fit canvas 
  fitCanvas();
}

// ============== Ranking & Sharing ==============
// user.json should be placed at repo root (GitHub Pages) and publicly readable
// Example: https://<user>.github.io/<repo>/user.json
// user.json format: [ { "uuid":"...", "name":"...", "score":12, "timestamp":"..." }, ... ]
const USER_JSON_URL = 'user.json'; // relative path to user.json in same GitHub Pages site

fetchRankBtn.onclick = async () => {
  fetchRankBtn.disabled = true;
  fetchRankBtn.textContent = 'ランキング取得中...';
  try {
    const res = await fetch(USER_JSON_URL + '?_=' + Date.now());
    if(!res.ok) throw new Error('fetch failed');
    const users = await res.json();
    // convert to map of highest per uuid, but user.json assumed already highest only
    users.sort((a,b)=> b.score - a.score);
    // render top 30
    rankingListEl.innerHTML = '';
    let myRank = -1;
    for(let i=0;i<Math.min(50, users.length); i++){
      const u = users[i];
      const li = document.createElement('li');
      li.textContent = `${i+1}. ${u.name} — ${u.score}`;
      if(u.uuid === uuid){
        li.style.fontWeight = '800';
        li.style.color = '#ffd47a';
        myRank = i+1;
      }
      rankingListEl.appendChild(li);
    }
    // if not found in top list, scan for my rank
    if(myRank === -1){
      const idx = users.findIndex(u=>u.uuid === uuid);
      if(idx >= 0){
        const li = document.createElement('li');
        li.textContent = `${idx+1}. ${users[idx].name} — ${users[idx].score}`;
        li.style.fontWeight = '800';
        li.style.color = '#ffd47a';
        rankingListEl.appendChild(li);
        myRank = idx+1;
      }
    }
    // prepare X intent content
    const text = `${playerName} のメントスコーラ: ${score}点${myRank?(' — ランク' + myRank):''} #メントスコーラ`;
    const shareUrl = new URL(location.href);
    shareUrl.searchParams.set('score', score);
    shareUrl.searchParams.set('name', playerName);
    const intent = `https://twitter.com/intent/tweet?${new URLSearchParams({text, url: shareUrl.toString()}).toString()}`;
    shareBtn.onclick = ()=> window.open(intent, '_blank');
    shareBtn.style.display = 'inline-block';

    // optionally update local copy of highest
    if(score > myHighScore){
      myHighScore = score;
      localStorage.setItem(KEY_HIGHSCORE, myHighScore);
    }
  } catch(err){
    console.error(err);
    alert('ランキングを取得できませんでした');
  } finally {
    fetchRankBtn.disabled = false;
    fetchRankBtn.textContent = 'ランキングを取得して投稿用準備';
  }
};

// ============== Init: show title or start if name exists ==========
(function init(){
  if(playerName){
    // show title but hide name input; keep user able to tap to start
    document.getElementById('nameInput').style.display = 'none';
  } else {
    // still show title; modal will open on tap
    document.getElementById('nameInput').style.display = 'none';
  }
})();
