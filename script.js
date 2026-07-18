const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const mapSelector = document.getElementById("maps");

const themes = {
    stadium: { sky: "#3498db", grass1: "#2ecc71", grass2: "#27ae60", road1: "#95a5a6", road2: "#7f8c8d" },
    farm:    { sky: "#f1c40f", grass1: "#d35400", grass2: "#e67e22", road1: "#ba8c63", road2: "#a0724a" },
    volcano: { sky: "#111111", grass1: "#c0392b", grass2: "#962d22", road1: "#2c3e50", road2: "#1a252f" }
};
let currentTheme = "stadium";
mapSelector.addEventListener("change", (e) => currentTheme = e.target.value);

// Strukturimi i Rrugës me Segmente Reale (3D Curve & Hills)
let segments = [];
const segmentLength = 200;
const trackLength = 1000; // Sa e gjatë është pista

function createTrack() {
    segments = [];
    for (let i = 0; i < trackLength; i++) {
        let curve = 0;
        let hill = 0;
        
        // Krijo kthesa dhe kodra reale në zona të caktuara të pistës
        if (i > 100 && i < 200) curve = 2;       // Kthesë e fortë djathtas
        if (i > 250 && i < 350) hill = Math.sin(i / 10) * 20; // Kodra (Hills)
        if (i > 400 && i < 600) curve = -3;      // Kthesë e gjatë majtas
        if (i > 700 && i < 850) { curve = 1.5; hill = Math.cos(i / 5) * 15; }

        segments.push({
            p1: { x: 0, y: hill, z: i * segmentLength },
            p2: { x: 0, y: hill, z: (i + 1) * segmentLength },
            curve: curve
        });
    }
}
createTrack();

// Lojtari Kryesor
let player = { x: 0, y: 0, z: 0, speed: 0, maxSpeed: 12000, accel: 200, breaking: -300, decel: -100 };
const keys = { left: false, right: false, up: false, down: false };
let boostTimer = 0;

// Inteligjenca Artificiale (Smart Bot Player - Lepuri)
let bot = { x: 0.2, z: 2000, speed: 10500, percent: 0 };

// Kërpudhat
let mushrooms = [
    { z: 15000, x: -0.3, collected: false },
    { z: 45000, x: 0.4, collected: false },
    { z: 90000, x: -0.2, collected: false },
    { z: 140000, x: 0.3, collected: false }
];

// Tastiera & Mobile
window.addEventListener("keydown", (e) => handleKey(e, true));
window.addEventListener("keyup", (e) => handleKey(e, false));
function handleKey(e, isDown) {
    if (e.key === "ArrowLeft" || e.key === "a") keys.left = isDown;
    if (e.key === "ArrowRight" || e.key === "d") keys.right = isDown;
    if (e.key === "ArrowUp" || e.key === "w") keys.up = isDown;
    if (e.key === "ArrowDown" || e.key === "s") keys.down = isDown;
}

// Funksioni i Projektimit Matematik 3D (X, Y, Z -> Ekran 2D)
function project(p, cameraX, cameraY, cameraZ, cameraDepth, width, height, roadWidth) {
    let transX = p.x - cameraX;
    let transY = p.y - cameraY;
    let transZ = p.z - cameraZ;

    let scale = cameraDepth / transZ;
    
    return {
        screenX: Math.round((width / 2) + (scale * transX * width / 2)),
        screenY: Math.round((height / 2) - (scale * transY * height / 2)),
        screenWidth: Math.round(scale * roadWidth * width / 2)
    };
}

