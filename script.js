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
    volcano: { sky: "#1a0505", grass1: "#e67e22", grass2: "#c0392b", road1: "#2c3e50", road2: "#1a252f", type: "volcano" }
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

let segments = [];
const segmentLength = 200;
const trackLength = 800; 

function createTrack() {
    segments = [];
    for (let i = 0; i < trackLength; i++) {
        let curve = 0;
        let hill = 0;
        if (i > 100 && i < 180) curve = 3.0; 
        if (i > 250 && i < 400) hill = Math.sin(i / 10) * 30;
        if (i > 450 && i < 580) curve = -3.5; 
        segments.push({
            p1: { x: 0, y: hill, z: i * segmentLength },
            p2: { x: 0, y: hill, z: (i + 1) * segmentLength },
            curve: curve
        });
    }
}
createTrack();

// Lojtari Kryesor
let player = { x: 0, z: 0, speed: 0, maxSpeed: 14500, accel: 160, decel: -100, turnDir: 0, tilt: 0, lap: 1 };
const keys = { left: false, right: false, up: false, down: false };
let boostTimer = 0;

// SHTIMI I 5 BOTAVE (KUNDËRSHARTËVE)
let bots = [
    { id: "Lepuri", x: -0.5, z: 800, tilt: 0, lap: 1, color: "#bdc3c7", isRabbit: true },
    { id: "Macja",  x: -0.2, z: 1400, tilt: 0, lap: 1, color: "#f39c12", isRabbit: false },
    { id: "Dhelpra", x: 0.2, z: 2000, tilt: 0, lap: 1, color: "#e67e22", isRabbit: false },
    { id: "Ujku",    x: 0.5, z: 2600, tilt: 0, lap: 1, color: "#7f8c8d", isRabbit: false },
    { id: "Luani",   x: 0.0, z: 3200, tilt: 0, lap: 1, color: "#f1c40f", isRabbit: false }
];

let mushrooms = [{ z: 12000, x: -0.4 }, { z: 40000, x: 0.4 }, { z: 90000, x: -0.2 }];

window.addEventListener("keydown", (e) => handleKey(e, true));
window.addEventListener("keyup", (e) => handleKey(e, false));
function handleKey(e, isDown) {
    if (e.key === "ArrowLeft" || e.key === "a") keys.left = isDown;
    if (e.key === "ArrowRight" || e.key === "d") keys.right = isDown;
    if (e.key === "ArrowUp" || e.key === "w") keys.up = isDown;
    if (e.key === "ArrowDown" || e.key === "s") keys.down = isDown;
}

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

    let currentMax = player.maxSpeed;
    if (boostTimer > 0) { currentMax = player.maxSpeed * 1.6; boostTimer--; }
    
    if (theme.type === "volcano" && Math.abs(player.x) > 1.1) currentMax = 3500;
    else if (Math.abs(player.x) > 1.1) currentMax = 6500;

    if (keys.up) player.speed = Math.min(player.speed + player.accel, currentMax);
    else if (keys.down) player.speed = Math.max(player.speed - 300, 0);
    else player.speed = Math.max(player.speed + player.decel, 0);

    player.z += player.speed * dt;

    let currentSegment = Math.floor(player.z / segmentLength) % trackLength;
    let trackCurve = segments[currentSegment].curve;

    player.turnDir = 0;
    if (player.speed > 0) {
        if (keys.left) { player.x -= 0.045; player.turnDir = -1; }
        if (keys.right) { player.x += 0.045; player.turnDir = 1; }
    }

    // Forca Centrifugale ndikon te lojtari
    player.x -= (player.speed / player.maxSpeed) * trackCurve * 0.018;
    player.x = Math.max(-2, Math.min(2, player.x));

    // Përsosja e Animit: Kombinon timonin e lojtarit + forcën e kthesës së rrugës
    let targetTilt = player.turnDir * 1.0 + (trackCurve * 0.15); 
    player.tilt += (targetTilt - player.tilt) * 0.2;

    // Përditësimi i të gjithë Botave
    bots.forEach((bot, index) => {
        let botSegIndex = Math.floor(bot.z / segmentLength) % trackLength;
        let botCurve = segments[botSegIndex].curve;
        
        // Shpejtësi të ndryshme të vogla për secilin që të mos rrinë grumbull
        let individualSpeed = diff.botSpeed + (index * 250);
        bot.z += individualSpeed * dt;
        bot.x += (botCurve * 0.022);

        let botTargetTurn = botCurve > 0 ? 1 : (botCurve < 0 ? -1 : 0);

        if (Math.abs(player.z - bot.z) < 4000) {
            bot.x += (player.x - bot.x) * diff.botAggression;
            botTargetTurn += (player.x > bot.x ? 0.3 : -0.3);
        }
        bot.x = Math.max(-0.9, Math.min(0.9, bot.x));
        bot.tilt += (botTargetTurn - bot.tilt) * 0.15;

        if (bot.z >= trackLength * segmentLength) { bot.z = 0; bot.lap++; }
    });

    if (player.z >= trackLength * segmentLength) {
        player.z = 0;
        player.lap++;
        if (player.lap > 3) checkWinner();
    }

    render(theme, currentSegment);
    requestAnimationFrame(() => update(0.016));
}

