const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const mapSelector = document.getElementById("maps");
const diffSelector = document.getElementById("difficulty");
const endScreen = document.getElementById("end-screen");
const endTitle = document.getElementById("end-title");
const endMsg = document.getElementById("end-msg");

const themes = {
    stadium: { sky: "#3498db", grass1: "#2ecc71", grass2: "#27ae60", road1: "#95a5a6", road2: "#7f8c8d", type: "stadium" },
    farm:    { sky: "#f1c40f", grass1: "#d35400", grass2: "#e67e22", road1: "#ba8c63", road2: "#a0724a", type: "farm" },
    volcano: { sky: "#1a0505", grass1: "#e67e22", grass2: "#c0392b", road1: "#2c3e50", road2: "#1a252f", type: "volcano" } // Grass këtu është Llava!
};

const diffSettings = {
    easy: { botSpeed: 8000, botAggression: 0.01 },
    medium: { botSpeed: 11000, botAggression: 0.03 },
    hard: { botSpeed: 13500, botAggression: 0.06 }
};

let currentTheme = "stadium";
let currentDiff = "medium";
let gameActive = true;

mapSelector.addEventListener("change", (e) => currentTheme = e.target.value);
diffSelector.addEventListener("change", (e) => currentDiff = e.target.value);

// Ndërtimi i Rrugës Pseudo-3D
let segments = [];
const segmentLength = 200;
const trackLength = 600; 

function createTrack() {
    segments = [];
    for (let i = 0; i < trackLength; i++) {
        let curve = 0;
        let hill = 0;
        if (i > 80 && i < 150) curve = 2.5; 
        if (i > 200 && i < 300) hill = Math.sin(i / 8) * 25;
        if (i > 350 && i < 480) curve = -3; 
        segments.push({
            p1: { x: 0, y: hill, z: i * segmentLength },
            p2: { x: 0, y: hill, z: (i + 1) * segmentLength },
            curve: curve
        });
    }
}
createTrack();

// Lojtari Kryesor
let player = { x: 0, z: 0, speed: 0, maxSpeed: 14000, accel: 150, decel: -100, turnDir: 0, lap: 1 };
const keys = { left: false, right: false, up: false, down: false };
let boostTimer = 0;

// Bot Player
let bot = { x: 0.3, z: 1000, lap: 1 };

// Kërpudhat
let mushrooms = [{ z: 10000, x: -0.4 }, { z: 35000, x: 0.4 }, { z: 70000, x: -0.2 }];

// Dëgjuesit e Tastierës
window.addEventListener("keydown", (e) => handleKey(e, true));
window.addEventListener("keyup", (e) => handleKey(e, false));
function handleKey(e, isDown) {
    if (e.key === "ArrowLeft" || e.key === "a") keys.left = isDown;
    if (e.key === "ArrowRight" || e.key === "d") keys.right = isDown;
    if (e.key === "ArrowUp" || e.key === "w") keys.up = isDown;
    if (e.key === "ArrowDown" || e.key === "s") keys.down = isDown;
}

// Mobile Setup
function setupMobile(id, key) {
    const b = document.getElementById(id);
    if(b){
        b.addEventListener("touchstart", (e) => { e.preventDefault(); keys[key] = true; });
        b.addEventListener("touchend", (e) => { e.preventDefault(); keys[key] = false; });
    }
}
setupMobile("btn-left", "left"); setupMobile("btn-right", "right");
setupMobile("btn-up", "up"); setupMobile("btn-down", "down");

function project(p, cameraX, cameraY, cameraZ, cameraDepth, width, height, roadWidth) {
    let transX = p.x - cameraX; let transY = p.y - cameraY; let transZ = p.z - cameraZ;
    let scale = cameraDepth / transZ;
    return {
        screenX: Math.round((width / 2) + (scale * transX * width / 2)),
        screenY: Math.round((height / 2) - (scale * transY * height / 2)),
        screenWidth: Math.round(scale * roadWidth * width / 2)
    };
}

