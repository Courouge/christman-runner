// ==================== PARTICLE SYSTEM & VISUAL EFFECTS ====================

// ---------------------------------------------------------------------------
// 1. PARTICLE SYSTEM with Object Pooling
// ---------------------------------------------------------------------------

const MAX_PARTICLES = 500;

class ParticleSystem {
    constructor(maxParticles) {
        this.pool = new Array(maxParticles);
        this.activeCount = 0;
        this.maxParticles = maxParticles;

        // Pre-allocate all particle objects (object pooling)
        for (let i = 0; i < maxParticles; i++) {
            this.pool[i] = {
                active: false,
                x: 0,
                y: 0,
                vx: 0,
                vy: 0,
                life: 0,
                maxLife: 0,
                size: 0,
                color: '#ffffff',
                alpha: 1,
                gravity: 0,
                friction: 1,
                shape: 'circle', // 'circle', 'square', 'star', 'spark'
                rotation: 0,
                rotationSpeed: 0,
                shrink: true,    // whether particle shrinks over lifetime
                glow: false
            };
        }
    }

    // Acquire a particle from the pool
    acquire() {
        if (this.activeCount >= this.maxParticles) {
            // Recycle the oldest active particle
            for (let i = 0; i < this.maxParticles; i++) {
                if (this.pool[i].active) {
                    this.pool[i].active = false;
                    this.activeCount--;
                    break;
                }
            }
        }

        for (let i = 0; i < this.maxParticles; i++) {
            if (!this.pool[i].active) {
                this.pool[i].active = true;
                this.activeCount++;
                return this.pool[i];
            }
        }
        return null;
    }

    update() {
        for (let i = 0; i < this.maxParticles; i++) {
            const p = this.pool[i];
            if (!p.active) continue;

            p.life--;

            if (p.life <= 0) {
                p.active = false;
                this.activeCount--;
                continue;
            }

            // Physics
            p.vy += p.gravity;
            p.vx *= p.friction;
            p.vy *= p.friction;
            p.x += p.vx;
            p.y += p.vy;

            // Alpha fade based on remaining life
            p.alpha = p.life / p.maxLife;

            // Rotation
            p.rotation += p.rotationSpeed;
        }
    }

    draw(ctx) {
        for (let i = 0; i < this.maxParticles; i++) {
            const p = this.pool[i];
            if (!p.active) continue;

            const lifeRatio = p.life / p.maxLife;
            const currentSize = p.shrink ? p.size * lifeRatio : p.size;

            if (currentSize <= 0.1) continue;

            ctx.save();
            ctx.globalAlpha = p.alpha;

            if (p.glow) {
                ctx.shadowColor = p.color;
                ctx.shadowBlur = currentSize * 3;
            }

            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation);

            ctx.fillStyle = p.color;

            switch (p.shape) {
                case 'circle':
                    ctx.beginPath();
                    ctx.arc(0, 0, currentSize, 0, Math.PI * 2);
                    ctx.fill();
                    break;

                case 'square':
                    ctx.fillRect(-currentSize, -currentSize, currentSize * 2, currentSize * 2);
                    break;

                case 'star':
                    drawStarShape(ctx, 0, 0, 5, currentSize, currentSize * 0.5);
                    break;

                case 'spark':
                    ctx.strokeStyle = p.color;
                    ctx.lineWidth = Math.max(1, currentSize * 0.4);
                    ctx.globalAlpha = p.alpha;
                    ctx.beginPath();
                    // Draw a line in the direction of velocity
                    const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
                    const len = Math.min(currentSize * 3, speed * 2);
                    if (speed > 0.01) {
                        const nx = -p.vx / speed;
                        const ny = -p.vy / speed;
                        ctx.moveTo(0, 0);
                        ctx.lineTo(nx * len, ny * len);
                    } else {
                        ctx.moveTo(-currentSize, 0);
                        ctx.lineTo(currentSize, 0);
                    }
                    ctx.stroke();
                    break;
            }

            ctx.restore();
        }
    }

    clear() {
        for (let i = 0; i < this.maxParticles; i++) {
            this.pool[i].active = false;
        }
        this.activeCount = 0;
    }
}

// Helper: draw a star shape
function drawStarShape(ctx, cx, cy, spikes, outerRadius, innerRadius) {
    let rot = Math.PI / 2 * 3;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
        ctx.lineTo(cx + Math.cos(rot) * outerRadius, cy + Math.sin(rot) * outerRadius);
        rot += step;
        ctx.lineTo(cx + Math.cos(rot) * innerRadius, cy + Math.sin(rot) * innerRadius);
        rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fill();
}