function checkWinner() {
    gameActive = false;
    endScreen.classList.remove("hidden");
    
    // Kontrollo nëse ndonjë bot të ka kaluar në xhiro ose distancë
    let playerWon = true;
    for (let bot of bots) {
        if (bot.lap > player.lap || (bot.lap === player.lap && bot.z > player.z)) {
            playerWon = false;
            break;
        }
    }

    if (playerWon) {
        endTitle.innerText = "FITORE! 🏆";
        endMsg.innerText = `Ke marrë Kupën e Artë kundër 5 Botave në ${currentDiff.toUpperCase()}!`;
    } else {
        endTitle.innerText = "HUMBJE! 😭";
        endMsg.innerText = "Një nga botat mori Kupën e parë! Provo përsëri.";
    }
}

function restartGame() {
    player.z = 0; player.speed = 0; player.lap = 1; player.x = 0; player.tilt = 0;
    bots.forEach((bot, i) => { bot.z = 800 + (i * 600); bot.lap = 1; bot.x = -0.5 + (i * 0.2); bot.tilt = 0; });
    mushrooms.forEach(m => m.collected = false);
    endScreen.classList.add("hidden");
    gameActive = true;
    update(0.016);
}

function render(theme, currentSegment) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Qielli
    ctx.fillStyle = theme.sky;
    ctx.fillRect(0, 0, canvas.width, canvas.height / 2);

    let cameraX = player.x * 1000;
    let cameraDepth = 1 / Math.tan((80 / 2) * Math.PI / 180);
    let cameraY = segments[currentSegment].p1.y + 1500;

    let maxy = canvas.height;
    let x = 0; let dx = 0;

    // Rruga 3D Rrethe-Pas-Rrethi
    for (let n = 0; n < 120; n++) {
        let idx = (currentSegment + n) % trackLength;
        let segment = segments[idx];
        dx += segment.curve * 5;
        
        let p1 = project(segment.p1, cameraX - x, cameraY, player.z, cameraDepth, canvas.width, canvas.height, 2400);
        let p2 = project(segment.p2, cameraX - x - dx, cameraY, player.z, cameraDepth, canvas.width, canvas.height, 2400);
        x += dx;

        if (p1.cameraZ <= cameraDepth || p2.screenY >= maxy) continue;
        let colorToggle = Math.floor((currentSegment + n) / 3) % 2 === 0;
        
        // Bari / Llava
        ctx.fillStyle = colorToggle ? theme.grass1 : theme.grass2;
        ctx.fillRect(0, p2.screenY, canvas.width, p1.screenY - p2.screenY);

        // VIZATIMI I VIJËS SË FINISHIT (Checkerboard në segmentet e para 0-2)
        if (idx >= 0 && idx <= 2) {
            ctx.fillStyle = "#fff";
            ctx.fillRect(p1.screenX - p1.screenWidth, p2.screenY, p1.screenWidth * 2, p1.screenY - p2.screenY);
            ctx.fillStyle = "#000";
            let blockWidth = (p1.screenWidth * 2) / 10;
            for (let b = 0; b < 10; b += 2) {
                let startX = (p1.screenX - p1.screenWidth) + (b * blockWidth) + (colorToggle ? blockWidth : 0);
                ctx.fillRect(startX, p2.screenY, blockWidth, p1.screenY - p2.screenY);
            }
        } else {
            // Rruga normale
            ctx.fillStyle = colorToggle ? theme.road1 : theme.road2;
            ctx.beginPath();
            ctx.moveTo(p1.screenX - p1.screenWidth, p1.screenY);
            ctx.lineTo(p1.screenX + p1.screenWidth, p1.screenY);
            ctx.lineTo(p2.screenX + p2.screenWidth, p2.screenY);
            ctx.lineTo(p2.screenX - p2.screenWidth, p2.screenY);
            ctx.fill();
        }

        maxy = p2.screenY;
    }

    // MBUSHJA E HORIZONTIT (Zhdukja e vijës së zezë)
    if (maxy > canvas.height / 2) {
        ctx.fillStyle = theme.grass2;
        ctx.fillRect(0, canvas.height / 2, canvas.width, maxy - canvas.height / 2);
    }

    // Kërpudhat
    mushrooms.forEach(mush => {
        if (mush.z > player.z && mush.z < player.z + 25000 && !mush.collected) {
            let mSeg = segments[Math.floor(mush.z / segmentLength) % trackLength];
            let p = project({ x: mush.x * 2400, y: mSeg.p1.y, z: mush.z }, cameraX, cameraY, player.z, cameraDepth, canvas.width, canvas.height, 2400);
            let size = (cameraDepth / (mush.z - player.z)) * 400;
            if (size > 1 && size < 80) {
                ctx.fillStyle = "#e74c3c"; ctx.beginPath(); ctx.arc(p.screenX, p.screenY - size, size, Math.PI, 0); ctx.fill();
                ctx.fillStyle = "#fff"; ctx.fillRect(p.screenX - size/4, p.screenY - size, size/2, size);
                if (Math.abs(player.z - mush.z) < 400 && Math.abs(player.x - mush.x) < 0.3) { mush.collected = true; boostTimer = 85; }
            }
        }
    });

    // Vizatimi i të 5 Botave në Render
    bots.forEach(bot => {
        if (bot.z > player.z && bot.z < player.z + 28000) {
            let bSeg = segments[Math.floor(bot.z / segmentLength) % trackLength];
            let p = project({ x: bot.x * 2400, y: bSeg.p1.y, z: bot.z }, cameraX, cameraY, player.z, cameraDepth, canvas.width, canvas.height, 2400);
            let scale = (cameraDepth / (bot.z - player.z)) * 2.0;
            if (scale > 0.1 && scale < 5) drawDriver(p.screenX, p.screenY, scale, "#2c3e50", bot.color, bot.isRabbit, bot.tilt);
        }
    });

    // Lojtari Kryesor (Ariu)
    drawDriver(canvas.width / 2, canvas.height - 35, 2.2, "#d35400", "#e67e22", false, player.tilt);

    // HUD e pastër HD
    ctx.fillStyle = "#fff"; ctx.font = "bold 26px monospace";
    ctx.fillText(`XHIRO: ${player.lap}/3`, 30, 50);
    ctx.fillText(`KMD/H: ${Math.round(player.speed / 100)}`, 30, 90);
}

