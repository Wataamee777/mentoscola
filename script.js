// --- UUID生成（v4） ---
function generateUUID() {
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
}

// --- ユーザー情報初期化 ---
let user = JSON.parse(localStorage.getItem('mentoscola_user')) || {};
if (!user.uuid) {
  user.uuid = generateUUID();
  user.name = prompt("あなたの名前を入力してください") || "名無し";
  localStorage.setItem('mentoscola_user', JSON.stringify(user));
}

// --- DOM取得 ---
const startBtn = document.getElementById('startBtn');
const gameArea = document.getElementById('gameArea');
const scoreDisplay = document.getElementById('score');
const rankingDisplay = document.getElementById('ranking');

let score = 0;
let gameTimer = null;

// --- ゲームスタート ---
startBtn.addEventListener('click', () => {
  score = 0;
  scoreDisplay.textContent = "0";
  gameArea.innerHTML = ""; // ゲームエリア初期化
  startBtn.style.display = "none";

  // 10秒間ゲーム
  gameTimer = setTimeout(endGame, 10000);
  gameArea.addEventListener('click', dropMentos);
});

// --- メントス落下 ---
function dropMentos(e) {
  // クリック位置にメントスを表示
  const mentos = document.createElement('div');
  mentos.className = 'mentos';
  mentos.style.left = e.offsetX + 'px';
  mentos.style.top = e.offsetY + 'px';
  gameArea.appendChild(mentos);

  // 飲み口判定（簡易）
  const drinkX = gameArea.clientWidth/2;
  const drinkY = gameArea.clientHeight - 50;
  const dx = e.offsetX - drinkX;
  const dy = e.offsetY - drinkY;
  const dist = Math.sqrt(dx*dx + dy*dy);
  if(dist < 30){ score++; scoreDisplay.textContent = score; }

  // 1秒後にメントス消す
  setTimeout(()=>mentos.remove(),1000);
}

// --- ゲーム終了 ---
function endGame() {
  clearTimeout(gameTimer);
  gameArea.removeEventListener('click', dropMentos);
  startBtn.style.display = "block";

  // 泡演出（簡易）
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  gameArea.appendChild(bubble);
  setTimeout(()=>bubble.remove(),2000);

  // 結果送信
  postScore(score);
}

// --- GASに送信 ---
async function postScore(score){
  try {
    const payload = { uuid: user.uuid, name: user.name, score };
    const res = await fetch("https://script.google.com/macros/s/AKfycbxa7-DoxJGgoXPV8A1QQLeTPgyT6EnRyxS5515_wuOyYOXLQtAi9m4TRl_oHmysiMyW/exec", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" }
    });
    const data = await res.json();
    console.log("送信結果:", data);

    // ランキング取得
    fetchRanking();
  } catch(e){
    console.error(e);
  }
}

// --- ランキング取得 ---
async function fetchRanking(){
  try {
    const res = await fetch('https://Wataamee777.github.io/mentoscola/ranking.json');
    const ranking = await res.json();
    rankingDisplay.innerHTML = '<h3>世界ランキング（Top 10）</h3>';
    ranking.forEach(r=> {
      const div = document.createElement('div');
      div.textContent = `${r.rank}. ${r.name} - ${r.score}`;
      rankingDisplay.appendChild(div);
    });
  } catch(e){
    console.error("ランキング取得エラー:", e);
  }
}

// --- 初回ランキング表示 ---
fetchRanking();