// ---------------------------------------------------------------------------
// Global particle system instance
// ---------------------------------------------------------------------------
const particleSystem = new ParticleSystem(MAX_PARTICLES);

// ---------------------------------------------------------------------------
// createParticles(x, y, count, config)
// Flexible particle creator -- config overrides defaults
// ---------------------------------------------------------------------------
function createParticles(x, y, count, config) {
    const defaults = {
        vxRange: [-2, 2],       // [min, max] for velocity X
        vyRange: [-2, 2],       // [min, max] for velocity Y
        lifeRange: [20, 60],    // [min, max] frames
        sizeRange: [2, 5],      // [min, max] pixel radius
        color: '#ffffff',       // single color or array of colors
        gravity: 0.05,
        friction: 0.98,
        shape: 'circle',
        shrink: true,
        glow: false,
        rotationSpeed: 0,
        spread: 0              // random positional offset
    };

    const cfg = Object.assign({}, defaults, config);

    for (let i = 0; i < count; i++) {
        const p = particleSystem.acquire();
        if (!p) break;

        const spreadX = (Math.random() - 0.5) * cfg.spread;
        const spreadY = (Math.random() - 0.5) * cfg.spread;

        p.x = x + spreadX;
        p.y = y + spreadY;
        p.vx = randRange(cfg.vxRange[0], cfg.vxRange[1]);
        p.vy = randRange(cfg.vyRange[0], cfg.vyRange[1]);
        p.life = Math.floor(randRange(cfg.lifeRange[0], cfg.lifeRange[1]));
        p.maxLife = p.life;
        p.size = randRange(cfg.sizeRange[0], cfg.sizeRange[1]);
        p.alpha = 1;
        p.gravity = cfg.gravity;
        p.friction = cfg.friction;
        p.shape = cfg.shape;
        p.shrink = cfg.shrink;
        p.glow = cfg.glow;
        p.rotation = Math.random() * Math.PI * 2;
        p.rotationSpeed = (Math.random() - 0.5) * cfg.rotationSpeed;

        // Color can be an array -- pick randomly
        if (Array.isArray(cfg.color)) {
            p.color = cfg.color[Math.floor(Math.random() * cfg.color.length)];
        } else {
            p.color = cfg.color;
        }
    }
}

function randRange(min, max) {
    return min + Math.random() * (max - min);
}

// ---------------------------------------------------------------------------
// Pre-built particle effect configurations
// ---------------------------------------------------------------------------
const particlePresets = {
    snowTrail: {
        vxRange: [-1.5, -0.5],
        vyRange: [-1.5, 0.5],
        lifeRange: [15, 35],
        sizeRange: [1.5, 3.5],
        color: ['#ffffff', '#e3f2fd', '#bbdefb'],
        gravity: 0.02,
        friction: 0.97,
        shape: 'circle',
        shrink: true,
        glow: false,
        spread: 8
    },

    jumpDust: {
        vxRange: [-3, 3],
        vyRange: [-2, -0.5],
        lifeRange: [15, 30],
        sizeRange: [2, 5],
        color: ['#d7ccc8', '#bcaaa4', '#a1887f', '#ffffff'],
        gravity: 0.08,
        friction: 0.94,
        shape: 'circle',
        shrink: true,
        glow: false,
        spread: 20
    },

    slideSparks: {
        vxRange: [-4, -1],
        vyRange: [-3, -1],
        lifeRange: [10, 25],
        sizeRange: [1, 3],
        color: ['#ffeb3b', '#ffc107', '#ff9800', '#ffffff'],
        gravity: 0.05,
        friction: 0.96,
        shape: 'spark',
        shrink: true,
        glow: true,
        spread: 6
    },

    giftSparkle: {
        vxRange: [-3, 3],
        vyRange: [-4, -1],
        lifeRange: [25, 50],
        sizeRange: [2, 5],
        color: ['#ffd700', '#ffeb3b', '#fff176', '#ffffff'],
        gravity: -0.02,
        friction: 0.97,
        shape: 'star',
        shrink: true,
        glow: true,
        rotationSpeed: 0.2,
        spread: 15
    },

    deathExplosion: {
        vxRange: [-8, 8],
        vyRange: [-10, 2],
        lifeRange: [30, 70],
        sizeRange: [3, 8],
        color: ['#f44336', '#e53935', '#c62828', '#ff5252', '#ff8a80', '#ffffff'],
        gravity: 0.15,
        friction: 0.96,
        shape: 'circle',
        shrink: true,
        glow: true,
        spread: 25
    },

    powerUpBurst: {
        vxRange: [-5, 5],
        vyRange: [-5, 5],
        lifeRange: [25, 55],
        sizeRange: [2, 6],
        color: ['#00e5ff', '#18ffff', '#84ffff', '#ffffff'],
        gravity: -0.03,
        friction: 0.96,
        shape: 'star',
        shrink: true,
        glow: true,
        rotationSpeed: 0.15,
        spread: 20
    },

    landingDust: {
        vxRange: [-4, 4],
        vyRange: [-1.5, -0.3],
        lifeRange: [10, 20],
        sizeRange: [2, 4],
        color: ['#e0e0e0', '#bdbdbd', '#ffffff'],
        gravity: 0.03,
        friction: 0.92,
        shape: 'circle',
        shrink: true,
        glow: false,
        spread: 15
    }
};

