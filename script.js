const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Gjendja e lojës
const keys = { left: false, right: false, up: false, down: false };
let playerX = 0; // Pozicioni horizontal i lojtarit (-1 deri në 1)
let speed = 0;
let maxSpeed = 0.05;
let trackProgress = 0;

// Krijo një efekt pseudo-3D për rrugën (kthesat)
let roadCurves = [];
for (let i = 0; i < 500; i++) {
    roadCurves.push(Math.sin(i / 30) * 0.5);
}

// Dëgjuesit e ngjarjeve për PC (Tastiera)
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

// Kontrollet për Mobile (Touch)
function setupMobileButton(id, keyProp) {
    const btn = document.getElementById(id);
    btn.addEventListener("touchstart", (e) => { e.preventDefault(); keys[keyProp] = true; });
    btn.addEventListener("touchend", (e) => { e.preventDefault(); keys[keyProp] = false; });
}
setupMobileButton("btn-left", "left");
setupMobileButton("btn-right", "right");
setupMobileButton("btn-up", "up");
setupMobileButton("btn-down", "down");

// Cikli Kryesor i Lojës
function update() {
    // Lëvizja para/prapa
    if (keys.up) speed = Math.min(speed + 0.002, maxSpeed);
    else if (keys.down) speed = Math.max(speed - 0.002, -maxSpeed/2);
    else speed *= 0.95; // Frena natyrale

    trackProgress += speed;
    let currentSegment = Math.floor(trackProgress * 100) % roadCurves.length;
    let currentCurve = roadCurves[currentSegment];

    // Kthesat majtas/djathtas
    if (keys.left) playerX -= 0.04;
    if (keys.right) playerX += 0.04;

    // Rruga e shtyn lojtarin jashtë nëse ka kthesë
    playerX -= currentCurve * speed * 0.5;

    // Kufizimi i lojtarit brenda ekranit
    playerX = Math.max(-1.5, Math.min(1.5, playerX));

    render(currentCurve);
    requestAnimationFrame(update);
}

function render(curve) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Vizato Qiellin
    ctx.fillStyle = "#87CEEB";
    ctx.fillRect(0, 0, canvas.width, canvas.height / 2);

    // 2. Vizato Kodrat në sfond (Fake 3D background)
    ctx.fillStyle = "#1b8a3e";
    ctx.beginPath();
    ctx.ellipse(canvas.width/2 - (curve * 100), canvas.height/2, canvas.width, 40, 0, 0, Math.PI, true);
    ctx.fill();

    // 3. Vizato Tokën (Bari)
    ctx.fillStyle = "#34a853";
    ctx.fillRect(0, canvas.height / 2, canvas.width, canvas.height / 2);

    // 4. Vizato Rrugën Pseudo-3D (Krijohet rresht pas rreshti nga horizonti poshtë)
    let horizon = canvas.height / 2;
    for (let y = 0; y < canvas.height / 2; y++) {
        let perspective = y / (canvas.height / 2);
        let roadWidth = 40 + perspective * 200;
        
        // Përkulja e rrugës bazuar në kthesën
        let roadCenter = canvas.width / 2 + (perspective * perspective * curve * 120);

        // Bari anësor me ngjyra alternative (efekt shpejtësie)
        let colorToggle = Math.sin((y + trackProgress * 500) * 0.2) > 0;
        
        ctx.fillStyle = colorToggle ? "#e67e22" : "#ffffff"; // Bordura e rrugës
        ctx.fillRect(roadCenter - roadWidth/2 - 10 * perspective, horizon + y, roadWidth + 20 * perspective, 1);

        ctx.fillStyle = colorToggle ? "#7f8c8d" : "#95a5a6"; // Rruga gri
        ctx.fillRect(roadCenter - roadWidth/2, horizon + y, roadWidth, 1);
    }

    // 5. Vizato Makinerinë / Kart-in (Fake Sprite)
    let spriteX = canvas.width / 2 + (playerX * 100) - 20;
    let spriteY = canvas.height - 60;

    // Trupi i Kart-it
    ctx.fillStyle = "#e74c3c"; // E kuqe si Mario
    ctx.fillRect(spriteX, spriteY, 40, 20);
    
    // Rrotat
    ctx.fillStyle = "#000";
    ctx.fillRect(spriteX - 5, spriteY + 10, 8, 12);
    ctx.fillRect(spriteX + 37, spriteY + 10, 8, 12);

    // Helmeta e shoferit
    ctx.fillStyle = "#f1c40f";
    ctx.beginPath();
    ctx.arc(spriteX + 20, spriteY - 5, 10, 0, Math.PI * 2);
    ctx.fill();
}

// Nis lojën
update();