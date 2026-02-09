// Santa Speed Runner - Main Game Engine
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game dimensions
canvas.width = 800;
canvas.height = 400;

// Game state
let gameState = 'menu';
let score = 0;
let distance = 0;
let giftsCollected = 0;
let highScore = parseInt(localStorage.getItem('santaHighScore')) || 0;
let gameSpeed = 5;
let frameCount = 0;

// Update high score display
document.getElementById('best-score').textContent = highScore;

// Santa (Player)
const santa = {
    x: 80,
    y: 280,
    width: 50,
    height: 60,
    velocityY: 0,
    jumping: false,
    sliding: false,
    slideTimer: 0,
    groundY: 280,
    color: '#c62828',

    draw() {
        ctx.save();

        const drawY = this.sliding ? this.y + 30 : this.y;
        const drawHeight = this.sliding ? 30 : this.height;

        // Body (red suit)
        ctx.fillStyle = '#c62828';
        ctx.fillRect(this.x, drawY + 15, this.width - 10, drawHeight - 25);

        // Face
        ctx.fillStyle = '#ffccbc';
        ctx.beginPath();
        ctx.arc(this.x + 20, drawY + 12, 12, 0, Math.PI * 2);
        ctx.fill();

        // Hat
        ctx.fillStyle = '#c62828';
        ctx.beginPath();
        ctx.moveTo(this.x + 5, drawY + 8);
        ctx.lineTo(this.x + 35, drawY + 8);
        ctx.lineTo(this.x + 25, drawY - 15);
        ctx.closePath();
        ctx.fill();

        // Hat pompom
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(this.x + 25, drawY - 15, 5, 0, Math.PI * 2);
        ctx.fill();

        // Beard
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(this.x + 20, drawY + 20, 8, 0, Math.PI);
        ctx.fill();

        // Belt
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(this.x, drawY + 30, this.width - 10, 5);
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(this.x + 15, drawY + 28, 10, 9);

        // Legs animation
        const legOffset = Math.sin(frameCount * 0.3) * 5;
        ctx.fillStyle = '#c62828';
        if (!this.sliding) {
            ctx.fillRect(this.x + 5, drawY + drawHeight - 15, 12, 15);
            ctx.fillRect(this.x + 22, drawY + drawHeight - 15, 12, 15);
        }

        // Boots
        ctx.fillStyle = '#1a1a1a';
        if (!this.sliding) {
            ctx.fillRect(this.x + 3, drawY + drawHeight - 5, 16, 8);
            ctx.fillRect(this.x + 20, drawY + drawHeight - 5, 16, 8);
        }

        ctx.restore();
    },

    update() {
        // Gravity
        if (!this.sliding) {
            this.velocityY += 0.8;
            this.y += this.velocityY;
        }

        // Ground collision
        if (this.y >= this.groundY) {
            this.y = this.groundY;
            this.velocityY = 0;
            this.jumping = false;
        }

        // Sliding timer
        if (this.sliding) {
            this.slideTimer--;
            if (this.slideTimer <= 0) {
                this.sliding = false;
                this.y = this.groundY;
            }
        }
    },

    jump() {
        if (!this.jumping && !this.sliding && this.y >= this.groundY) {
            this.velocityY = -17 * getJumpMultiplier();
            this.jumping = true;
            // Jump dust particles
            emitJumpParticles(this);
        }
    },

    slide() {
        if (!this.jumping && !this.sliding) {
            this.sliding = true;
            this.slideTimer = 30;
        }
    },

    getHitbox() {
        if (this.sliding) {
            return {
                x: this.x + 5,
                y: this.y + 30,
                width: this.width - 15,
                height: 25
            };
        }
        return {
            x: this.x + 5,
            y: this.y + 8,
            width: this.width - 15,
            height: this.height - 16
        };
    }
};

// Obstacles
const obstacles = [];
const obstacleTypes = [
    { type: 'chimney', width: 35, height: 50, color: '#5d4037', needJump: true },
    { type: 'snowman', width: 30, height: 45, color: 'white', needJump: true },
    { type: 'bird', width: 30, height: 25, color: '#37474f', needSlide: true, flying: true },
    { type: 'tree', width: 40, height: 55, color: '#2e7d32', needJump: true }
];

function createObstacle() {
    const type = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
    const obstacle = {
        x: canvas.width + 50,
        y: type.flying ? 260 : 340 - type.height,
        width: type.width,
        height: type.height,
        type: type.type,
        color: type.color,
        flying: type.flying || false,
        passed: false
    };
    obstacles.push(obstacle);
}

