// --- НАСТРОЙКИ И ПЕРЕМЕННЫЕ ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const WIDTH = 700, HEIGHT = 700; 

let gameState = 'menu'; 
let prevState = 'menu';
let isMultiplayer = false;
let isSecretLevel = false;
let godMode = false;
let score = 0, highScore = 0, lives = 3, level = 1;

// Локализация
let currentLang = 'ru';
const TEXTS = {
    ru: {
        title: "ВЕРИТИ", sub: "ПРЫГАЕТ НА КРОВАТИ", goal: "ЦЕЛЬ: УБРАТЬ НАГИЕВА",
        record: "Рекорд: ", diff: "Сложность:", play: "ИГРАТЬ", mp: "МУЛЬТИПЛЕЕР",
        shop: "МАГАЗИН", settings: "НАСТРОЙКИ", help: "КАК ИГРАТЬ", back: "НАЗАД",
        music: "Музыка: ВКЛ", muted: "Музыка: ВЫКЛ", next: "След. трек",
        fs: "ПОЛНОЭКРАННЫЙ", points: "Очки: ", restart: "R - ИГРАТЬ СНОВА", menu: "M - В МЕНЮ",
        lose: "НАГИЕВ ПОБЕДИЛ...", win: "ПОЛНАЯ ПОБЕДА!", winSub: "НАГИЕВ УБРАН!",
        total: "Убрано Нагиевых: ", newRec: "НОВЫЙ РЕКОРД!",
        helpTxt: "Управление: ← и →<br>МУЛЬТИПЛЕЕР: P1 (W/S), P2 (Стрелки)<br>Секретный куб: ловите кроватью!<br>TAB - Админка<br>B - Магазин<br>F11 - Полный экран",
        admin: "АДМИН ПАНЕЛЬ", godOn: "Бессмертие: ВКЛ", godOff: "Бессмертие: ВЫКЛ",
        // ДОБАВЛЕНО ДЛЯ ПЕРЕВОДА СЛОЖНОСТЕЙ И МАГАЗИНА
        slowDiff: "Медленно", mediumDiff: "Средне", fastDiff: "Быстро",
        shopLife: "Доп. жизнь", shopWidth: "Широкая кровать", shopSlow: "Сброс скорости"
    },
    en: {
        title: "VERITY", sub: "JUMPS ON THE BED", goal: "GOAL: REMOVE NAGIEV",
        record: "Record: ", diff: "Difficulty:", play: "PLAY", mp: "MULTIPLAYER",
        shop: "SHOP", settings: "SETTINGS", help: "HOW TO PLAY", back: "BACK",
        music: "Music: ON", muted: "Music: OFF", next: "Next track",
        fs: "FULLSCREEN", points: "Points: ", restart: "R - PLAY AGAIN", menu: "M - MENU",
        lose: "NAGIEV WON...", win: "TOTAL VICTORY!", winSub: "NAGIEV IS GONE!",
        total: "Nagievs removed: ", newRec: "NEW RECORD!",
        helpTxt: "Controls: ← and →<br>MULTIPLAYER: P1 (W/S), P2 (Arrows)<br>Secret cube: catch it with the bed!<br>TAB - Admin Panel<br>B - Shop<br>F11 - Fullscreen",
        admin: "ADMIN PANEL", godOn: "God Mode: ON", godOff: "God Mode: OFF",
        // ДОБАВЛЕНО ДЛЯ ПЕРЕВОДА СЛОЖНОСТЕЙ И МАГАЗИНА
        slowDiff: "Slow", mediumDiff: "Medium", fastDiff: "Fast",
        shopLife: "Extra Life", shopWidth: "Wide Bed", shopSlow: "Reset Speed"
    }
};

// Физика и объекты
let bed, verity, enemies = [], powerups = [], particles = [];
let dx = 5, dy = -5, platformSpeed = 6;
let currentDiffSpeed = 5;
const keys = { left: false, right: false, w: false, s: false, up: false, down: false };

// Мультиплеер
let p1Y = 300, p2Y = 300, p1Score = 0, p2Score = 0, mpDx = 6, mpDy = 6, mpBall = {x: WIDTH/2, y: HEIGHT/2, size: 30};