function drawDriver(x, y, scale, bodyColor, earColor, isRabbit, tilt) {
    ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);

    let bodyXOffset = tilt * 4;
    let headXOffset = tilt * 6;
    let tiltYOffset = Math.abs(tilt) * 1.5;

    ctx.fillStyle = "#111";
    if (tilt > 0.15) {
        ctx.fillRect(-20 + bodyXOffset, 5 + tiltYOffset, 7, 12);
        ctx.fillRect(8 + bodyXOffset, 5 - tiltYOffset, 5, 12);
    } else if (tilt < -0.15) {
        ctx.fillRect(-13 + bodyXOffset, 5 - tiltYOffset, 5, 12);
        ctx.fillRect(13 + bodyXOffset, 5 + tiltYOffset, 7, 12);
    } else {
        ctx.fillRect(-18, 5, 6, 12); ctx.fillRect(12, 5, 6, 12);
    }

    ctx.fillStyle = bodyColor;
    let kartWidth = 30 - Math.abs(tilt) * 3;
    ctx.fillRect(-15 + bodyXOffset, -5 + tiltYOffset, kartWidth, 14);

    ctx.fillStyle = "#333"; ctx.fillRect(-3 + headXOffset * 0.5, -2, 6, 3);

    ctx.fillStyle = earColor; ctx.beginPath(); ctx.arc(0 + headXOffset, -12 - tiltYOffset, 9, 0, Math.PI * 2); ctx.fill();

    if (isRabbit) {
        ctx.fillStyle = earColor;
        ctx.fillRect(-5 + headXOffset - tilt * 1.5, -26 - tiltYOffset, 3, 10);
        ctx.fillRect(2 + headXOffset - tilt * 1.5, -26 - tiltYOffset, 3, 10);
    } else {
        ctx.fillStyle = bodyColor;
        ctx.beginPath(); ctx.arc(-7 + headXOffset, -20 - tiltYOffset, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(7 + headXOffset, -20 - tiltYOffset, 3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
}

update(0.016);