// ---------------------------------------------------------------------------
// Convenience wrappers for common effects
// ---------------------------------------------------------------------------
function emitSnowTrail(santa) {
    // Emit every few frames while running on the ground
    if (santa.jumping || santa.sliding) return;
    createParticles(
        santa.x + 10,
        santa.y + santa.height - 5,
        1,
        particlePresets.snowTrail
    );
}

function emitJumpParticles(santa) {
    createParticles(
        santa.x + santa.width / 2,
        santa.y + santa.height,
        12,
        particlePresets.jumpDust
    );
}

function emitLandingParticles(santa) {
    createParticles(
        santa.x + santa.width / 2,
        santa.groundY + santa.height - 5,
        8,
        particlePresets.landingDust
    );
}

function emitSlideSparks(santa) {
    createParticles(
        santa.x + santa.width - 5,
        santa.y + 55,
        2,
        particlePresets.slideSparks
    );
}

function emitGiftSparkles(x, y) {
    createParticles(x, y, 18, particlePresets.giftSparkle);
}

function emitDeathExplosion(santa) {
    createParticles(
        santa.x + santa.width / 2,
        santa.y + santa.height / 2,
        45,
        particlePresets.deathExplosion
    );
}

function emitPowerUpBurst(x, y, color) {
    const preset = Object.assign({}, particlePresets.powerUpBurst);
    if (color) {
        if (Array.isArray(color)) {
            preset.color = color;
        } else {
            preset.color = [color, '#ffffff', lightenColor(color, 60)];
        }
    }
    createParticles(x, y, 30, preset);
}

// ---------------------------------------------------------------------------
// updateParticles / drawParticles
// ---------------------------------------------------------------------------
function updateParticles() {
    particleSystem.update();
}

function drawParticles() {
    particleSystem.draw(ctx);
}


// ---------------------------------------------------------------------------
// 2. SCREEN SHAKE
// ---------------------------------------------------------------------------
const screenShake = {
    intensity: 0,
    duration: 0,
    elapsed: 0,
    offsetX: 0,
    offsetY: 0,
    active: false,
    // Decay type: 'linear' or 'exponential'
    decay: 'exponential'
};

function applyScreenShake(intensity, duration) {
    // Allow stacking -- keep the stronger shake
    if (intensity > screenShake.intensity || !screenShake.active) {
        screenShake.intensity = intensity;
        screenShake.duration = duration;
        screenShake.elapsed = 0;
        screenShake.active = true;
    }
}

function updateScreenShake() {
    if (!screenShake.active) {
        screenShake.offsetX = 0;
        screenShake.offsetY = 0;
        return;
    }

    screenShake.elapsed++;

    if (screenShake.elapsed >= screenShake.duration) {
        screenShake.active = false;
        screenShake.offsetX = 0;
        screenShake.offsetY = 0;
        screenShake.intensity = 0;
        return;
    }

    // Progress from 0 to 1
    const progress = screenShake.elapsed / screenShake.duration;

    // Decay factor: intensity reduces over time
    let factor;
    if (screenShake.decay === 'exponential') {
        factor = screenShake.intensity * Math.pow(1 - progress, 2);
    } else {
        factor = screenShake.intensity * (1 - progress);
    }

    // Random offset using perlin-like smooth noise approach
    screenShake.offsetX = (Math.random() * 2 - 1) * factor;
    screenShake.offsetY = (Math.random() * 2 - 1) * factor;
}

