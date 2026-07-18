const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const mapSelector = document.getElementById("maps");

// Konfigurimi i Hartave (Stadium, Fermë, Vullkan)
const themes = {
    stadium: { sky: "#3498db", grass1: "#2ecc71", grass2: "#27ae60", road1: "#95a5a6", road2: "#7f8c8d", object: "🏟️" },
    farm:    { sky: "#f1c40f", grass1: "#d35400", grass2: "#e67e22", road1: "#ba8c63", road2: "#a0724a", object: "🌲" },
    volcano: { sky: "#111111", grass1: "#c0392b", grass2: "#962d22", road1: "#2c3e50", road2: "#1a252f", object: "🔥" }
};
let currentTheme = "stadium";

mapSelector.addEventListener("change", (e) => {
    currentTheme = e.target.value;
});

// Gjendja e lojës
const keys = { left: false, right: false, up: false, down: false };
let playerX = 0; 
let speed = 0;
let maxSpeed = 0.05;
let trackProgress = 0;
let boostTimer = 0;

// Bot Player (Kundërshtari - Lepuri)
let botX = -0.3;
let botProgress = 0.05;
let botSpeed = 0.043;

// Pozicionet e Kërpudhave nëpër rrugë
let mushrooms = [
    { segment: 50, x: -0.4, collected: false },
    { segment: 150, x: 0.3, collected: false },
    { segment: 300, x: -0.2, collected: false },
    { segment: 420, x: 0.4, collected: false }
];

// Kthesat e rrugës
let roadCurves = [];
for (let i = 0; i < 500; i++) {
    roadCurves.push(Math.sin(i / 25) * 0.6);
}

// Tastiera
window.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft" || e.key === "a") keys.left = true;
    if (e.key === "ArrowRight" || e.key === "d") keys.right = true;
    if (e.key === "ArrowUp" || e.key === "w") keys.up = true;
    if (e.key === "ArrowDown" || e.key === "s") keys.down = true;
});
window.addEventListener("keyup", (e) => {
    if (e.key === "ArrowLeft" || e.key === "a") keys.left = false;
    if (e.key === "ArrowRight" || e.key === "d") keys.right = false;
    if (e.key === "ArrowUp" || e.key === "w") keys.up = false;
    if (e.key === "ArrowDown" || e.key === "s") keys.down = false;
});

// Kontrollet Mobile
function setupMobileButton(id, keyProp) {
    const btn = document.getElementById(id);
    if(btn) {
        btn.addEventListener("touchstart", (e) => { e.preventDefault(); keys[keyProp] = true; });
        btn.addEventListener("touchend", (e) => { e.preventDefault(); keys[keyProp] = false; });
    }
}
setupMobileButton("btn-left", "left");
setupMobileButton("btn-right", "right");
setupMobileButton("btn-up", "up");
setupMobileButton("btn-down", "down");

function update() {
    let theme = themes[currentTheme];

    // Menaxhimi i Shpejtësisë / Boost nga Kërpudha
    let currentMaxSpeed = maxSpeed;
    if (boostTimer > 0) {
        currentMaxSpeed = maxSpeed * 1.8; // E bën makinën 80% më të shpejtë
        boostTimer--;
    }

    if (keys.up) speed = Math.min(speed + 0.002, currentMaxSpeed);
    else if (keys.down) speed = Math.max(speed - 0.002, -maxSpeed/2);
    else speed *= 0.95;

    trackProgress += speed;
    let currentSegment = Math.floor(trackProgress * 100) % roadCurves.length;
    let currentCurve = roadCurves[currentSegment];

    if (keys.left) playerX -= 0.04;
    if (keys.right) playerX += 0.04;
    playerX -= currentCurve * speed * 0.4;
    playerX = Math.max(-1.5, Math.min(1.5, playerX));

    // Logjika e Bot-it (Inteligjenca e thjeshtë)
    botProgress += botSpeed;
    let botSegment = Math.floor(botProgress * 100) % roadCurves.length;
    // Boti ndjek kthesat automatikisht që të qëndrojë në rrugë
    botX += (roadCurves[botSegment] * 0.05);
    botX = Math.max(-0.8, Math.min(0.8, botX));

    render(currentCurve, theme, currentSegment);
    requestAnimationFrame(update);
}

function drawDriver(x, y, scale, bodyColor, earColor, isRabbit) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    // Rrotat e makinës
    ctx.fillStyle = "#111";
    ctx.fillRect(-18, 5, 6, 12);
    ctx.fillRect(12, 5, 6, 12);

    // Trupi i makinës (Kart)
    ctx.fillStyle = bodyColor;
    ctx.fillRect(-15, -5, 30, 15);

    // Koka e Kafshës
    ctx.fillStyle = earColor;
    ctx.beginPath();
    ctx.arc(0, -12, 10, 0, Math.PI * 2);
    ctx.fill();

    if (isRabbit) {
        // Veshët e lepurit (Bot)
        ctx.fillRect(-6, -28, 4, 10);
        ctx.fillRect(2, -28, 4, 10);
    } else {
        // Veshët e ariut (Lojtari)
        ctx.beginPath(); ctx.arc(-7, -20, 4, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(7, -20, 4, 0, Math.PI*2); ctx.fill();
    }

    ctx.restore();
}

