const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreBoard = document.getElementById('scoreBoard');
const postBtn = document.getElementById('postBtn');

// UUID生成
let uuid = localStorage.getItem('uuid');
if(!uuid){
  uuid = crypto.randomUUID();
  localStorage.setItem('uuid', uuid);
}

// 名前登録
let playerName = localStorage.getItem('playerName') || '';
const nameInput = document.getElementById('playerName');
const saveBtn = document.getElementById('saveName');

saveBtn.onclick = () => {
  playerName = nameInput.value || "名無し";
  localStorage.setItem('playerName', playerName);
  document.getElementById('nameInput').style.display = 'none';
  startGame();
};

// ゲーム変数
let score = 0;
let gameTime = 10; // 秒
let elapsed = 0;
let gameInterval = null;

const gravity = 0.5;
const mentoses = [];
const particles = [];

const cola = {
  x: canvas.width/2 - 25,
  y: canvas.height - 100,
  width: 50,
  height: 80
};

// メントスクラス
class Mentos {
  constructor(x){
    this.x = x;
    this.y = 0;
    this.vy = 0;
    this.hit = false;
  }
  update(){
    this.vy += gravity;
    this.y += this.vy;

    // 飲み口判定
    if(this.y >= cola.y && this.x > cola.x && this.x < cola.x + cola.width){
      this.hit = true;
      score++;
      scoreBoard.textContent = `スコア: ${score}`;
      spawnParticles(this.x, cola.y);
    }

    // 画面外チェック
    if(this.y > canvas.height) this.hit = true;
  }
  draw(){
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(this.x, this.y, 8, 0, Math.PI*2);
    ctx.fill();
  }
}

// パーティクル生成
function spawnParticles(x, y){
  for(let i=0;i<10;i++){
    particles.push({
      x: x,
      y: y,
      vx: (Math.random()-0.5)*2,
      vy: -Math.random()*3,
      life: 30
    });
  }
}

// パーティクル更新
function updateParticles(){
  particles.forEach(p=>{
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.1;
    p.life--;
  });
  for(let i=particles.length-1;i>=0;i--){
    if(particles[i].life<=0) particles.splice(i,1);
  }
}

// Canvas描画
function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // 背景
  ctx.fillStyle="#87ceeb";
  ctx.fillRect(0,0,canvas.width,canvas.height);

  // コーラ
  ctx.fillStyle="brown";
  ctx.fillRect(cola.x, cola.y, cola.width, cola.height);

  // メントス
  mentoses.forEach(m=>m.draw());

  // パーティクル
  ctx.fillStyle="white";
  particles.forEach(p=>{
    ctx.beginPath();
    ctx.arc(p.x,p.y,3,0,Math.PI*2);
    ctx.fill();
  });
}

// タップでメントス生成
canvas.addEventListener('click', e=>{
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  mentoses.push(new Mentos(x));
});

// ゲーム開始
function startGame(){
  elapsed = 0;
  score = 0;
  scoreBoard.textContent = `スコア: ${score}`;
  gameInterval = setInterval(()=>{
    elapsed += 0.016; // 約60fps
    mentoses.forEach(m=>m.update());
    updateParticles();
    for(let i=mentoses.length-1;i>=0;i--){
      if(mentoses[i].hit) mentoses.splice(i,1);
    }
    draw();
    if(elapsed >= gameTime){
      clearInterval(gameInterval);
      // 終了後演出はメントス落下アニメーションだけ残る
      postBtn.style.display = 'block';
    }
  },16);
}

// X投稿ボタン
postBtn.onclick = ()=>{
  alert("ここでX投稿用のURL生成＆ランキング取得");
};

// 初回アクセスで名前登録がなければ止める
if(playerName) startGame();