// Ассеты
const imgs = { verity: new Image(), bed: new Image(), egg: new Image() };
imgs.verity.src = 'verity.png'; imgs.bed.src = 'bed.png'; imgs.egg.src = 'egg.png';
imgs.verity.onerror = () => imgs.verity.isBroken = true;
imgs.bed.onerror = () => imgs.bed.isBroken = true;
imgs.egg.onerror = () => imgs.egg.isBroken = true;

// --- АУДИО ---
const bgm = document.getElementById('bgm');
const playlist = ['verity_theme.mp3', 'track2.mp3', 'track3.mp3'];
let trackIdx = 0, musicPlaying = true, volume = 0.5;
bgm.volume = volume;
bgm.src = playlist[trackIdx];

function playMusic() {
    if (!musicPlaying) return;
    bgm.play().catch(() => { console.log("Ждем клика для музыки..."); });
}

function unlockAudio() {
    if (musicPlaying && bgm.paused) playMusic();
    document.removeEventListener('pointerdown', unlockAudio);
    document.removeEventListener('keydown', unlockAudio);
}
document.addEventListener('pointerdown', unlockAudio, { once: true });
document.addEventListener('keydown', unlockAudio, { once: true });

bgm.onended = () => { trackIdx = (trackIdx + 1) % playlist.length; bgm.src = playlist[trackIdx]; playMusic(); };

function stopAllSfx() {
    const sfx1 = document.getElementById('sfx-gameover');
    const sfx2 = document.getElementById('sfx-victory');
    if (sfx1) { sfx1.pause(); sfx1.currentTime = 0; }
    if (sfx2) { sfx2.pause(); sfx2.currentTime = 0; }
}

function drawText(text, x, y, size, color, center = true) {
    ctx.fillStyle = color;
    ctx.font = `bold ${size}px Verdana`;
    ctx.textAlign = center ? "center" : "left";
    ctx.textBaseline = center ? "middle" : "top";
    ctx.fillText(text, x, y);
}

function playSfx(id) {
    const audio = document.getElementById(id);
    if (audio) { audio.currentTime = 0; audio.play().catch(()=>{}); }
}

// --- ИНИЦИАЛИЗАЦИЯ ИГРЫ ---
function startGame() {
    stopAllSfx();
    toggleMenu('playing');
    score = 0; lives = 3; level = 1; platformSpeed = 6;
    isSecretLevel = false; godMode = false;
    createLevel();
    if (musicPlaying) playMusic();
}

function createLevel() {
    verity = { x: WIDTH/2 - 15, y: HEIGHT/2, w: 30, h: 30 };
    bed = { x: WIDTH/2 - 50, y: HEIGHT - 60, w: 100, h: 30 };
    enemies = []; powerups = []; particles = [];
    
    let speedBase = isSecretLevel ? 4 : (currentDiffSpeed + (level-1)*0.5);
    dx = speedBase; dy = -speedBase;

    let rows = isSecretLevel ? 6 : 5;
    let count = isSecretLevel ? 12 : 10;
    let spacing = isSecretLevel ? 45 : 55;

    for (let j = 0; j < rows; j++) {
        let y = 80 + (45 * j);
        let x = WIDTH/2 - (count * spacing)/2;
        for (let i = 0; i < count; i++) {
            enemies.push({ x: x, y: y, w: 45, h: 45 });
            x += spacing;
        }
        count--;
    }
}

function restartGame() {
    stopAllSfx(); 
    document.getElementById('gameover').classList.remove('active');
    document.getElementById('glitch-victory').classList.remove('active');
    startGame();
}

function goToMenu() {
    stopAllSfx(); 
    if (score > highScore) highScore = score;
    document.getElementById('ui-record').innerText = TEXTS[currentLang].record + highScore;
    toggleMenu('menu');
    if (musicPlaying) playMusic();
}

// --- МУЛЬТИПЛЕЕР ---
function startMultiplayer() {
    isMultiplayer = true;
    p1Score = 0; p2Score = 0; mpDx = 6; mpDy = 6;
    p1Y = HEIGHT/2 - 45; p2Y = HEIGHT/2 - 45;
    mpBall = { x: WIDTH/2 - 15, y: HEIGHT/2 - 15, size: 30 };
    toggleMenu('multiplayer');
}

