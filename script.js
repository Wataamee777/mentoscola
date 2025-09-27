// --- UUID生成 ---
function generateUUID() {
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
}

// --- ユーザー初期化 ---
let user = JSON.parse(localStorage.getItem('mentoscola_user')) || {};
if (!user.uuid) {
  user.uuid = generateUUID();
  user.name = prompt("あなたの名前を入力してください") || "名無し";
  localStorage.setItem('mentoscola_user', JSON.stringify(user));
}

// --- DOM ---
const startBtn = document.getElementById('startBtn');
const titleScreen = document.getElementById('titleScreen');
const gameScreen = document.getElementById('gameScreen');
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score');
const rankingDisplay = document.getElementById('rankingDisplay');

let score = 0;
let gameTimer = null;
let mentosArr = [];
let bubbleArr = [];
let gameRunning = false;

// --- 画像読み込み ---
const mentosImg = new Image();
mentosImg.src = 'mentos.png';
const bubbleImg = new Image();
bubbleImg.src = 'cola_bubble.png';
const backgroundImg = new Image();
backgroundImg.src = 'background.png';

// --- ゲーム開始 ---
startBtn.addEventListener('click', () => {
  titleScreen.style.display = 'none';
  gameScreen.style.display = 'block';
  score = 0;
  scoreDisplay.textContent = score;
  mentosArr = [];
  bubbleArr = [];
  gameRunning = true;

  canvas.addEventListener('click', tapCanvas);

  // 10秒タイマー
  gameTimer = setTimeout(endGame, 10000);

  requestAnimationFrame(gameLoop);
});

// --- タップでメントス落下 ---
function tapCanvas(e) {
  if (!gameRunning) return;
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  mentosArr.push({ x, y, vy: 0, vx: (Math.random()-0.5)*2, hit:false });
}

// --- ゲームループ ---
function gameLoop() {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.drawImage(backgroundImg,0,0,canvas.width,canvas.height);

  // --- メントス物理 ---
  mentosArr.forEach(m=>{
    m.vy += 0.5; // 重力
    m.y += m.vy;
    m.x += m.vx;

    ctx.drawImage(mentosImg,m.x-10,m.y-10,20,20);

    // 飲み口判定
    const drinkX = canvas.width/2;
    const drinkY = canvas.height - 50;
    const dx = m.x - drinkX;
    const dy = m.y - drinkY;
    if (!m.hit && Math.sqrt(dx*dx+dy*dy)<30) {
      score++;
      scoreDisplay.textContent = score;
      bubbleArr.push({x:drinkX,y:drinkY,vy:-2,vx:(Math.random()-0.5)*2,alpha:1,size:10+Math.random()*10});
      m.hit=true;
    }
  });
  mentosArr = mentosArr.filter(m=>!m.hit && m.y<canvas.height+20);

  // --- 泡描画 ---
  bubbleArr.forEach(b=>{
    b.y += b.vy;
    b.x += b.vx;
    b.vy += 0.1; // 重力
    b.alpha -= 0.02;
    ctx.globalAlpha = b.alpha;
    ctx.drawImage(bubbleImg,b.x-b.size/2,b.y-b.size/2,b.size,b.size);
    ctx.globalAlpha = 1;
  });
  bubbleArr = bubbleArr.filter(b=>b.alpha>0);

  if(gameRunning) requestAnimationFrame(gameLoop);
}

// --- ゲーム終了 ---
function endGame() {
  gameRunning = false;
  clearTimeout(gameTimer);
  canvas.removeEventListener('click', tapCanvas);
  alert(`ゲーム終了！スコア: ${score}`);

  postScore(score);
}

// --- GASにスコア送信 ---
async function postScore(score) {
  try {
    const payload = { uuid:user.uuid, name:user.name, score };
    const res = await fetch("https://script.google.com/macros/s/AKfycbxa7-DoxJGgoXPV8A1QQLeTPgyT6EnRyxS5515_wuOyYOXLQtAi9m4TRl_oHmysiMyW/exec", {
      method:"POST",
      body: JSON.stringify(payload),
      headers: {"Content-Type":"application/json"}
    });
    const data = await res.json();
    console.log("送信結果:", data);
    fetchRanking();
  } catch(e){ console.error(e); }
}

// --- 世界ランキング取得 ---
async function fetchRanking() {
  try {
    const res = await fetch('https://Wataamee777.github.io/mentoscola/ranking.json');
    const ranking = await res.json();
    rankingDisplay.innerHTML = '<h3>世界ランキング（Top 10）</h3>';
    ranking.forEach(r=>{
      const div = document.createElement('div');
      div.textContent = `${r.rank}. ${r.name} - ${r.score}`;
      rankingDisplay.appendChild(div);
    });
  } catch(e){ console.error(e); }
}

// --- 初回ランキング表示 ---
fetchRanking();