function render(curve, theme, currentSegment) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Qielli
    ctx.fillStyle = theme.sky;
    ctx.fillRect(0, 0, canvas.width, canvas.height / 2);

    // Vizato vullkanin ose objektet në sfond nëse është zgjedhur
    if (currentTheme === "volcano") {
        ctx.fillStyle = "#e74c3c"; //llava e vullkanit ne sfond
        ctx.beginPath(); ctx.moveTo(200, 70); ctx.lineTo(130, 150); ctx.lineTo(270, 150); ctx.fill();
    }

    // 2. Toka (Bari)
    ctx.fillStyle = theme.grass2;
    ctx.fillRect(0, canvas.height / 2, canvas.width, canvas.height / 2);

    // 3. Ndërtimi i rrugës Pseudo-3D
    let horizon = canvas.height / 2;
    for (let y = 0; y < canvas.height / 2; y++) {
        let perspective = y / (canvas.height / 2);
        let roadWidth = 30 + perspective * 220;
        let roadCenter = canvas.width / 2 + (perspective * perspective * curve * 140);

        let colorToggle = Math.sin((y + trackProgress * 600) * 0.15) > 0;
        
        // Bari anësor me vija alternative
        ctx.fillStyle = colorToggle ? theme.grass1 : theme.grass2;
        ctx.fillRect(0, horizon + y, canvas.width, 1);

        // Bordura
        ctx.fillStyle = colorToggle ? "#ffffff" : "#e74c3c";
        ctx.fillRect(roadCenter - roadWidth/2 - 12*perspective, horizon + y, roadWidth + 24*perspective, 1);

        // Rruga kryesore
        ctx.fillStyle = colorToggle ? theme.road1 : theme.road2;
        ctx.fillRect(roadCenter - roadWidth/2, horizon + y, roadWidth, 1);
    }

    // 4. Logjika dhe vizatimi i Kërpudhave (Mushrooms)
    mushrooms.forEach(mush => {
        let relativeSeg = mush.segment - currentSegment;
        if (relativeSeg > 0 && relativeSeg < 80 && !mush.collected) {
            let perspective = relativeSeg / 80;
            // Përmbysim perspektivën që objektet e largëta të duken të vogla në horizont
            let invPers = 1 - perspective; 
            
            let roadWidth = 30 + invPers * 220;
            let roadCenter = canvas.width / 2 + (invPers * invPers * curve * 140);
            let mushX = roadCenter + (mush.x * roadWidth);
            let mushY = horizon + (invPers * (canvas.height / 2));
            let size = 15 * invPers;

            if(size > 2) {
                // Vizato kapelën e kërpudhës (E kuqe me pika)
                ctx.fillStyle = "#e74c3c";
                ctx.beginPath();
                ctx.arc(mushX, mushY, size, Math.PI, 0);
                ctx.fill();
                // Këmbëza e kërpudhës
                ctx.fillStyle = "#fff";
                ctx.fillRect(mushX - size/4, mushY, size/2, size);

                // Kontrolli i përplasjes (Nëse lojtari e prek kërpudhën)
                if (invPers > 0.85 && Math.abs(playerX - mush.x * 2) < 0.4) {
                    mush.collected = true;
                    boostTimer = 70; // Jep shpejtësi për 70 freme
                }
            }
        }
    });

    // 5. Vizatimi i BOT Player (Lepuri)
    let botRelativeSeg = (Math.floor(botProgress * 100) % roadCurves.length) - currentSegment;
    if (botRelativeSeg > -10 && botRelativeSeg < 100) {
        let botInvPers = 1 - (botRelativeSeg / 100);
        let roadWidth = 30 + botInvPers * 220;
        let roadCenter = canvas.width / 2 + (botInvPers * botInvPers * curve * 140);
        let bScreenX = roadCenter + (botX * roadWidth);
        let bScreenY = horizon + (botInvPers * (canvas.height / 2));
        
        if (botInvPers > 0.1 && botInvPers < 1) {
            drawDriver(bScreenX, bScreenY, botInvPers * 0.9, "#34495e", "#bdc3c7", true);
        }
    }

    // 6. Vizatimi i Lojtarit të Vet (Ariut)
    let playerScreenX = canvas.width / 2 + (playerX * 120);
    let playerScreenY = canvas.height - 40;
    drawDriver(playerScreenX, playerScreenY, 1.2, "#d35400", "#e67e22", false);

    // Efekti vizual kur merr Boost (Kërpudhë)
    if (boostTimer > 0) {
        ctx.fillStyle = "rgba(241, 196, 15, 0.3)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 16px sans-serif";
        ctx.fillText("BOOST!! 🍄", 20, 50);
    }
}

update();