function toggleMenu(state) {
    document.querySelectorAll('.overlay').forEach(el => el.classList.remove('active'));
    document.getElementById('menu').classList.remove('active');
    
    if (state === 'menu') {
        gameState = 'menu';
        document.getElementById('menu').classList.add('active');
        stopAllSfx();
    } else if (state === 'playing' || state === 'multiplayer') {
        gameState = state;
    } else {
        prevState = gameState;
        gameState = state;
        document.getElementById(state).classList.add('active');
        if (state === 'shop') updateShopUI();
    }
}

function setDiff(diff, event) {
    document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active-diff'));
    event.target.classList.add('active-diff');
    if (diff === 'slow') currentDiffSpeed = 3;
    else if (diff === 'medium') currentDiffSpeed = 5;
    else if (diff === 'fast') currentDiffSpeed = 7;
}

function toggleLang() {
    currentLang = currentLang === 'ru' ? 'en' : 'ru';
    const t = TEXTS[currentLang];
    
    document.getElementById('ui-title').innerText = t.title;
    document.getElementById('ui-subtitle').innerText = t.sub;
    document.getElementById('ui-goal').innerText = t.goal;
    document.getElementById('ui-record').innerText = t.record + highScore;
    document.getElementById('ui-diff').innerText = t.diff;
    document.getElementById('btn-play').innerText = t.play;
    document.getElementById('btn-mp').innerText = t.mp;
    document.getElementById('btn-shop').innerText = t.shop;
    document.getElementById('btn-settings').innerText = t.settings;
    document.getElementById('btn-help').innerText = t.help;
    document.getElementById('btn-lang').innerText = currentLang === 'ru' ? 'EN' : 'RU';
    document.getElementById('ui-settings').innerText = t.settings;
    document.getElementById('btn-settings-back').innerText = t.back;
    document.getElementById('ui-help').innerText = t.help;
    document.getElementById('help-text').innerHTML = t.helpTxt;
    document.getElementById('btn-help-back').innerText = t.back;
    document.getElementById('ui-shop').innerText = t.shop;
    document.getElementById('btn-shop-back').innerText = t.back;
    document.getElementById('btn-restart').innerText = t.restart;
    document.getElementById('btn-menu').innerText = t.menu;
    document.getElementById('btn-fs').innerText = t.fs;
    document.getElementById('btn-music').innerText = musicPlaying ? t.music : t.muted;

    // ПЕРЕВОДИМ КНОПКИ СЛОЖНОСТИ
    document.getElementById('btn-slow').innerText = t.slowDiff;
    document.getElementById('btn-medium').innerText = t.mediumDiff;
    document.getElementById('btn-fast').innerText = t.fastDiff;
    
    // ЕСЛИ ОТКРЫТ МАГАЗИН, ПЕРЕРИСОВЫВАЕМ ЕГО
    if (gameState === 'shop') updateShopUI();
}

function toggleMusic() {
    musicPlaying = !musicPlaying;
    if (musicPlaying) playMusic(); 
    else bgm.pause();
    document.getElementById('btn-music').innerText = musicPlaying ? TEXTS[currentLang].music : TEXTS[currentLang].muted;
}

function nextTrack() {
    trackIdx = (trackIdx + 1) % playlist.length;
    bgm.src = playlist[trackIdx];
    if (musicPlaying) playMusic();
}

function toggleFullscreen() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen();
    else document.exitFullscreen();
}

// --- МАГАЗИН ---
// Теперь используем ключи из TEXTS, а не жестко заданные названия
const shopItems = [
    { key: "shopLife", cost: 100, action: "life" },
    { key: "shopWidth", cost: 50, action: "width" },
    { key: "shopSlow", cost: 30, action: "slow" }
];

function updateShopUI() {
    document.getElementById('ui-points').innerText = TEXTS[currentLang].points + score;
    const container = document.getElementById('shop-items');
    container.innerHTML = '';
    
    // Берем перевод из TEXTS по ключу
    shopItems.forEach((item, idx) => {
        let btn = document.createElement('button');
        btn.innerText = `${TEXTS[currentLang][item.key]} - ${item.cost}`;
        btn.style.background = score >= item.cost ? '#2e7d32' : '#444';
        btn.onclick = () => buyItem(idx);
        container.appendChild(btn);
    });
}

