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
            this.velocityY = -15;
            this.jumping = true;
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
                x: this.x,
                y: this.y + 30,
                width: this.width - 10,
                height: 30
            };
        }
        return {
            x: this.x,
            y: this.y,
            width: this.width - 10,
            height: this.height
        };
    }
};

// Obstacles
const obstacles = [];
const obstacleTypes = [
    { type: 'chimney', width: 40, height: 60, color: '#5d4037', needJump: true },
    { type: 'snowman', width: 35, height: 55, color: 'white', needJump: true },
    { type: 'bird', width: 30, height: 25, color: '#37474f', needSlide: true, flying: true },
    { type: 'tree', width: 45, height: 70, color: '#2e7d32', needJump: true }
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

// Game loop
function gameLoop() {
    if (gameState !== 'playing') return;

    frameCount++;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background
    drawBackground();

    // Update and draw obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obs = obstacles[i];
        obs.x -= gameSpeed;

        drawObstacle(obs);

        // Check collision
        if (checkCollision(santa.getHitbox(), obs)) {
            gameOver();
            return;
        }

        // Score for passing obstacle
        if (!obs.passed && obs.x + obs.width < santa.x) {
            obs.passed = true;
            score += 10;
        }

        // Remove off-screen
        if (obs.x + obs.width < 0) {
            obstacles.splice(i, 1);
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
                score += 25;
            }
        }

        // Remove off-screen
        if (gift.x + gift.width < 0) {
            gifts.splice(i, 1);
        }
    }

    // Update and draw santa
    santa.update();
    santa.draw();

    // Spawn obstacles
    if (frameCount % Math.max(60, 120 - Math.floor(distance / 100)) === 0) {
        createObstacle();
    }

    // Spawn gifts
    if (frameCount % 90 === 0) {
        createGift();
    }

    // Update distance and speed
    distance += gameSpeed / 10;
    if (frameCount % 500 === 0 && gameSpeed < 12) {
        gameSpeed += 0.5;
    }

    // Update UI
    document.getElementById('score').textContent = score;
    document.getElementById('distance').textContent = Math.floor(distance);
    document.getElementById('gifts').textContent = giftsCollected;

    requestAnimationFrame(gameLoop);
}

function startGame() {
    gameState = 'playing';
    score = 0;
    distance = 0;
    giftsCollected = 0;
    gameSpeed = 5;
    frameCount = 0;
    obstacles.length = 0;
    gifts.length = 0;

    santa.y = santa.groundY;
    santa.velocityY = 0;
    santa.jumping = false;
    santa.sliding = false;

    document.getElementById('menu').classList.add('hidden');
    document.getElementById('game-over').classList.add('hidden');
    document.getElementById('game-ui').classList.remove('hidden');

    initBackground();
    gameLoop();
}

function gameOver() {
    gameState = 'gameover';

    // Update high score
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('santaHighScore', highScore);
        document.getElementById('best-score').textContent = highScore;
    }

    document.getElementById('final-score').textContent = score;
    document.getElementById('final-distance').textContent = Math.floor(distance);
    document.getElementById('final-gifts').textContent = giftsCollected;
    document.getElementById('game-over').classList.remove('hidden');
}

// Controls
document.addEventListener('keydown', (e) => {
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
    if (gameState === 'playing') {
        santa.jump();
    }
});

// Touch controls for mobile
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
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
console.log('🎅 Santa Speed Runner loaded! Press Play to start.');