function update(dt) {
    if (!gameActive) return;

    let theme = themes[currentTheme];
    let diff = diffSettings[currentDiff];

    // Kontrolli i Shpejtësisë Maksimal dhe Llava Ngadalësuese
    let currentMax = player.maxSpeed;
    if (boostTimer > 0) { currentMax = player.maxSpeed * 1.6; boostTimer--; }
    
    // Nëse del jashtë rruge te vullkani (llava), makina ngadalësohet keq!
    if (theme.type === "volcano" && Math.abs(player.x) > 1.1) {
        currentMax = 3000;
    } else if (Math.abs(player.x) > 1.1) {
        currentMax = 6000; // Bari i thjeshtë ngadalëson më pak
    }

    if (keys.up) player.speed = Math.min(player.speed + player.accel, currentMax);
    else if (keys.down) player.speed = Math.max(player.speed - 300, 0);
    else player.speed = Math.max(player.speed + player.decel, 0);

    player.z += player.speed * dt;

    // Ndryshimi i animit të veturës (Kthesa majtas/djathtas)
    player.turnDir = 0;
    if (player.speed > 0) {
        if (keys.left) { player.x -= 0.04; player.turnDir = -1; } // Animi majtas
        if (keys.right) { player.x += 0.04; player.turnDir = 1;  } // Animi djathtas
    }

    let currentSegment = Math.floor(player.z / segmentLength) % trackLength;
    player.x -= (player.speed / player.maxSpeed) * segments[currentSegment].curve * 0.015;
    player.x = Math.max(-2, Math.min(2, player.x));

    // Inteligjenca e Bot-it bazuar në Vështirësinë (Easy/Medium/Hard)
    let botSegIndex = Math.floor(bot.z / segmentLength) % trackLength;
    bot.z += diff.botSpeed * dt;
    bot.x += (segments[botSegIndex].curve * 0.02);

    // AI Inteligjente: Reagon ndaj lojtarit
    if (Math.abs(player.z - bot.z) < 4000) {
        bot.x += (player.x - bot.x) * diff.botAggression; 
    }
    bot.x = Math.max(-0.8, Math.min(0.8, bot.x));

    // Menaxhimi i Xhirove (Laps) dhe Kupave
    if (player.z >= trackLength * segmentLength) {
        player.z = 0;
        player.lap++;
        if (player.lap > 3) checkWinner();
    }
    if (bot.z >= trackLength * segmentLength) {
        bot.z = 0;
        bot.lap++;
    }

    render(theme, currentSegment);
    requestAnimationFrame(() => update(0.016));
}

function checkWinner() {
    gameActive = false;
    endScreen.classList.remove("hidden");
    if (player.lap > bot.lap || (player.lap === bot.lap && player.z >= bot.z)) {
        endTitle.innerText = "FITORE! 🏆";
        endMsg.innerText = `Ke marrë Kupën e Artë në vështirësinë ${currentDiff.toUpperCase()}!`;
    } else {
        endTitle.innerText = "HUMBJE! 😭";
        endMsg.innerText = "Boti fitoi Kupën! Provo përsëri.";
    }
}

function restartGame() {
    player.z = 0; player.speed = 0; player.lap = 1; player.x = 0;
    bot.z = 2000; bot.lap = 1; bot.x = 0.2;
    mushrooms.forEach(m => m.collected = false);
    endScreen.classList.add("hidden");
    gameActive = true;
    update(0.016);
}