function buyItem(idx) {
    let item = shopItems[idx];
    if (score >= item.cost) {
        if (item.action === 'life' && lives < 5) { lives++; score -= item.cost; }
        else if (item.action === 'width' && bed) { bed.w = 180; score -= item.cost; }
        else if (item.action === 'slow') {
            dx = Math.sign(dx) * Math.max(2, Math.abs(dx) - 2);
            dy = Math.sign(dy) * Math.max(2, Math.abs(dy) - 2);
            score -= item.cost;
        }
        updateShopUI();
    }
}

// --- АДМИНКА ---
function adminAddScore() { score += 1000; }
function adminAddLives() { lives += 5; }
function adminKillAll() { enemies = []; }
function adminGodMode() { 
    godMode = !godMode; 
    document.getElementById('btn-god').innerText = godMode ? TEXTS[currentLang].godOn : TEXTS[currentLang].godOff;
    document.getElementById('btn-god').style.background = godMode ? '#2e7d32' : '#444';
}

// --- ВВОД ---
document.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') keys.left = true;
    if (e.key === 'ArrowRight') keys.right = true;
    if (e.key === 'w' || e.key === 'W') keys.w = true;
    if (e.key === 's' || e.key === 'S') keys.s = true;
    if (e.key === 'ArrowUp') keys.up = true;
    if (e.key === 'ArrowDown') keys.down = true;
    
    if (e.key === 'Tab' || e.key === 'F2') {
        e.preventDefault();
        if (gameState !== 'admin') { prevState = gameState; toggleMenu('admin'); }
        else { toggleMenu(prevState); }
    }
    if (e.key === 'F11') { e.preventDefault(); toggleFullscreen(); }
    if (e.key === 'Escape' && ['shop', 'admin', 'help', 'settings'].includes(gameState)) toggleMenu('menu');
    if ((e.key === 'b' || e.key === 'B' || e.key === 'и' || e.key === 'И') && gameState === 'playing') toggleMenu('shop');
    if ((e.key === 'r' || e.key === 'R' || e.key === 'к' || e.key === 'К') && ['gameover', 'glitch-victory'].includes(gameState)) restartGame();
    if ((e.key === 'm' || e.key === 'M' || e.key === 'ь' || e.key === 'Ь') && ['gameover', 'glitch-victory'].includes(gameState)) goToMenu();
});

document.addEventListener('keyup', e => {
    if (e.key === 'ArrowLeft') keys.left = false;
    if (e.key === 'ArrowRight') keys.right = false;
    if (e.key === 'w' || e.key === 'W') keys.w = false;
    if (e.key === 's' || e.key === 'S') keys.s = false;
    if (e.key === 'ArrowUp') keys.up = false;
    if (e.key === 'ArrowDown') keys.down = false;
});