function drawObstacle(obs) {
    ctx.save();

    if (obs.type === 'chimney') {
        // Brick chimney
        ctx.fillStyle = '#5d4037';
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
        // Bricks
        ctx.strokeStyle = '#3e2723';
        ctx.lineWidth = 2;
        for (let i = 0; i < obs.height; i += 10) {
            ctx.beginPath();
            ctx.moveTo(obs.x, obs.y + i);
            ctx.lineTo(obs.x + obs.width, obs.y + i);
            ctx.stroke();
        }
        // Smoke
        ctx.fillStyle = 'rgba(200, 200, 200, 0.5)';
        ctx.beginPath();
        ctx.arc(obs.x + 20, obs.y - 10 + Math.sin(frameCount * 0.1) * 5, 8, 0, Math.PI * 2);
        ctx.fill();
    }
    else if (obs.type === 'snowman') {
        // Body
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(obs.x + 17, obs.y + 45, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(obs.x + 17, obs.y + 22, 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(obs.x + 17, obs.y + 5, 9, 0, Math.PI * 2);
        ctx.fill();
        // Eyes
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(obs.x + 13, obs.y + 3, 2, 0, Math.PI * 2);
        ctx.arc(obs.x + 21, obs.y + 3, 2, 0, Math.PI * 2);
        ctx.fill();
        // Carrot nose
        ctx.fillStyle = 'orange';
        ctx.beginPath();
        ctx.moveTo(obs.x + 17, obs.y + 7);
        ctx.lineTo(obs.x + 30, obs.y + 9);
        ctx.lineTo(obs.x + 17, obs.y + 11);
        ctx.closePath();
        ctx.fill();
        // Hat
        ctx.fillStyle = 'black';
        ctx.fillRect(obs.x + 7, obs.y - 8, 20, 5);
        ctx.fillRect(obs.x + 10, obs.y - 20, 14, 15);
    }
    else if (obs.type === 'bird') {
        // Bird body
        ctx.fillStyle = '#455a64';
        ctx.beginPath();
        ctx.ellipse(obs.x + 15, obs.y + 12, 15, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        // Wing
        ctx.fillStyle = '#37474f';
        const wingY = Math.sin(frameCount * 0.4) * 8;
        ctx.beginPath();
        ctx.ellipse(obs.x + 15, obs.y + 5 + wingY, 12, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        // Beak
        ctx.fillStyle = '#ff9800';
        ctx.beginPath();
        ctx.moveTo(obs.x + 28, obs.y + 12);
        ctx.lineTo(obs.x + 38, obs.y + 14);
        ctx.lineTo(obs.x + 28, obs.y + 16);
        ctx.closePath();
        ctx.fill();
        // Eye
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(obs.x + 22, obs.y + 10, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(obs.x + 23, obs.y + 10, 2, 0, Math.PI * 2);
        ctx.fill();
    }
    else if (obs.type === 'tree') {
        // Trunk
        ctx.fillStyle = '#5d4037';
        ctx.fillRect(obs.x + 17, obs.y + 50, 12, 20);
        // Tree layers
        ctx.fillStyle = '#2e7d32';
        ctx.beginPath();
        ctx.moveTo(obs.x + 22, obs.y);
        ctx.lineTo(obs.x + 45, obs.y + 30);
        ctx.lineTo(obs.x, obs.y + 30);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(obs.x + 22, obs.y + 15);
        ctx.lineTo(obs.x + 48, obs.y + 50);
        ctx.lineTo(obs.x - 3, obs.y + 50);
        ctx.closePath();
        ctx.fill();
        // Snow on tree
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(obs.x + 22, obs.y + 5, 5, 0, Math.PI * 2);
        ctx.fill();
        // Decorations
        ctx.fillStyle = '#f44336';
        ctx.beginPath();
        ctx.arc(obs.x + 15, obs.y + 25, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.arc(obs.x + 30, obs.y + 35, 3, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}

// Gifts (collectibles)
const gifts = [];
const giftColors = ['#f44336', '#4caf50', '#2196f3', '#9c27b0', '#ff9800'];

function createGift() {
    const gift = {
        x: canvas.width + 30,
        y: 200 + Math.random() * 80,
        width: 25,
        height: 25,
        color: giftColors[Math.floor(Math.random() * giftColors.length)],
        collected: false
    };
    gifts.push(gift);
}

function drawGift(gift) {
    ctx.save();

    // Box
    ctx.fillStyle = gift.color;
    ctx.fillRect(gift.x, gift.y, gift.width, gift.height);

    // Ribbon vertical
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(gift.x + gift.width/2 - 3, gift.y, 6, gift.height);

    // Ribbon horizontal
    ctx.fillRect(gift.x, gift.y + gift.height/2 - 3, gift.width, 6);

    // Bow
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(gift.x + gift.width/2 - 5, gift.y - 3, 5, 0, Math.PI * 2);
    ctx.arc(gift.x + gift.width/2 + 5, gift.y - 3, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

// Background elements
const snowflakes = [];
const mountains = [];
const houses = [];

function initBackground() {
    // Create snowflakes
    for (let i = 0; i < 50; i++) {
        snowflakes.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 3 + 1,
            speed: Math.random() * 2 + 1
        });
    }

    // Create mountains
    for (let i = 0; i < 3; i++) {
        mountains.push({
            x: i * 300,
            height: 80 + Math.random() * 40
        });
    }

    // Create houses
    for (let i = 0; i < 4; i++) {
        houses.push({
            x: i * 250 + 50,
            width: 40 + Math.random() * 20,
            height: 30 + Math.random() * 20
        });
    }
}

function drawBackground() {
    // Sky gradient is set in CSS

    // Moon
    ctx.fillStyle = '#fff9c4';
    ctx.beginPath();
    ctx.arc(700, 60, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0c1445';
    ctx.beginPath();
    ctx.arc(710, 55, 25, 0, Math.PI * 2);
    ctx.fill();

    // Stars
    ctx.fillStyle = 'white';
    for (let i = 0; i < 20; i++) {
        const x = (i * 47 + frameCount * 0.1) % canvas.width;
        const y = 20 + (i * 23) % 100;
        ctx.beginPath();
        ctx.arc(x, y, 1, 0, Math.PI * 2);
        ctx.fill();
    }

    // Mountains (parallax)
    mountains.forEach((m, i) => {
        const parallax = (i + 1) * 0.3;
        const x = ((m.x - frameCount * parallax) % (canvas.width + 300)) - 100;

        ctx.fillStyle = `rgba(30, 40, 80, ${0.5 + i * 0.2})`;
        ctx.beginPath();
        ctx.moveTo(x, 340);
        ctx.lineTo(x + 150, 340 - m.height);
        ctx.lineTo(x + 300, 340);
        ctx.closePath();
        ctx.fill();

        // Snow cap
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.beginPath();
        ctx.moveTo(x + 150, 340 - m.height);
        ctx.lineTo(x + 130, 340 - m.height + 20);
        ctx.lineTo(x + 170, 340 - m.height + 20);
        ctx.closePath();
        ctx.fill();
    });

    // Houses (parallax)
    houses.forEach((h, i) => {
        const x = ((h.x - frameCount * 1.5) % (canvas.width + 300)) - 50;

        // House body
        ctx.fillStyle = '#4a4a4a';
        ctx.fillRect(x, 340 - h.height, h.width, h.height);

        // Roof
        ctx.fillStyle = '#c62828';
        ctx.beginPath();
        ctx.moveTo(x - 5, 340 - h.height);
        ctx.lineTo(x + h.width/2, 340 - h.height - 20);
        ctx.lineTo(x + h.width + 5, 340 - h.height);
        ctx.closePath();
        ctx.fill();

        // Window with light
        ctx.fillStyle = '#fff59d';
        ctx.fillRect(x + h.width/2 - 6, 340 - h.height + 10, 12, 12);

        // Snow on roof
        ctx.fillStyle = 'white';
        ctx.fillRect(x - 5, 340 - h.height - 3, h.width + 10, 5);
    });

    // Ground (snow)
    ctx.fillStyle = '#e8e8e8';
    ctx.fillRect(0, 340, canvas.width, 60);

    // Snow texture
    ctx.fillStyle = 'white';
    for (let i = 0; i < canvas.width; i += 20) {
        const x = (i - frameCount * gameSpeed) % canvas.width;
        ctx.beginPath();
        ctx.arc(x < 0 ? x + canvas.width : x, 345, 8, 0, Math.PI * 2);
        ctx.fill();
    }

    // Snowflakes
    ctx.fillStyle = 'white';
    snowflakes.forEach(s => {
        s.x -= gameSpeed * 0.5;
        s.y += s.speed;

        if (s.y > canvas.height) {
            s.y = -10;
            s.x = Math.random() * canvas.width;
        }
        if (s.x < 0) s.x = canvas.width;

        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
    });
}

// Collision detection
function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

// ==================== POWER-UPS SYSTEM ====================

// Power-up state
let powerUps = [];
let activePowerUp = null; // { type, timer, maxTimer }
let powerUpSpawnTimer = 0;
let powerUpSpawnInterval = 300 + Math.floor(Math.random() * 200);
let screenFlash = null; // { color, alpha }
let originalGameSpeed = 5;

// Power-up type definitions
const POWER_UP_TYPES = {
    shield:       { name: 'Shield',       color: '#42a5f5', glowColor: 'rgba(66,165,245,',  duration: 600, icon: 'shield' },
    magnet:       { name: 'Magnet',       color: '#ab47bc', glowColor: 'rgba(171,71,188,',  duration: 480, icon: 'magnet' },
    doublePoints: { name: 'Double Points', color: '#ffd740', glowColor: 'rgba(255,215,64,', duration: 600, icon: 'x2' },
    slowMotion:   { name: 'Slow Motion',  color: '#00e5ff', glowColor: 'rgba(0,229,255,',   duration: 300, icon: 'clock' },
    superJump:    { name: 'Super Jump',   color: '#69f0ae', glowColor: 'rgba(105,240,174,', duration: 480, icon: 'arrow' }
};

// Create a random power-up
function createPowerUp() {
    const types = Object.keys(POWER_UP_TYPES);
    const type = types[Math.floor(Math.random() * types.length)];
    const def = POWER_UP_TYPES[type];

    const pu = {
        x: canvas.width + 40,
        y: 200 + Math.random() * 60,
        width: 30,
        height: 30,
        type: type,
        color: def.color,
        glowColor: def.glowColor,
        spawnFrame: frameCount,
        rotation: 0
    };
    powerUps.push(pu);
}

// Draw a single power-up with animations
function drawPowerUp(pu) {
    ctx.save();

    const age = frameCount - pu.spawnFrame;
    // Gentle bob animation (sine wave)
    const bobOffset = Math.sin(age * 0.06) * 6;
    const drawY = pu.y + bobOffset;

    // Spinning rotation
    pu.rotation = (age * 0.04) % (Math.PI * 2);

    // Outer glow / halo effect
    const pulseAlpha = 0.25 + Math.sin(age * 0.08) * 0.15;
    const pulseRadius = 24 + Math.sin(age * 0.06) * 4;

    // Halo ring
    ctx.beginPath();
    ctx.arc(pu.x + pu.width / 2, drawY + pu.height / 2, pulseRadius, 0, Math.PI * 2);
    ctx.strokeStyle = pu.glowColor + pulseAlpha + ')';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Soft glow
    const gradient = ctx.createRadialGradient(
        pu.x + pu.width / 2, drawY + pu.height / 2, 5,
        pu.x + pu.width / 2, drawY + pu.height / 2, pulseRadius + 4
    );
    gradient.addColorStop(0, pu.glowColor + '0.35)');
    gradient.addColorStop(1, pu.glowColor + '0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(pu.x + pu.width / 2, drawY + pu.height / 2, pulseRadius + 4, 0, Math.PI * 2);
    ctx.fill();

    // Translate + rotate for the icon
    ctx.translate(pu.x + pu.width / 2, drawY + pu.height / 2);
    ctx.rotate(pu.rotation);

    // Draw distinct icon shape per type
    drawPowerUpIcon(pu.type, pu.color);

    ctx.restore();
}

// Draw the icon shape centered at (0,0)
function drawPowerUpIcon(type, color) {
    ctx.fillStyle = color;
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 1.5;

    switch (type) {
        case 'shield':
            // Shield shape
            ctx.beginPath();
            ctx.moveTo(0, -13);
            ctx.bezierCurveTo(-14, -11, -14, 0, -12, 6);
            ctx.bezierCurveTo(-10, 11, -2, 15, 0, 16);
            ctx.bezierCurveTo(2, 15, 10, 11, 12, 6);
            ctx.bezierCurveTo(14, 0, 14, -11, 0, -13);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            // Inner shine
            ctx.fillStyle = 'rgba(255,255,255,0.35)';
            ctx.beginPath();
            ctx.moveTo(0, -10);
            ctx.bezierCurveTo(-9, -8, -9, -1, -8, 3);
            ctx.lineTo(0, -2);
            ctx.lineTo(0, -10);
            ctx.closePath();
            ctx.fill();
            // Star emblem
            ctx.fillStyle = 'white';
            ctx.beginPath();
            drawStar(0, 2, 4, 2, 5);
            ctx.fill();
            break;

        case 'magnet':
            // U-shaped magnet
            ctx.lineWidth = 4;
            ctx.lineCap = 'round';
            // Left arm (red tip)
            ctx.strokeStyle = '#f44336';
            ctx.beginPath();
            ctx.moveTo(-8, -10);
            ctx.lineTo(-8, 2);
            ctx.stroke();
            // Right arm (blue tip)
            ctx.strokeStyle = '#2196f3';
            ctx.beginPath();
            ctx.moveTo(8, -10);
            ctx.lineTo(8, 2);
            ctx.stroke();
            // U curve at bottom
            ctx.strokeStyle = color;
            ctx.beginPath();
            ctx.arc(0, 2, 8, 0, Math.PI);
            ctx.stroke();
            // Magnetic field lines
            ctx.strokeStyle = 'rgba(171,71,188,0.5)';
            ctx.lineWidth = 1;
            for (let i = 1; i <= 3; i++) {
                ctx.beginPath();
                ctx.arc(0, 2, 8 + i * 3, -0.2, Math.PI + 0.2);
                ctx.stroke();
            }
            break;

        case 'doublePoints':
            // Gold coin with x2
            ctx.beginPath();
            ctx.arc(0, 0, 13, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            // Inner ring
            ctx.strokeStyle = 'rgba(255,255,255,0.5)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(0, 0, 10, 0, Math.PI * 2);
            ctx.stroke();
            // x2 text
            ctx.fillStyle = '#5d4037';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('x2', 0, 1);
            break;

        case 'slowMotion':
            // Clock/stopwatch shape
            ctx.beginPath();
            ctx.arc(0, 1, 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            // Clock face
            ctx.fillStyle = 'rgba(0,0,0,0.25)';
            ctx.beginPath();
            ctx.arc(0, 1, 9, 0, Math.PI * 2);
            ctx.fill();
            // Hour hand
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, 1);
            ctx.lineTo(-3, -4);
            ctx.stroke();
            // Minute hand
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(0, 1);
            ctx.lineTo(5, -1);
            ctx.stroke();
            // Top button
            ctx.fillStyle = color;
            ctx.fillRect(-2, -14, 4, 4);
            // Tick marks
            ctx.strokeStyle = 'rgba(255,255,255,0.6)';
            ctx.lineWidth = 1;
            for (let i = 0; i < 12; i++) {
                const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
                ctx.beginPath();
                ctx.moveTo(Math.cos(angle) * 7 + 0, Math.sin(angle) * 7 + 1);
                ctx.lineTo(Math.cos(angle) * 9 + 0, Math.sin(angle) * 9 + 1);
                ctx.stroke();
            }
            break;

        case 'superJump':
            // Upward arrow / spring shape
            // Arrow body
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(0, -14);
            ctx.lineTo(-10, -2);
            ctx.lineTo(-5, -2);
            ctx.lineTo(-5, 12);
            ctx.lineTo(5, 12);
            ctx.lineTo(5, -2);
            ctx.lineTo(10, -2);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            // Spring coils at bottom
            ctx.strokeStyle = '#2e7d32';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-6, 12);
            ctx.bezierCurveTo(-6, 14, 6, 14, 6, 12);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(-5, 14);
            ctx.bezierCurveTo(-5, 16, 5, 16, 5, 14);
            ctx.stroke();
            break;
    }
}

// Helper: draw a star at (cx, cy) with outer/inner radius and n points
function drawStar(cx, cy, outerR, innerR, points) {
    let angle = -Math.PI / 2;
    const step = Math.PI / points;
    ctx.moveTo(cx + outerR * Math.cos(angle), cy + outerR * Math.sin(angle));
    for (let i = 0; i < points; i++) {
        ctx.lineTo(cx + outerR * Math.cos(angle), cy + outerR * Math.sin(angle));
        angle += step;
        ctx.lineTo(cx + innerR * Math.cos(angle), cy + innerR * Math.sin(angle));
        angle += step;
    }
    ctx.closePath();
}

// Update power-ups: move, spawn, and check collection
function updatePowerUps() {
    // Spawn timer
    powerUpSpawnTimer++;
    if (powerUpSpawnTimer >= powerUpSpawnInterval && powerUps.length === 0) {
        createPowerUp();
        powerUpSpawnTimer = 0;
        powerUpSpawnInterval = 300 + Math.floor(Math.random() * 200);
    }

    // Move and check collection
    for (let i = powerUps.length - 1; i >= 0; i--) {
        const pu = powerUps[i];
        pu.x -= gameSpeed;

        // Check collection with Santa
        const santaHitbox = santa.getHitbox();
        const puHitbox = {
            x: pu.x,
            y: pu.y + Math.sin((frameCount - pu.spawnFrame) * 0.06) * 6,
            width: pu.width,
            height: pu.height
        };

        if (checkCollision(santaHitbox, puHitbox)) {
            collectPowerUp(pu);
            powerUps.splice(i, 1);
            continue;
        }

        // Remove if off-screen
        if (pu.x + pu.width < -20) {
            powerUps.splice(i, 1);
        }
    }
}

// Activate a power-up effect
function collectPowerUp(pu) {
    const def = POWER_UP_TYPES[pu.type];

    // If slow motion is currently active and we're collecting a new one, restore speed first
    if (activePowerUp && activePowerUp.type === 'slowMotion') {
        gameSpeed = originalGameSpeed;
    }

    // Set the active power-up
    activePowerUp = {
        type: pu.type,
        timer: def.duration,
        maxTimer: def.duration,
        color: def.color,
        glowColor: def.glowColor,
        name: def.name
    };

    // Apply immediate effects
    if (pu.type === 'slowMotion') {
        originalGameSpeed = gameSpeed;
        gameSpeed *= 0.6;
    }

    // Screen flash effect
    screenFlash = { color: def.color, alpha: 0.4 };

    // Power-up collection particle burst
    emitPowerUpBurst(
        pu.x + pu.width / 2,
        pu.y + pu.height / 2,
        def.color
    );
    addFloatingText(def.name + '!', pu.x + pu.width / 2, pu.y - 15, def.color, 18);
}

// Tick active power-up timer and apply ongoing effects
function updateActivePowerUp() {
    if (!activePowerUp) return;

    activePowerUp.timer--;

    // When timer expires
    if (activePowerUp.timer <= 0) {
        // Undo slow motion
        if (activePowerUp.type === 'slowMotion') {
            gameSpeed = originalGameSpeed;
        }
        activePowerUp = null;
    }

    // Update screen flash
    if (screenFlash) {
        screenFlash.alpha -= 0.02;
        if (screenFlash.alpha <= 0) {
            screenFlash = null;
        }
    }

    // Magnet: attract nearby gifts
    if (activePowerUp && activePowerUp.type === 'magnet') {
        const magnetR = getMagnetRadius();
        const santaCX = santa.x + santa.width / 2;
        const santaCY = santa.y + santa.height / 2;

        for (let i = 0; i < gifts.length; i++) {
            const gift = gifts[i];
            if (gift.collected) continue;

            const giftCX = gift.x + gift.width / 2;
            const giftCY = gift.y + gift.height / 2;
            const dx = santaCX - giftCX;
            const dy = santaCY - giftCY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < magnetR && dist > 0) {
                const strength = (1 - dist / magnetR) * 6;
                gift.x += (dx / dist) * strength;
                gift.y += (dy / dist) * strength;
            }
        }
    }
}

// Draw the timer bar and icon for the active power-up (HUD)
function drawPowerUpHUD() {
    if (!activePowerUp) return;

    ctx.save();

    const barWidth = 160;
    const barHeight = 10;
    const barX = canvas.width / 2 - barWidth / 2;
    const barY = 8;
    const progress = activePowerUp.timer / activePowerUp.maxTimer;

    // Background bar
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.roundRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4, 6);
    ctx.fill();

    // Progress bar
    const barGradient = ctx.createLinearGradient(barX, barY, barX + barWidth * progress, barY);
    barGradient.addColorStop(0, activePowerUp.color);
    barGradient.addColorStop(1, 'white');
    ctx.fillStyle = barGradient;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barWidth * progress, barHeight, 4);
    ctx.fill();

    // Bar border
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4, 6);
    ctx.stroke();

    // Icon to the left of bar
    const iconX = barX - 22;
    const iconY = barY + barHeight / 2;
    ctx.translate(iconX, iconY);
    ctx.scale(0.7, 0.7);
    drawPowerUpIcon(activePowerUp.type, activePowerUp.color);
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Power-up name text to the right
    ctx.fillStyle = activePowerUp.color;
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(activePowerUp.name, barX + barWidth + 8, barY + barHeight / 2 + 1);

    // Flashing warning when about to expire (last 20%)
    if (progress < 0.2) {
        const blink = Math.sin(frameCount * 0.3) > 0;
        if (blink) {
            ctx.fillStyle = 'rgba(255, 0, 0, 0.15)';
            ctx.beginPath();
            ctx.roundRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4, 6);
            ctx.fill();
        }
    }

    ctx.restore();
}

// Draw visual effects on Santa based on active power-up
function drawPowerUpEffect() {
    if (!activePowerUp) return;

    ctx.save();

    const santaCX = santa.x + santa.width / 2 - 5;
    const santaCY = santa.sliding ? santa.y + 45 : santa.y + santa.height / 2;
    const pulse = Math.sin(frameCount * 0.1) * 0.15 + 0.5;

    switch (activePowerUp.type) {
        case 'shield': {
            // Blue glowing aura around Santa
            const shieldR = 38 + Math.sin(frameCount * 0.08) * 3;
            // Outer glow
            const grad = ctx.createRadialGradient(santaCX, santaCY, shieldR - 10, santaCX, santaCY, shieldR + 5);
            grad.addColorStop(0, 'rgba(66, 165, 245, 0)');
            grad.addColorStop(0.6, 'rgba(66, 165, 245, ' + (pulse * 0.35) + ')');
            grad.addColorStop(1, 'rgba(66, 165, 245, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(santaCX, santaCY, shieldR + 5, 0, Math.PI * 2);
            ctx.fill();
            // Shield border ring
            ctx.strokeStyle = 'rgba(66, 165, 245, ' + (pulse * 0.7) + ')';
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 4]);
            ctx.lineDashOffset = -frameCount * 2;
            ctx.beginPath();
            ctx.arc(santaCX, santaCY, shieldR, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            // Sparkles
            for (let i = 0; i < 4; i++) {
                const angle = (frameCount * 0.03) + (i * Math.PI / 2);
                const sx = santaCX + Math.cos(angle) * shieldR;
                const sy = santaCY + Math.sin(angle) * shieldR;
                ctx.fillStyle = 'rgba(255, 255, 255, ' + (0.5 + Math.sin(frameCount * 0.2 + i) * 0.3) + ')';
                ctx.beginPath();
                ctx.arc(sx, sy, 2, 0, Math.PI * 2);
                ctx.fill();
            }
            break;
        }

        case 'magnet': {
            // Purple magnetic field lines radiating outward
            const magnetR = getMagnetRadius();
            ctx.strokeStyle = 'rgba(171, 71, 188, 0.12)';
            ctx.lineWidth = 1;
            // Concentric field rings
            for (let r = 40; r <= magnetR; r += 25) {
                const ringAlpha = 0.08 + Math.sin(frameCount * 0.05 + r * 0.02) * 0.06;
                ctx.strokeStyle = 'rgba(171, 71, 188, ' + ringAlpha + ')';
                ctx.setLineDash([8, 12]);
                ctx.lineDashOffset = -frameCount * 3;
                ctx.beginPath();
                ctx.arc(santaCX, santaCY, r, 0, Math.PI * 2);
                ctx.stroke();
            }
            ctx.setLineDash([]);
            // Radial field lines
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2 + frameCount * 0.02;
                const lineAlpha = 0.15 + Math.sin(frameCount * 0.08 + i) * 0.1;
                ctx.strokeStyle = 'rgba(171, 71, 188, ' + lineAlpha + ')';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(santaCX + Math.cos(angle) * 25, santaCY + Math.sin(angle) * 25);
                ctx.lineTo(santaCX + Math.cos(angle) * (50 + Math.sin(frameCount * 0.06 + i) * 15), santaCY + Math.sin(angle) * (50 + Math.sin(frameCount * 0.06 + i) * 15));
                ctx.stroke();
            }
            // Inner glow
            const magGrad = ctx.createRadialGradient(santaCX, santaCY, 0, santaCX, santaCY, 30);
            magGrad.addColorStop(0, 'rgba(171, 71, 188, ' + pulse * 0.2 + ')');
            magGrad.addColorStop(1, 'rgba(171, 71, 188, 0)');
            ctx.fillStyle = magGrad;
            ctx.beginPath();
            ctx.arc(santaCX, santaCY, 30, 0, Math.PI * 2);
            ctx.fill();
            break;
        }

        case 'doublePoints': {
            // Golden glow around Santa
            const goldGrad = ctx.createRadialGradient(santaCX, santaCY, 10, santaCX, santaCY, 40);
            goldGrad.addColorStop(0, 'rgba(255, 215, 64, ' + pulse * 0.25 + ')');
            goldGrad.addColorStop(1, 'rgba(255, 215, 64, 0)');
            ctx.fillStyle = goldGrad;
            ctx.beginPath();
            ctx.arc(santaCX, santaCY, 40, 0, Math.PI * 2);
            ctx.fill();
            // Floating x2 indicator above Santa
            const floatY = santa.y - 20 + Math.sin(frameCount * 0.08) * 4;
            ctx.fillStyle = '#ffd740';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = '#ffd740';
            ctx.shadowBlur = 8;
            ctx.fillText('x2', santaCX, floatY);
            ctx.shadowBlur = 0;
            // Gold sparkles
            for (let i = 0; i < 5; i++) {
                const angle = (frameCount * 0.04) + (i * Math.PI * 2 / 5);
                const sparkR = 30 + Math.sin(frameCount * 0.1 + i * 2) * 8;
                const sx = santaCX + Math.cos(angle) * sparkR;
                const sy = santaCY + Math.sin(angle) * sparkR;
                const sparkAlpha = 0.4 + Math.sin(frameCount * 0.15 + i) * 0.3;
                ctx.fillStyle = 'rgba(255, 215, 64, ' + sparkAlpha + ')';
                ctx.beginPath();
                ctx.arc(sx, sy, 2, 0, Math.PI * 2);
                ctx.fill();
            }
            break;
        }

        case 'slowMotion': {
            // Cyan time-warp effect
            // Warping rings
            for (let i = 0; i < 3; i++) {
                const warpR = 25 + i * 12 + Math.sin(frameCount * 0.04 + i) * 5;
                const warpAlpha = 0.12 - i * 0.03;
                ctx.strokeStyle = 'rgba(0, 229, 255, ' + warpAlpha + ')';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.ellipse(santaCX, santaCY, warpR, warpR * 0.6, frameCount * 0.02, 0, Math.PI * 2);
                ctx.stroke();
            }
            // Inner cyan glow
            const cyanGrad = ctx.createRadialGradient(santaCX, santaCY, 5, santaCX, santaCY, 35);
            cyanGrad.addColorStop(0, 'rgba(0, 229, 255, ' + pulse * 0.2 + ')');
            cyanGrad.addColorStop(1, 'rgba(0, 229, 255, 0)');
            ctx.fillStyle = cyanGrad;
            ctx.beginPath();
            ctx.arc(santaCX, santaCY, 35, 0, Math.PI * 2);
            ctx.fill();
            // Clock hands effect near Santa
            ctx.strokeStyle = 'rgba(0, 229, 255, 0.3)';
            ctx.lineWidth = 1.5;
            const handAngle = frameCount * 0.05;
            ctx.beginPath();
            ctx.moveTo(santaCX, santaCY);
            ctx.lineTo(santaCX + Math.cos(handAngle) * 18, santaCY + Math.sin(handAngle) * 18);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(santaCX, santaCY);
            ctx.lineTo(santaCX + Math.cos(handAngle * 0.3) * 12, santaCY + Math.sin(handAngle * 0.3) * 12);
            ctx.stroke();
            break;
        }

        case 'superJump': {
            // Green trail on jumps
            const greenGrad = ctx.createRadialGradient(santaCX, santaCY, 5, santaCX, santaCY, 35);
            greenGrad.addColorStop(0, 'rgba(105, 240, 174, ' + pulse * 0.2 + ')');
            greenGrad.addColorStop(1, 'rgba(105, 240, 174, 0)');
            ctx.fillStyle = greenGrad;
            ctx.beginPath();
            ctx.arc(santaCX, santaCY, 35, 0, Math.PI * 2);
            ctx.fill();

            // Green trail particles when jumping
            if (santa.jumping || santa.velocityY < 0) {
                for (let i = 0; i < 5; i++) {
                    const trailY = santaCY + santa.height / 2 + i * 8;
                    const trailAlpha = 0.4 - i * 0.08;
                    const trailSize = 4 - i * 0.6;
                    const trailX = santaCX + Math.sin(frameCount * 0.15 + i * 1.5) * 6;
                    ctx.fillStyle = 'rgba(105, 240, 174, ' + Math.max(0, trailAlpha) + ')';
                    ctx.beginPath();
                    ctx.arc(trailX, trailY, Math.max(1, trailSize), 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            // Upward arrows
            for (let i = 0; i < 3; i++) {
                const arrowY = santa.y - 10 - ((frameCount * 1.5 + i * 20) % 40);
                const arrowAlpha = 0.4 - ((frameCount * 1.5 + i * 20) % 40) / 100;
                if (arrowAlpha > 0) {
                    ctx.fillStyle = 'rgba(105, 240, 174, ' + arrowAlpha + ')';
                    ctx.beginPath();
                    ctx.moveTo(santaCX + (i - 1) * 15, arrowY);
                    ctx.lineTo(santaCX + (i - 1) * 15 - 3, arrowY + 6);
                    ctx.lineTo(santaCX + (i - 1) * 15 + 3, arrowY + 6);
                    ctx.closePath();
                    ctx.fill();
                }
            }
            break;
        }
    }

    ctx.restore();
}

// Draw the screen flash effect
function drawScreenFlash() {
    if (!screenFlash) return;

    ctx.save();
    ctx.fillStyle = screenFlash.color;
    ctx.globalAlpha = screenFlash.alpha;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
}

// Query functions for game integration
function getPowerUpMultiplier() {
    return (activePowerUp && activePowerUp.type === 'doublePoints') ? 2 : 1;
}

function hasShield() {
    return activePowerUp && activePowerUp.type === 'shield';
}

function consumeShield() {
    if (hasShield()) {
        // Flash white briefly
        screenFlash = { color: '#42a5f5', alpha: 0.5 };
        activePowerUp = null;
    }
}

function getMagnetRadius() {
    return (activePowerUp && activePowerUp.type === 'magnet') ? 150 : 0;
}

function getJumpMultiplier() {
    return (activePowerUp && activePowerUp.type === 'superJump') ? 1.5 : 1;
}

function getSpeedMultiplier() {
    return (activePowerUp && activePowerUp.type === 'slowMotion') ? 0.6 : 1;
}

// Reset all power-up state (called on game restart)
function resetPowerUps() {
    powerUps.length = 0;
    activePowerUp = null;
    screenFlash = null;
    powerUpSpawnTimer = 0;
    powerUpSpawnInterval = 300 + Math.floor(Math.random() * 200);
}

// ==================== END POWER-UPS SYSTEM ====================

// Track landing state for landing particles
let wasJumping = false;
let comboMax = 0;
let hitObstacle = false;
let noHitDistance = 0;
let bossesDefeated = 0;

// ==================== FULLY INTEGRATED GAME LOOP ====================

function gameLoop() {
    // Handle pause
    if (isPaused && isPaused()) {
        drawPauseMenu(ctx, score, distance, giftsCollected);
        requestAnimationFrame(gameLoop);
        return;
    }

    // Game over animation loop
    if (gameState === 'gameover') {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawBackground();
        drawBackgroundEffects();

        // Draw remaining game elements frozen
        for (let i = 0; i < obstacles.length; i++) drawObstacle(obstacles[i]);
        for (let i = 0; i < gifts.length; i++) { if (!gifts[i].collected) drawGift(gifts[i]); }
        santa.draw();
        drawForegroundEffects();
        updateAllEffects();

        // Advanced enemies draw
        if (window.AdvancedEnemies) AdvancedEnemies.drawAdvancedEnemies();

        // Game over overlay
        if (updateGameOverAnimation) updateGameOverAnimation();
        const isNewRecord = score >= highScore && score > 0;
        const currentLevel = getCurrentLevel ? getCurrentLevel() : 1;
        if (drawGameOverScreen) drawGameOverScreen(ctx, score, distance, giftsCollected, currentLevel, isNewRecord, frameCount);

        frameCount++;
        requestAnimationFrame(gameLoop);
        return;
    }

    if (gameState !== 'playing') return;

    frameCount++;

    // Update all visual effects systems
    updateAllEffects();

    // Update combo system
    if (updateCombo) updateCombo();

    // Check level transitions
    if (checkLevelTransition) checkLevelTransition(distance);

    // Update achievements
    if (updateAchievements) updateAchievements();

    // Check achievements
    if (checkAchievements) {
        checkAchievements({
            distance: distance,
            gifts: giftsCollected,
            gameSpeed: gameSpeed,
            comboMax: comboMax,
            bossDefeated: bossesDefeated > 0,
            hitObstacle: hitObstacle
        });
    }

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply screen shake via canvas transform
    const shake = getShakeOffset();
    ctx.save();
    ctx.translate(shake.x, shake.y);

    // Draw level-based background (or fallback to original)
    if (drawLevelBackground && getLevelConfig) {
        drawLevelBackground(ctx, getLevelConfig(distance), frameCount, gameSpeed);
    } else {
        drawBackground();
    }

    // Draw background-layer effects (aurora, weather snowstorm)
    drawBackgroundEffects();

    // Update and draw advanced enemies (wave system, boss, new obstacles)
    if (window.AdvancedEnemies) {
        const advResult = AdvancedEnemies.updateAdvancedEnemies();
        if (advResult === 'death') {
            if (hasShield()) {
                consumeShield();
                applyScreenShake(4, 10);
            } else {
                hitObstacle = true;
                noHitDistance = 0;
                gameOver();
                ctx.restore();
                requestAnimationFrame(gameLoop);
                return;
            }
        }
        AdvancedEnemies.drawAdvancedEnemies();

        // Track boss defeats for achievements
        if (AdvancedEnemies.getBossDefeatedTimer && AdvancedEnemies.getBossDefeatedTimer() === 179) {
            bossesDefeated++;
        }
    }

    // Update and draw standard obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obs = obstacles[i];
        obs.x -= gameSpeed;

        drawObstacle(obs);

        // Check collision
        if (checkCollision(santa.getHitbox(), obs)) {
            if (hasShield()) {
                consumeShield();
                applyScreenShake(4, 10);
                obstacles.splice(i, 1);
                continue;
            }
            hitObstacle = true;
            noHitDistance = 0;
            gameOver();
            ctx.restore();
            requestAnimationFrame(gameLoop);
            return;
        }

        // Score for passing obstacle
        if (!obs.passed && obs.x + obs.width < santa.x) {
            obs.passed = true;
            const comboMult = getComboMultiplier ? getComboMultiplier() : 1;
            const points = 10 * getPowerUpMultiplier() * comboMult;
            score += points;
            addFloatingText('+' + points, obs.x + obs.width / 2, obs.y - 10, '#ffffff');
            noHitDistance += 1;
        }

        // Remove off-screen
        if (obs.x + obs.width < 0) {
            obstacles.splice(i, 1);
        }
    }

    // Magnet effect: attract gifts toward Santa
    const magnetRadius = getMagnetRadius();
    if (magnetRadius > 0) {
        for (let i = 0; i < gifts.length; i++) {
            const gift = gifts[i];
            if (gift.collected) continue;
            const dx = santa.x + santa.width / 2 - (gift.x + gift.width / 2);
            const dy = santa.y + santa.height / 2 - (gift.y + gift.height / 2);
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < magnetRadius && dist > 0) {
                const force = (1 - dist / magnetRadius) * 4;
                gift.x += (dx / dist) * force;
                gift.y += (dy / dist) * force;
            }
        }
    }

    // Update and draw gifts
    for (let i = gifts.length - 1; i >= 0; i--) {
        const gift = gifts[i];
        gift.x -= gameSpeed;

        if (!gift.collected) {
            drawGift(gift);

            // Check collection
            if (checkCollision(santa.getHitbox(), gift)) {
                gift.collected = true;
                giftsCollected++;

                // Combo system
                let comboMult = 1;
                if (addComboHit) {
                    comboMult = addComboHit();
                    if (comboMult > comboMax) comboMax = comboMult;
                }

                const points = 25 * getPowerUpMultiplier() * comboMult;
                score += points;

                // Gift collection visual effects
                emitGiftSparkles(gift.x + gift.width / 2, gift.y + gift.height / 2);
                addFloatingText('+' + points, gift.x + gift.width / 2, gift.y - 10, '#ffd700', 24);
            }
        }

        // Remove off-screen
        if (gift.x + gift.width < 0) {
            gifts.splice(i, 1);
        }
    }

    // Detect landing (was jumping, now on ground)
    const wasInAir = wasJumping;

    // Update and draw santa
    santa.update();
    santa.draw();

    // Landing detection: was in air, now on ground
    if (wasInAir && !santa.jumping && santa.y >= santa.groundY) {
        emitLandingParticles(santa);
        applyScreenShake(3, 8);
    }
    wasJumping = santa.jumping;

    // Emit continuous particle effects
    if (frameCount % 3 === 0) {
        emitSnowTrail(santa);
    }
    if (santa.sliding) {
        emitSlideSparks(santa);
    }

    // Power-ups: draw effect on Santa
    drawPowerUpEffect();

    // Power-ups: update and draw power-up items on screen
    updatePowerUps();
    for (let i = 0; i < powerUps.length; i++) {
        drawPowerUp(powerUps[i]);
    }

    // Power-ups: tick active power-up timer and effects
    updateActivePowerUp();

    // Draw foreground visual effects (trail, particles, floating text)
    drawForegroundEffects();

    // Draw combo indicator
    if (drawCombo) drawCombo(ctx, frameCount);

    // Draw level transition animation
    if (drawLevelTransition) drawLevelTransition(ctx);

    // Draw achievement banners
    if (drawAchievementBanner) drawAchievementBanner(ctx, frameCount);

    // Power-ups: draw HUD (timer bar) and screen flash
    drawPowerUpHUD();
    drawScreenFlash();

    // Restore canvas transform (screen shake)
    ctx.restore();

    // Draw canvas-based HUD (on top of everything, outside shake)
    if (drawHUD) {
        const comboState = window.ComboSystem ? ComboSystem.getState() : null;
        const levelConfig = getLevelConfig ? getLevelConfig(distance) : null;
        const puTimer = activePowerUp ? activePowerUp.timer / activePowerUp.maxTimer : 0;
        drawHUD(ctx, score, distance, giftsCollected, comboState, levelConfig, frameCount, puTimer);
    }

    // Spawn obstacles (wave system handles all spawning when loaded)
    if (!window.AdvancedEnemies) {
        if (frameCount % Math.max(60, 120 - Math.floor(distance / 100)) === 0) {
            createObstacle();
        }
        if (frameCount % 90 === 0) {
            createGift();
        }
    }

    // Update distance and speed
    distance += gameSpeed / 10;
    noHitDistance += gameSpeed / 10;
    if (frameCount % 500 === 0 && gameSpeed < 12) {
        gameSpeed += 0.5;
        if (!activePowerUp || activePowerUp.type !== 'slowMotion') {
            originalGameSpeed = gameSpeed;
        } else {
            originalGameSpeed += 0.5;
        }
    }

    requestAnimationFrame(gameLoop);
}

// ==================== START GAME ====================

function startGame() {
    gameState = 'playing';
    score = 0;
    distance = 0;
    giftsCollected = 0;
    gameSpeed = 5;
    originalGameSpeed = 5;
    frameCount = 0;
    obstacles.length = 0;
    gifts.length = 0;
    comboMax = 0;
    hitObstacle = false;
    noHitDistance = 0;
    bossesDefeated = 0;

    // Reset all subsystems
    resetPowerUps();
    resetEffects();
    if (window.AdvancedEnemies) AdvancedEnemies.resetAdvancedEnemies();
    if (resetUIState) resetUIState();
    wasJumping = false;

    santa.y = santa.groundY;
    santa.velocityY = 0;
    santa.jumping = false;
    santa.sliding = false;

    document.getElementById('menu').classList.add('hidden');
    document.getElementById('game-over').classList.add('hidden');
    document.getElementById('game-ui').classList.add('hidden');

    initBackground();
    gameLoop();
}

// ==================== GAME OVER ====================

function gameOver() {
    gameState = 'gameover';

    // Death visual effects
    emitDeathExplosion(santa);
    applyScreenShake(10, 20);

    // Restore game speed if slow motion was active
    if (activePowerUp && activePowerUp.type === 'slowMotion') {
        gameSpeed = originalGameSpeed;
    }
    resetPowerUps();

    // Update high score
    const isNewRecord = score > highScore;
    if (isNewRecord) {
        highScore = score;
        localStorage.setItem('santaHighScore', highScore);
        document.getElementById('best-score').textContent = highScore;
    }

    // Hide HTML game over (we use canvas-based one now)
    document.getElementById('game-over').classList.add('hidden');
}

// ==================== CONTROLS ====================

document.addEventListener('keydown', (e) => {
    // Pause toggle
    if ((e.code === 'Escape' || e.code === 'KeyP') && gameState === 'playing') {
        e.preventDefault();
        if (togglePause) togglePause();
        return;
    }

    // Resume from pause
    if (isPaused && isPaused()) {
        if (e.code === 'ArrowUp' || e.code === 'ArrowDown') {
            e.preventDefault();
            if (window.PauseSystem) {
                const opt = PauseSystem.getSelectedOption();
                PauseSystem.setSelectedOption(opt === 0 ? 1 : 0);
            }
        }
        if (e.code === 'Enter' || e.code === 'Space') {
            e.preventDefault();
            if (window.PauseSystem) {
                const opt = PauseSystem.getSelectedOption();
                if (opt === 0) { togglePause(); }
                else { togglePause(); gameState = 'menu'; document.getElementById('menu').classList.remove('hidden'); }
            }
        }
        return;
    }

    // Game over restart
    if (gameState === 'gameover') {
        if (e.code === 'Space' || e.code === 'Enter') {
            e.preventDefault();
            startGame();
        }
        return;
    }

    if (gameState === 'playing') {
        if (e.code === 'Space' || e.code === 'ArrowUp') {
            e.preventDefault();
            santa.jump();
        }
        if (e.code === 'ArrowDown') {
            e.preventDefault();
            santa.slide();
        }
    }
});

canvas.addEventListener('click', () => {
    if (gameState === 'gameover') {
        startGame();
        return;
    }
    if (gameState === 'playing') {
        santa.jump();
    }
});

// Touch controls for mobile
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (gameState === 'gameover') {
        startGame();
        return;
    }
    if (gameState === 'playing') {
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        const y = touch.clientY - rect.top;

        if (y > canvas.height / 2) {
            santa.slide();
        } else {
            santa.jump();
        }
    }
});

// Buttons
document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('restart-btn').addEventListener('click', startGame);

// Initialize
initBackground();
console.log('🎅 Santa Speed Runner v2.0 loaded! Press Play to start.');