function render(theme, currentSegment) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Vizato Qiellin
    ctx.fillStyle = theme.sky;
    ctx.fillRect(0, 0, canvas.width, canvas.height / 2);

    let cameraX = player.x * 1000;
    let cameraDepth = 1 / Math.tan((80 / 2) * Math.PI / 180);
    let cameraY = segments[currentSegment].p1.y + 1500;

    let maxy = canvas.height;
    let x = 0; let dx = 0;

    // Renderimi i rrugës 3D
    for (let n = 0; n < 80; n++) {
        let segment = segments[(currentSegment + n) % trackLength];
        dx += segment.curve * 5;
        
        let p1 = project(segment.p1, cameraX - x, cameraY, player.z, cameraDepth, canvas.width, canvas.height, 2000);
        let p2 = project(segment.p2, cameraX - x - dx, cameraY, player.z, cameraDepth, canvas.width, canvas.height, 2000);
        x += dx;

        if (p1.cameraZ <= cameraDepth || p2.screenY >= maxy) continue;
        let colorToggle = Math.floor((currentSegment + n) / 3) % 2 === 0;
        
        // Bari ose Llava
        ctx.fillStyle = colorToggle ? theme.grass1 : theme.grass2;
        ctx.fillRect(0, p2.screenY, canvas.width, p1.screenY - p2.screenY);

        // Rruga
        ctx.fillStyle = colorToggle ? theme.road1 : theme.road2;
        ctx.beginPath();
        ctx.moveTo(p1.screenX - p1.screenWidth, p1.screenY);
        ctx.lineTo(p1.screenX + p1.screenWidth, p1.screenY);
        ctx.lineTo(p2.screenX + p2.screenWidth, p2.screenY);
        ctx.lineTo(p2.screenX - p2.screenWidth, p2.screenY);
        ctx.fill();

        maxy = p2.screenY;
    }

    // Vizatimi i Kërpudhave
    mushrooms.forEach(mush => {
        if (mush.z > player.z && mush.z < player.z + 20000 && !mush.collected) {
            let mSeg = segments[Math.floor(mush.z / segmentLength) % trackLength];
            let p = project({ x: mush.x * 2000, y: mSeg.p1.y, z: mush.z }, cameraX, cameraY, player.z, cameraDepth, canvas.width, canvas.height, 2000);
            let size = (cameraDepth / (mush.z - player.z)) * 300;
            if (size > 1 && size < 50) {
                ctx.fillStyle = "#e74c3c"; ctx.beginPath(); ctx.arc(p.screenX, p.screenY - size, size, Math.PI, 0); ctx.fill();
                ctx.fillStyle = "#fff"; ctx.fillRect(p.screenX - size/4, p.screenY - size, size/2, size);
                if (Math.abs(player.z - mush.z) < 400 && Math.abs(player.x - mush.x) < 0.3) { mush.collected = true; boostTimer = 80; }
            }
        }
    });

    // Vizatimi i Bot Player
    if (bot.z > player.z && bot.z < player.z + 20000) {
        let bSeg = segments[Math.floor(bot.z / segmentLength) % trackLength];
        let p = project({ x: bot.x * 2000, y: bSeg.p1.y, z: bot.z }, cameraX, cameraY, player.z, cameraDepth, canvas.width, canvas.height, 2000);
        let scale = (cameraDepth / (bot.z - player.z)) * 1.5;
        if (scale > 0.1 && scale < 3) drawDriver(p.screenX, p.screenY, scale, "#34495e", "#bdc3c7", true, 0);
    }

    // Vizatimi i Lojtarit me animim rrotullimi (turnDir)
    drawDriver(canvas.width / 2, canvas.height - 20, 1.5, "#d35400", "#e67e22", false, player.turnDir);

    // Teksti HUD (Lap dhe Shpejtësia)
    ctx.fillStyle = "#fff"; ctx.font = "bold 14px monospace";
    ctx.fillText(`XHIRO: ${player.lap}/3`, 10, 30);
    ctx.fillText(`KMD/H: ${Math.round(player.speed / 100)}`, 10, 50);
}

function drawDriver(x, y, scale, bodyColor, earColor, isRabbit, turnDir) {
    ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
    
    // Rrotullimi i veturës në kthesë
    if (turnDir !== 0) ctx.rotate(turnDir * 0.12);

    ctx.fillStyle = "#111"; ctx.fillRect(-18, 5, 6, 12); ctx.fillRect(12, 5, 6, 12); // Rrotat
    ctx.fillStyle = bodyColor; ctx.fillRect(-15, -5, 30, 15); // Kart
    ctx.fillStyle = earColor; ctx.beginPath(); ctx.arc(0, -12, 10, 0, Math.PI * 2); ctx.fill(); // Koka
    if (isRabbit) { ctx.fillRect(-5, -28, 3, 10); ctx.fillRect(2, -28, 3, 10); }
    else { ctx.beginPath(); ctx.arc(-7, -20, 3, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(7, -20, 3, 0, Math.PI*2); ctx.fill(); }
    ctx.restore();
}

update(0.016);