// --- ЛОГИКА ---
function update() {
    if (gameState === 'playing') {
        if (keys.left && bed.x > 0) bed.x -= platformSpeed;
        if (keys.right && bed.x + bed.w < WIDTH) bed.x += platformSpeed;
        
        verity.x += dx; verity.y += dy;

        if (verity.x <= 0) { verity.x = 0; if (dx < 0) dx *= -1; }
        if (verity.x + verity.w >= WIDTH) { verity.x = WIDTH - verity.w; if (dx > 0) dx *= -1; }
        if (verity.y <= 60) { verity.y = 60; if (dy < 0) dy *= -1; }

        if (verity.y + verity.h >= bed.y && verity.y + verity.h <= bed.y + 20 && verity.x + verity.w >= bed.x && verity.x <= bed.x + bed.w && dy > 0) {
            verity.y = bed.y - verity.h;
            dy = -Math.abs(dy);
            let offset = (verity.x + verity.w/2 - (bed.x + bed.w/2)) / (bed.w/2);
            dx = (currentDiffSpeed + level) * offset;
            if (Math.abs(dx) < 1) dx = Math.sign(dx) * 1;
        }

        if (verity.y > HEIGHT && !godMode) {
            lives--;
            if (lives <= 0) {
                gameState = 'gameover';
                document.getElementById('go-title').innerText = TEXTS[currentLang].lose;
                document.getElementById('go-title').style.color = '#ff3232';
                document.getElementById('go-score').innerText = TEXTS[currentLang].total + score;
                document.getElementById('gameover').classList.add('active');
                if (score > highScore) highScore = score;
                playSfx('sfx-gameover');
                bgm.pause();
            } else {
                verity.x = WIDTH/2 - 15; verity.y = HEIGHT/2; dx = currentDiffSpeed; dy = -currentDiffSpeed;
            }
        } else if (verity.y > HEIGHT && godMode) {
            verity.y = HEIGHT - verity.h; dy = -Math.abs(dy);
        }

        for (let i = enemies.length - 1; i >= 0; i--) {
            let e = enemies[i];
            if (verity.x < e.x + e.w && verity.x + verity.w > e.x && verity.y < e.y + e.h && verity.y + verity.h > e.y) {
                enemies.splice(i, 1); score += 10; dy *= -1;
                for(let p=0; p<5; p++) particles.push({x: e.x+22, y: e.y+22, vx: (Math.random()-0.5)*10, vy: (Math.random()-0.5)*10, life: 30});
                if (Math.random() < 0.05 && !isSecretLevel) powerups.push({ x: e.x, y: e.y, type: 'glitch', timer: 0 });
                else if (Math.random() < 0.25) powerups.push({ x: e.x, y: e.y, type: Math.random() < 0.5 ? 'expand' : 'slow', timer: 0 });
                break;
            }
        }

        for (let i = powerups.length - 1; i >= 0; i--) {
            let p = powerups[i]; p.y += 3; p.timer++;
            if (p.x < bed.x + bed.w && p.x + 20 > bed.x && p.y < bed.y + bed.h && p.y + 20 > bed.y) {
                if (p.type === 'glitch') { isSecretLevel = true; createLevel(); }
                else if (p.type === 'expand') { bed.w = 180; setTimeout(()=> { if(bed) bed.w = 100; }, 5000); }
                else if (p.type === 'slow') { dx *= 0.6; dy *= 0.6; }
                powerups.splice(i, 1);
            } else if (p.y > HEIGHT) powerups.splice(i, 1);
        }

        for (let i = particles.length - 1; i >= 0; i--) {
            let p = particles[i]; p.x += p.vx; p.y += p.vy; p.life--;
            if (p.life <= 0) particles.splice(i, 1);
        }

        if (enemies.length === 0) {
            if (isSecretLevel) {
                gameState = 'glitch-victory';
                document.getElementById('gv-score').innerText = TEXTS[currentLang].total + score;
                document.getElementById('glitch-victory').classList.add('active');
                playSfx('sfx-victory'); bgm.pause();
                if (score > highScore) highScore = score;
            } else if (level >= 3) {
                gameState = 'gameover';
                document.getElementById('go-title').innerText = TEXTS[currentLang].win;
                document.getElementById('go-title').style.color = '#00ff00';
                document.getElementById('go-score').innerText = TEXTS[currentLang].total + score;
                document.getElementById('gameover').classList.add('active');
                playSfx('sfx-victory'); bgm.pause();
                if (score > highScore) highScore = score;
            } else { level++; createLevel(); }
        }
    } else if (gameState === 'multiplayer') {
        if (keys.w && p1Y > 0) p1Y -= 8;
        if (keys.s && p1Y < HEIGHT - 90) p1Y += 8;
        if (keys.up && p2Y > 0) p2Y -= 8;
        if (keys.down && p2Y < HEIGHT - 90) p2Y += 8;

        mpBall.x += mpDx; mpBall.y += mpDy;

        if (mpBall.y <= 0) { mpBall.y = 0; mpDy *= -1; }
        if (mpBall.y + mpBall.size >= HEIGHT) { mpBall.y = HEIGHT - mpBall.size; mpDy *= -1; }

        if (mpBall.x <= 110 && mpBall.y + mpBall.size >= p1Y && mpBall.y <= p1Y + 30 && mpDx < 0) {
            mpBall.x = 110; mpDx = Math.abs(mpDx); mpDy = (mpBall.y + 15 - (p1Y + 15)) / 5;
        }
        if (mpBall.x + mpBall.size >= WIDTH - 110 && mpBall.y + mpBall.size >= p2Y && mpBall.y <= p2Y + 30 && mpDx > 0) {
            mpBall.x = WIDTH - 110 - mpBall.size; mpDx = -Math.abs(mpDx); mpDy = (mpBall.y + 15 - (p2Y + 15)) / 5;
        }

        if (mpBall.x < 0) { p2Score++; mpBall = { x: WIDTH/2 - 15, y: HEIGHT/2 - 15, size: 30 }; mpDx = 6; mpDy = Math.random() > 0.5 ? 6 : -6; }
        if (mpBall.x > WIDTH) { p1Score++; mpBall = { x: WIDTH/2 - 15, y: HEIGHT/2 - 15, size: 30 }; mpDx = -6; mpDy = Math.random() > 0.5 ? 6 : -6; }
    }
}