function update(dt) {
    let theme = themes[currentTheme];
    let currentMax = player.maxSpeed;

    if (boostTimer > 0) { currentMax = player.maxSpeed * 1.7; boostTimer--; }

    // Fizika e Lojtarit
    if (keys.up) player.speed = Math.min(player.speed + player.accel, currentMax);
    else if (keys.down) player.speed = Math.max(player.speed + player.breaking, 0);
    else player.speed = Math.max(player.speed + player.decel, 0);

    player.z += player.speed * dt;

    let currentSegment = Math.floor(player.z / segmentLength) % trackLength;
    let seg = segments[currentSegment];

    // Kthesat ndikojnë në varësi të shpejtësisë
    if (keys.left) player.x -= 0.05 * (player.speed / player.maxSpeed);
    if (keys.right) player.x += 0.05 * (player.speed / player.maxSpeed);
    
    // Forca Centrifugale (Rruga të shtyn jashtë në kthesë)
    player.x -= (player.speed / player.maxSpeed) * seg.curve * 0.015;
    player.x = Math.max(-2, Math.min(2, player.x)); // Limitimi i rrugës

    // AI E ZGJUAR (Smart Bot)
    let botSegmentIndex = Math.floor(bot.z / segmentLength) % trackLength;
    let botSeg = segments[botSegmentIndex];
    
    // Boti rregullon shpejtësinë në kthesa që të mos dalë jashtë
    let targetBotSpeed = bot.speed;
    if (Math.abs(botSeg.curve) > 1) targetBotSpeed *= 0.7; 

    bot.z += targetBotSpeed * dt;
    bot.x += (botSeg.curve * 0.02); // Qëndron automatikisht brenda kthesës

    // LOGJIKA E SULMIT: Nëse boti të ka afër mbrapa, përpiqet të të bllokojë
    let distanceToPlayer = player.z - bot.z;
    if (Math.abs(distanceToPlayer) < 3000) {
        // Boti lëviz drejt pozicionit tënd horizontal për të të zënë rrugën
        bot.x += (player.x - bot.x) * 0.03;
    }
    bot.x = Math.max(-0.8, Math.min(0.8, bot.x));

    // Resetimi i xhiros kur mbaron pista
    if (player.z >= trackLength * segmentLength) player.z = 0;
    if (bot.z >= trackLength * segmentLength) bot.z = 0;

    render(theme, currentSegment);
    requestAnimationFrame(() => update(0.016));
}