function getShakeOffset() {
    return {
        x: screenShake.offsetX,
        y: screenShake.offsetY
    };
}


// ---------------------------------------------------------------------------
// 3. FLOATING TEXT
// ---------------------------------------------------------------------------
const floatingTexts = [];
const MAX_FLOATING_TEXTS = 20;

function addFloatingText(text, x, y, color, fontSize) {
    // Recycle oldest if at limit
    if (floatingTexts.length >= MAX_FLOATING_TEXTS) {
        floatingTexts.shift();
    }

    floatingTexts.push({
        text: text,
        x: x,
        y: y,
        color: color || '#ffd700',
        fontSize: fontSize || 20,
        alpha: 1,
        vy: -2,       // float upward
        vx: (Math.random() - 0.5) * 1.5,
        life: 60,      // frames
        maxLife: 60,
        scale: 1.4,     // start slightly bigger, shrink to 1
        targetScale: 1
    });
}

function updateFloatingTexts() {
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
        const ft = floatingTexts[i];
        ft.life--;

        if (ft.life <= 0) {
            floatingTexts.splice(i, 1);
            continue;
        }

        ft.x += ft.vx;
        ft.y += ft.vy;

        // Slow down upward movement over time
        ft.vy *= 0.97;

        // Alpha fade in the last 40% of life
        const lifeRatio = ft.life / ft.maxLife;
        if (lifeRatio < 0.4) {
            ft.alpha = lifeRatio / 0.4;
        }

        // Scale easing: spring toward targetScale
        ft.scale += (ft.targetScale - ft.scale) * 0.15;
    }
}