// --- ОТРИСОВКА ---
function draw() {
    ctx.fillStyle = isSecretLevel ? '#2a002a' : '#14141e';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    if (gameState === 'playing') {
        if (imgs.bed.isBroken) { ctx.fillStyle = '#8b4513'; ctx.fillRect(bed.x, bed.y, bed.w, bed.h); }
        else ctx.drawImage(imgs.bed, bed.x, bed.y, bed.w, bed.h);

        if (imgs.verity.isBroken) { ctx.beginPath(); ctx.arc(verity.x + 15, verity.y + 15, 15, 0, Math.PI*2); ctx.fillStyle = 'yellow'; ctx.fill(); }
        else ctx.drawImage(imgs.verity, verity.x, verity.y, verity.w, verity.h);

        enemies.forEach(e => {
            if (imgs.egg.isBroken) { ctx.fillStyle = '#ffccaa'; ctx.fillRect(e.x, e.y, e.w, e.h); }
            else ctx.drawImage(imgs.egg, e.x, e.y, e.w, e.h);
        });

        powerups.forEach(p => {
            let color = p.type === 'glitch' ? `hsl(${p.timer*10 % 360}, 100%, 50%)` : (p.type === 'expand' ? '#00ff00' : '#0088ff');
            ctx.fillStyle = color; ctx.fillRect(p.x, p.y, 20, 20);
        });

        particles.forEach(p => {
            ctx.fillStyle = `rgba(255, 255, 0, ${p.life/30})`;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.life/5, 0, Math.PI*2); ctx.fill();
        });

        drawText(`${score}`, 80, 30, 24, 'white');
        drawText(`${isSecretLevel ? 'SECRET' : level}`, WIDTH/2, 30, 24, '#ccc');
        drawText(`${lives}`, WIDTH - 80, 30, 24, '#ff6666');
        if (godMode) drawText('GOD MODE', WIDTH/2, 60, 18, 'yellow');
    } 
    else if (gameState === 'multiplayer') {
        ctx.save(); ctx.translate(20, p1Y + 45); ctx.rotate(Math.PI/2);
        if (imgs.bed.isBroken) { ctx.fillStyle = '#8b4513'; ctx.fillRect(-45, -15, 90, 30); }
        else ctx.drawImage(imgs.bed, -45, -15, 90, 30);
        ctx.restore();

        ctx.save(); ctx.translate(WIDTH - 20, p2Y + 45); ctx.rotate(-Math.PI/2);
        if (imgs.bed.isBroken) { ctx.fillStyle = '#8b4513'; ctx.fillRect(-45, -15, 90, 30); }
        else ctx.drawImage(imgs.bed, -45, -15, 90, 30);
        ctx.restore();

        if (imgs.verity.isBroken) { ctx.beginPath(); ctx.arc(mpBall.x + 15, mpBall.y + 15, 15, 0, Math.PI*2); ctx.fillStyle = 'yellow'; ctx.fill(); }
        else ctx.drawImage(imgs.verity, mpBall.x, mpBall.y, mpBall.size, mpBall.size);

        drawText(`${p1Score} : ${p2Score}`, WIDTH/2, 50, 50, 'white');
        if (p1Score >= 5 || p2Score >= 5) drawText(p1Score >= 5 ? "P1 WINS!" : "P2 WINS!", WIDTH/2, HEIGHT/2, 50, '#00ff00');
    }
}

function gameLoop() {
    update(); draw(); requestAnimationFrame(gameLoop);
}

gameLoop();