function render(theme, currentSegment) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Qielli
    ctx.fillStyle = theme.sky;
    ctx.fillRect(0, 0, canvas.width, canvas.height / 2);

    let cameraX = player.x * 1000;
    let cameraDepth = 1 / Math.tan((80 / 2) * Math.PI / 180);
    let playerSegment = segments[currentSegment];
    let cameraY = playerSegment.p1.y + 1500; // Lartësia e kameras mbi rrugë

    let maxy = canvas.height;
    let x = 0;
    let dx = 0;

    // 2. Renderimi i rrugës 3D nga afër-larg (Back-to-Front)
    for (let n = 0; n < 100; n++) {
        let segment = segments[(currentSegment + n) % trackLength];
        
        // Kalkulimi i kthesës 3D pseudo
        dx += segment.curve * 5;
        
        let p1 = project(segment.p1, cameraX - x, cameraY, player.z, cameraDepth, canvas.width, canvas.height, 2000);
        let p2 = project(segment.p2, cameraX - x - dx, cameraY, player.z, cameraDepth, canvas.width, canvas.height, 2000);
        
        x += dx;

        if (p1.cameraZ <= cameraDepth || p2.screenY >= maxy) continue;

        let colorToggle = Math.floor((currentSegment + n) / 3) % 2 === 0;
        
        // Bari
        ctx.fillStyle = colorToggle ? theme.grass1 : theme.grass2;
        ctx.fillRect(0, p2.screenY, canvas.width, p1.screenY - p2.screenY);

        // Bordura 3D
        ctx.fillStyle = colorToggle ? "#fff" : "#e74c3c";
        ctx.beginPath();
        ctx.moveTo(p1.screenX - p1.screenWidth * 1.1, p1.screenY);
        ctx.lineTo(p1.screenX + p1.screenWidth * 1.1, p1.screenY);
        ctx.lineTo(p2.screenX + p2.screenWidth * 1.1, p2.screenY);
        ctx.lineTo(p2.screenX - p2.screenWidth * 1.1, p2.screenY);
        ctx.fill();

        // Rruga 3D
        ctx.fillStyle = colorToggle ? theme.road1 : theme.road2;
        ctx.beginPath();
        ctx.moveTo(p1.screenX - p1.screenWidth, p1.screenY);
        ctx.lineTo(p1.screenX + p1.screenWidth, p1.screenY);
        ctx.lineTo(p2.screenX + p2.screenWidth, p2.screenY);
        ctx.lineTo(p2.screenX - p2.screenWidth, p2.screenY);
        ctx.fill();

        maxy = p2.screenY;
    }

    // 3. Vizatimi i Kërpudhave 3D me Projektim Real
    mushrooms.forEach(mush => {
        if (mush.z > player.z && mush.z < player.z + 20000 && !mush.collected) {
            let mSeg = segments[Math.floor(mush.z / segmentLength) % trackLength];
            let p = project({ x: mush.x * 2000, y: mSeg.p1.y, z: mush.z }, cameraX, cameraY, player.z, cameraDepth, canvas.width, canvas.height, 2000);
            let size = (cameraDepth / (mush.z - player.z)) * 300;

            if (size > 1) {
                ctx.fillStyle = "#e74c3c";
                ctx.beginPath(); ctx.arc(p.screenX, p.screenY - size, size, Math.PI, 0); ctx.fill();
                ctx.fillStyle = "#fff"; ctx.fillRect(p.screenX - size/4, p.screenY - size, size/2, size);

                // Kontrolli i përplasjes
                if (Math.abs(player.z - mush.z) < 400 && Math.abs(player.x - mush.x) < 0.3) {
                    mush.collected = true;
                    boostTimer = 100;
                }
            }
        }
    });

    // 4. Vizatimi i BOT-it (Lepuri) në Hapësirë 3D
    if (bot.z > player.z && bot.z < player.z + 25000) {
        let bSeg = segments[Math.floor(bot.z / segmentLength) % trackLength];
        let p = project({ x: bot.x * 2000, y: bSeg.p1.y, z: bot.z }, cameraX, cameraY, player.z, cameraDepth, canvas.width, canvas.height, 2000);
        let scale = (cameraDepth / (bot.z - player.z)) * 1.5;
        if(scale > 0.05 && scale < 3) drawDriver(p.screenX, p.screenY, scale, "#34495e", "#bdc3c7", true);
    }

    // 5. Lojtari Kryesor (Ariut) - Gjithmonë në plan të parë
    drawDriver(canvas.width / 2, canvas.height - 20, 1.5, "#d35400", "#e67e22", false);

    // UI - Shpejtësia
    ctx.fillStyle = "#fff";
    ctx.font = "bold 14px monospace";
    ctx.fillText(`KMD/H: ${Math.round(player.speed / 100)}`, 10, 30);
}

function drawDriver(x, y, scale, bodyColor, earColor, isRabbit) {
    ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
    ctx.fillStyle = "#111"; ctx.fillRect(-18, 5, 6, 12); ctx.fillRect(12, 5, 6, 12); // Rrotat
    ctx.fillStyle = bodyColor; ctx.fillRect(-15, -5, 30, 15); // Kart
    ctx.fillStyle = earColor; ctx.beginPath(); ctx.arc(0, -12, 10, 0, Math.PI * 2); ctx.fill(); // Koka
    if (isRabbit) { ctx.fillRect(-5, -28, 3, 10); ctx.fillRect(2, -28, 3, 10); } // Veshë Lepuri
    else { ctx.beginPath(); ctx.arc(-7, -20, 3, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(7, -20, 3, 0, Math.PI*2); ctx.fill(); } // Veshë Ariu
    ctx.restore();
}

update(0.016);