function drawFloatingTexts() {
    for (let i = 0; i < floatingTexts.length; i++) {
        const ft = floatingTexts[i];

        ctx.save();
        ctx.globalAlpha = ft.alpha;
        ctx.translate(ft.x, ft.y);
        ctx.scale(ft.scale, ft.scale);

        // Text shadow / outline for readability
        ctx.font = `bold ${ft.fontSize}px Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Dark outline
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.lineWidth = 3;
        ctx.lineJoin = 'round';
        ctx.strokeText(ft.text, 0, 0);

        // Fill
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, 0, 0);

        ctx.restore();
    }
}


// ---------------------------------------------------------------------------
// 4. TRAIL EFFECT (Ghost afterimages)
// ---------------------------------------------------------------------------
const trailEffect = {
    positions: [],     // Array of {x, y, alpha, width, height, sliding}
    maxTrails: 6,
    interval: 3,       // record every N frames
    frameCounter: 0,
    enabled: true,
    minSpeed: 6        // only show trail above this game speed
};

function updateTrailEffect() {
    if (!trailEffect.enabled) return;

    trailEffect.frameCounter++;

    // Only show trail when moving fast enough
    if (typeof gameSpeed !== 'undefined' && gameSpeed >= trailEffect.minSpeed) {
        if (trailEffect.frameCounter % trailEffect.interval === 0) {
            trailEffect.positions.push({
                x: santa.x,
                y: santa.sliding ? santa.y + 30 : santa.y,
                width: santa.width - 10,
                height: santa.sliding ? 30 : santa.height,
                alpha: 0.35,
                sliding: santa.sliding
            });

            // Cap the trail length
            while (trailEffect.positions.length > trailEffect.maxTrails) {
                trailEffect.positions.shift();
            }
        }
    }

    // Fade out all trail ghosts
    for (let i = trailEffect.positions.length - 1; i >= 0; i--) {
        const t = trailEffect.positions[i];
        t.alpha -= 0.02;
        if (t.alpha <= 0) {
            trailEffect.positions.splice(i, 1);
        }
    }
}

function drawTrailEffect() {
    if (!trailEffect.enabled) return;

    for (let i = 0; i < trailEffect.positions.length; i++) {
        const t = trailEffect.positions[i];
        if (t.alpha <= 0) continue;

        ctx.save();
        ctx.globalAlpha = t.alpha * 0.5;

        // Ghost silhouette -- tinted version of Santa
        // Body silhouette
        ctx.fillStyle = 'rgba(198, 40, 40, 0.6)';
        ctx.fillRect(t.x, t.y + 15, t.width, t.height - 25);

        // Head silhouette
        ctx.fillStyle = 'rgba(255, 204, 188, 0.4)';
        ctx.beginPath();
        ctx.arc(t.x + 20, t.y + 12, 12, 0, Math.PI * 2);
        ctx.fill();

        // Hat silhouette
        ctx.fillStyle = 'rgba(198, 40, 40, 0.5)';
        ctx.beginPath();
        ctx.moveTo(t.x + 5, t.y + 8);
        ctx.lineTo(t.x + 35, t.y + 8);
        ctx.lineTo(t.x + 25, t.y - 15);
        ctx.closePath();
        ctx.fill();

        if (!t.sliding) {
            // Legs silhouette
            ctx.fillStyle = 'rgba(198, 40, 40, 0.5)';
            ctx.fillRect(t.x + 5, t.y + t.height - 15, 12, 15);
            ctx.fillRect(t.x + 22, t.y + t.height - 15, 12, 15);
        }

        ctx.restore();
    }
}


// ---------------------------------------------------------------------------
// 5. BACKGROUND WEATHER EFFECTS
// ---------------------------------------------------------------------------
const weatherEffects = {
    // Enhanced snowstorm particles (separate from game snowflakes)
    stormFlakes: [],
    maxStormFlakes: 80,
    stormInitialized: false,

    // Aurora parameters
    auroraTime: 0,
    auroraWaves: [
        { yBase: 50, amplitude: 20, frequency: 0.008, speed: 0.015, hue: 120 },
        { yBase: 70, amplitude: 15, frequency: 0.012, speed: 0.020, hue: 180 },
        { yBase: 40, amplitude: 25, frequency: 0.006, speed: 0.010, hue: 280 }
    ]
};

function initWeatherEffects() {
    weatherEffects.stormFlakes = [];
    weatherEffects.stormInitialized = true;

    for (let i = 0; i < weatherEffects.maxStormFlakes; i++) {
        weatherEffects.stormFlakes.push({
            x: Math.random() * 800,
            y: Math.random() * 400,
            size: Math.random() * 2.5 + 0.5,
            speedX: 0,
            speedY: Math.random() * 1.5 + 0.5,
            wobble: Math.random() * Math.PI * 2,
            wobbleSpeed: Math.random() * 0.05 + 0.02,
            alpha: Math.random() * 0.5 + 0.3
        });
    }
}

function updateWeatherEffects() {
    if (!weatherEffects.stormInitialized) {
        initWeatherEffects();
    }

    // Speed factor: intensify with game speed
    const speedFactor = typeof gameSpeed !== 'undefined' ? gameSpeed / 5 : 1;

    for (let i = 0; i < weatherEffects.stormFlakes.length; i++) {
        const flake = weatherEffects.stormFlakes[i];

        // Wobble horizontally
        flake.wobble += flake.wobbleSpeed;
        flake.speedX = Math.sin(flake.wobble) * 1.5 - speedFactor * 2;

        flake.x += flake.speedX;
        flake.y += flake.speedY * speedFactor;

        // Wrap around
        if (flake.y > 400) {
            flake.y = -5;
            flake.x = Math.random() * 800;
        }
        if (flake.x < -10) {
            flake.x = 810;
            flake.y = Math.random() * 400;
        }
        if (flake.x > 810) {
            flake.x = -10;
        }

        // Alpha pulsing based on speed
        flake.alpha = 0.3 + speedFactor * 0.15 + Math.sin(flake.wobble) * 0.1;
        flake.alpha = Math.min(flake.alpha, 0.8);
    }

    // Advance aurora time
    weatherEffects.auroraTime += 0.016; // roughly per-frame at 60fps
}

function drawWeatherEffects() {
    // Draw storm snowflakes
    for (let i = 0; i < weatherEffects.stormFlakes.length; i++) {
        const flake = weatherEffects.stormFlakes[i];

        ctx.save();
        ctx.globalAlpha = flake.alpha;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(flake.x, flake.y, flake.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// ---------------------------------------------------------------------------
// Aurora / Northern Lights Effect
// ---------------------------------------------------------------------------
function drawAuroraEffect() {
    const time = weatherEffects.auroraTime;
    const waves = weatherEffects.auroraWaves;

    ctx.save();

    for (let w = 0; w < waves.length; w++) {
        const wave = waves[w];

        // Create a gradient for this aurora band
        const gradient = ctx.createLinearGradient(0, 0, 800, 0);

        // Shift hue over time for colour cycling
        const hueShift = (time * 20 + w * 40) % 360;
        const h1 = (wave.hue + hueShift) % 360;
        const h2 = (wave.hue + hueShift + 30) % 360;
        const h3 = (wave.hue + hueShift + 60) % 360;

        gradient.addColorStop(0, `hsla(${h1}, 80%, 60%, 0)`);
        gradient.addColorStop(0.2, `hsla(${h1}, 80%, 60%, 0.06)`);
        gradient.addColorStop(0.4, `hsla(${h2}, 70%, 55%, 0.1)`);
        gradient.addColorStop(0.6, `hsla(${h2}, 75%, 60%, 0.08)`);
        gradient.addColorStop(0.8, `hsla(${h3}, 80%, 60%, 0.05)`);
        gradient.addColorStop(1, `hsla(${h3}, 80%, 60%, 0)`);

        // Draw the aurora as a series of filled curves
        ctx.beginPath();

        // Top edge (wavy)
        ctx.moveTo(0, wave.yBase + Math.sin(time * wave.speed * 60) * wave.amplitude);
        for (let x = 0; x <= 800; x += 4) {
            const yOffset =
                Math.sin(x * wave.frequency + time * wave.speed * 60) * wave.amplitude +
                Math.sin(x * wave.frequency * 2.3 + time * wave.speed * 40) * (wave.amplitude * 0.4);
            ctx.lineTo(x, wave.yBase + yOffset);
        }

        // Bottom edge (slightly wider wave)
        for (let x = 800; x >= 0; x -= 4) {
            const yOffset =
                Math.sin(x * wave.frequency + time * wave.speed * 60) * wave.amplitude +
                Math.sin(x * wave.frequency * 2.3 + time * wave.speed * 40) * (wave.amplitude * 0.4) +
                25 + Math.sin(x * 0.01 + time) * 8; // band thickness
            ctx.lineTo(x, wave.yBase + yOffset);
        }

        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();
    }

    ctx.restore();
}


// ---------------------------------------------------------------------------
// resetEffects() -- Clear all effects on game restart
// ---------------------------------------------------------------------------
function resetEffects() {
    // Clear particles
    particleSystem.clear();

    // Clear floating texts
    floatingTexts.length = 0;

    // Reset screen shake
    screenShake.intensity = 0;
    screenShake.duration = 0;
    screenShake.elapsed = 0;
    screenShake.offsetX = 0;
    screenShake.offsetY = 0;
    screenShake.active = false;

    // Clear trail
    trailEffect.positions.length = 0;
    trailEffect.frameCounter = 0;

    // Re-init weather
    initWeatherEffects();
    weatherEffects.auroraTime = 0;
}


// ---------------------------------------------------------------------------
// Utility: lighten a hex color
// ---------------------------------------------------------------------------
function lightenColor(hex, percent) {
    // Remove # if present
    hex = hex.replace('#', '');

    let r = parseInt(hex.substring(0, 2), 16);
    let g = parseInt(hex.substring(2, 4), 16);
    let b = parseInt(hex.substring(4, 6), 16);

    r = Math.min(255, Math.floor(r + (255 - r) * (percent / 100)));
    g = Math.min(255, Math.floor(g + (255 - g) * (percent / 100)));
    b = Math.min(255, Math.floor(b + (255 - b) * (percent / 100)));

    return '#' +
        r.toString(16).padStart(2, '0') +
        g.toString(16).padStart(2, '0') +
        b.toString(16).padStart(2, '0');
}


// ---------------------------------------------------------------------------
// Master update / draw functions for integration into the game loop
// ---------------------------------------------------------------------------

/**
 * Call once per frame BEFORE drawing.
 * Updates all effect systems.
 */
function updateAllEffects() {
    updateParticles();
    updateFloatingTexts();
    updateScreenShake();
    updateTrailEffect();
    updateWeatherEffects();
}

/**
 * Call to draw background-layer effects (aurora, weather).
 * Should be called AFTER drawBackground() but BEFORE game objects.
 */
function drawBackgroundEffects() {
    drawAuroraEffect();
    drawWeatherEffects();
}

/**
 * Call to draw foreground effects (particles, trails, floating text).
 * Should be called AFTER drawing game objects.
 */
function drawForegroundEffects() {
    drawTrailEffect();
    drawParticles();
    drawFloatingTexts();
}


// ==================== END PARTICLE SYSTEM & VISUAL EFFECTS ====================
