document.addEventListener("DOMContentLoaded", () => {
  // -------------------------
  // 要素取得
  // -------------------------
  const titleTap = document.getElementById("titleTap");
  const nameModal = document.getElementById("nameModal");
  const saveName = document.getElementById("saveName");
  const skipName = document.getElementById("skipName");
  const gameScreen = document.getElementById("gameScreen");
  const nameBadge = document.getElementById("nameBadge");
  const timerDisplay = document.getElementById("timer");
  const scoreDisplay = document.getElementById("score");
  const gameCanvas = document.getElementById("gameCanvas");
  const restartBtn = document.getElementById("restartBtn");
  const resultPanel = document.getElementById("resultPanel");
  const finalScore = document.getElementById("finalScore");
  const fetchRankBtn = document.getElementById("fetchRankBtn");
  const shareBtn = document.getElementById("shareBtn");
  const rankingList = document.getElementById("rankingList");

  const ctx = gameCanvas.getContext("2d");
  const canvasWidth = gameCanvas.width;
  const canvasHeight = gameCanvas.height;

  // -------------------------
  // ユーザー管理
  // -------------------------
  let user = JSON.parse(localStorage.getItem("mentoscola_user")) || {};
  if (!user.uuid) {
    user.uuid = crypto.randomUUID();
    localStorage.setItem("mentoscola_user", JSON.stringify(user));
  }

  // -------------------------
  // 画像読み込み
  // -------------------------
  const mentosImg = new Image();
  mentosImg.src = "assets/mentos.png";

  const bubbleImg = new Image();
  bubbleImg.src = "assets/cola_bubble.png";

  const bgImg = new Image();
  bgImg.src = "assets/bg.jpg";

  // -------------------------
  // ゲーム変数
  // -------------------------
  let score = 0;
  let timer = 10;
  let mentosArr = [];
  let bubbleArr = [];
  let gameRunning = false;
  let intervalId = null;

  // -------------------------
  // タイトル画面 → 名前入力
  // -------------------------
  titleTap.addEventListener("click", () => {
    if (!user.name) {
      nameModal.classList.remove("hidden");
    } else {
      startGame();
    }
  });

  saveName.addEventListener("click", () => {
    const name = document.getElementById("playerName").value.trim() || "名無し";
    user.name = name;
    localStorage.setItem("mentoscola_user", JSON.stringify(user));
    nameBadge.textContent = user.name;
    nameModal.classList.add("hidden");
    startGame();
  });

  skipName.addEventListener("click", () => {
    user.name = user.name || "名無し";
    nameBadge.textContent = user.name;
    nameModal.classList.add("hidden");
    startGame();
  });

  // -------------------------
  // ゲーム開始
  // -------------------------
  function startGame() {
    score = 0;
    timer = 10;
    mentosArr = [];
    bubbleArr = [];
    gameRunning = true;
    timerDisplay.textContent = timer;
    scoreDisplay.textContent = score;

    gameScreen.classList.remove("hidden");
    resultPanel.classList.add("hidden");

    gameCanvas.addEventListener("click", dropMentos);
    intervalId = setInterval(() => {
      timer -= 1;
      timerDisplay.textContent = timer;
      if (timer <= 0) endGame();
    }, 1000);

    requestAnimationFrame(gameLoop);
  }

  // -------------------------
  // ゲーム終了
  // -------------------------
  function endGame() {
    gameRunning = false;
    clearInterval(intervalId);
    gameCanvas.removeEventListener("click", dropMentos);
    finalScore.textContent = `スコア: ${score}`;
    gameScreen.classList.add("hidden");
    resultPanel.classList.remove("hidden");
    postScore(score);
  }

  restartBtn.addEventListener("click", () => {
    resultPanel.classList.add("hidden");
    document.getElementById("titleScreen").classList.remove("hidden");
  });

  // -------------------------
  // クリックでメントス落下
  // -------------------------
  function dropMentos(e) {
    const rect = gameCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    mentosArr.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 2,
      vy: 0,
      hit: false
    });
  }

  // -------------------------
  // ゲームループ
  // -------------------------
  function gameLoop() {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.drawImage(bgImg, 0, 0, canvasWidth, canvasHeight);

    // メントス落下
    mentosArr.forEach(m => {
      m.vy += 0.5;
      m.y += m.vy;
      m.x += m.vx;
      ctx.drawImage(mentosImg, m.x - 10, m.y - 10, 20, 20);

      // 飲み口判定
      const drinkX = canvasWidth / 2;
      const drinkY = canvasHeight - 50;
      const dx = m.x - drinkX;
      const dy = m.y - drinkY;
      if (!m.hit && Math.sqrt(dx * dx + dy * dy) < 30) {
        score++;
        scoreDisplay.textContent = score;
        bubbleArr.push({
          x: drinkX,
          y: drinkY,
          vx: (Math.random() - 0.5) * 2,
          vy: -2,
          alpha: 1,
          size: 10 + Math.random() * 10
        });
        m.hit = true;
      }
    });

    mentosArr = mentosArr.filter(m => !m.hit && m.y < canvasHeight + 20);

    // 泡描画
    bubbleArr.forEach(b => {
      b.x += b.vx;
      b.y += b.vy;
      b.vy += 0.1; // 重力
      b.alpha -= 0.02;
      ctx.globalAlpha = b.alpha;
      ctx.drawImage(bubbleImg, b.x - b.size / 2, b.y - b.size / 2, b.size, b.size);
      ctx.globalAlpha = 1;
    });
    bubbleArr = bubbleArr.filter(b => b.alpha > 0);

    if (gameRunning) requestAnimationFrame(gameLoop);
  }

  // -------------------------
  // GASにスコア送信
  // -------------------------
  async function postScore(score) {
    const payload = { uuid: user.uuid, name: user.name, score };
    try {
      const res = await fetch(
        "https://script.google.com/macros/s/AKfycbxa7-DoxJGgoXPV8A1QQLeTPgyT6EnRyxS5515_wuOyYOXLQtAi9m4TRl_oHmysiMyW/exec",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        }
      );
      const data = await res.json();
      console.log("送信結果:", data);
    } catch (e) {
      console.error("送信エラー:", e);
    }
  }

  // -------------------------
  // 世界ランキング取得
  // -------------------------
  fetchRankBtn.addEventListener("click", async () => {
    try {
      const res = await fetch("https://Wataamee777.github.io/mentoscola/ranking.json");
      const ranking = await res.json();
      rankingList.innerHTML = "";
      ranking.forEach(r => {
        const li = document.createElement("li");
        li.textContent = `${r.rank}. ${r.name} - ${r.score}`;
        rankingList.appendChild(li);
      });
      shareBtn.style.display = "inline-block";
    } catch (e) {
      console.error("ランキング取得エラー:", e);
    }
  });

  shareBtn.addEventListener("click", () => {
    const payload = {
      name: user.name,
      score
    };
    const encoded = btoa(JSON.stringify(payload));
    const url = `https://twitter.com/intent/tweet?text=メントスコーラで${score}点！&url=${encodeURIComponent(location.href + "?share=" + encoded)}`;
    window.open(url, "_blank");
  });

  // -------------------------
  // 初期表示
  // -------------------------
  const savedName = localStorage.getItem("mentoscola_name");
  if (savedName) {
    user.name = savedName;
    nameBadge.textContent = savedName;
  }
});
