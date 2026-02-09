// ==================== ADVANCED ENEMIES & OBSTACLES ====================
// Agent 3: Advanced Enemies, Obstacle Patterns, Wave System, Boss System
// For Santa Speed Runner - HTML5 Canvas (800x400, ground at Y=340)
// Depends on: ctx, canvas, frameCount, gameSpeed, distance, score,
//             obstacles, gifts, santa, checkCollision, createObstacle, createGift
// ======================================================================

(function () {
    'use strict';

    // ---------- MODULE STATE ----------

    let advancedObstacles = [];       // separate array for advanced obstacle instances
    let bossState = null;             // boss encounter state (null when inactive)
    let bossProjectiles = [];         // snowballs thrown by the boss
    let playerProjectiles = [];       // gifts thrown by Santa at the boss
    let lastBossDistance = 0;         // tracks last boss spawn threshold
    let patternCooldown = 0;          // frames until next pattern can spawn
    let lastAdvancedSpawnFrame = 0;   // frame of last advanced spawn
    let slideEffect = null;           // ice-patch slide effect on Santa
    let windEffect = null;            // wind gust effect on Santa
    let bossDefeatedTimer = 0;        // invincibility timer after boss defeat
    let waveAnnouncement = null;      // text display for wave transitions
    let lastWave = 0;                 // track wave changes

    // ---------- ADVANCED OBSTACLE TYPE DEFINITIONS ----------

    const advancedObstacleTypes = [
        {
            type: 'icePatch',
            width: 80,
            height: 8,
            needJump: true,
            flying: false,
            description: 'Slippery ice on the ground'
        },
        {
            type: 'grinch',
            width: 40,
            height: 55,
            needJump: true,
            flying: false,
            description: 'Walking green menace'
        },
        {
            type: 'snowballLauncher',
            width: 35,
            height: 30,
            needJump: true,
            flying: false,
            description: 'Stationary cannon that launches snowballs'
        },
        {
            type: 'windGust',
            width: 60,
            height: 340,
            needJump: false,
            flying: false,
            description: 'Environmental wind pushback'
        },
        {
            type: 'reindeer',
            width: 50,
            height: 35,
            needSlide: true,
            flying: true,
            description: 'Fast-moving reindeer to slide under'
        }
    ];

    // ---------- FACTORY: CREATE ADVANCED OBSTACLE ----------

    function createAdvancedObstacle(type) {
        const def = advancedObstacleTypes.find(t => t.type === type);
        if (!def) return null;

        const obs = {
            type: def.type,
            width: def.width,
            height: def.height,
            flying: def.flying || false,
            passed: false,
            active: true,
            spawnFrame: frameCount
        };

        switch (type) {
            case 'icePatch':
                obs.x = canvas.width + 50;
                obs.y = 340 - def.height;           // flat on ground surface
                obs.sparkles = [];
                for (let i = 0; i < 6; i++) {
                    obs.sparkles.push({
                        ox: Math.random() * def.width,
                        oy: Math.random() * def.height,
                        phase: Math.random() * Math.PI * 2,
                        size: 1 + Math.random() * 2
                    });
                }
                break;

            case 'grinch':
                obs.x = canvas.width + 50;
                obs.y = 340 - def.height;
                obs.baseX = obs.x;                   // patrol center
                obs.patrolDir = 1;                    // 1 = right, -1 = left
                obs.patrolRange = 40;                 // px of back-forth
                obs.patrolOffset = 0;
                obs.walkFrame = 0;
                break;

            case 'snowballLauncher':
                obs.x = canvas.width + 50;
                obs.y = 340 - def.height;
                obs.launchTimer = 60;                 // first launch quicker
                obs.launchInterval = 120;
                obs.projectiles = [];                 // snowballs owned by this launcher
                obs.launchAnim = 0;                   // recoil animation timer
                break;

            case 'windGust':
                obs.x = canvas.width + 50;
                obs.y = 0;
                obs.height = 340;                     // full height above ground
                obs.triggered = false;
                obs.effectTimer = 0;
                obs.windLines = [];
                for (let i = 0; i < 12; i++) {
                    obs.windLines.push({
                        ox: Math.random() * def.width,
                        oy: 40 + Math.random() * 260,
                        length: 15 + Math.random() * 25,
                        speed: 2 + Math.random() * 3,
                        phase: Math.random() * Math.PI * 2
                    });
                }
                break;

            case 'reindeer':
                obs.x = canvas.width + 50;
                obs.y = 340 - 35 - 25;               // hovers above ground (slide-under)
                obs.speedMultiplier = 1.5;
                obs.runFrame = 0;
                break;
        }

        advancedObstacles.push(obs);
        return obs;
    }

    // ---------- DRAW FUNCTIONS ----------

    function drawAdvancedObstacle(obs) {
        if (!obs.active) return;
        ctx.save();

        switch (obs.type) {
            case 'icePatch':
                drawIcePatch(obs);
                break;
            case 'grinch':
                drawGrinch(obs);
                break;
            case 'snowballLauncher':
                drawSnowballLauncher(obs);
                break;
            case 'windGust':
                drawWindGust(obs);
                break;
            case 'reindeer':
                drawReindeer(obs);
                break;
        }

        ctx.restore();
    }

    function drawIcePatch(obs) {
        // Main ice body - semi-transparent blue gradient
        const grad = ctx.createLinearGradient(obs.x, obs.y, obs.x + obs.width, obs.y + obs.height);
        grad.addColorStop(0, 'rgba(100, 180, 255, 0.55)');
        grad.addColorStop(0.5, 'rgba(180, 220, 255, 0.7)');
        grad.addColorStop(1, 'rgba(100, 180, 255, 0.55)');
        ctx.fillStyle = grad;

        // Rounded rectangle for the ice
        const r = 3;
        ctx.beginPath();
        ctx.moveTo(obs.x + r, obs.y);
        ctx.lineTo(obs.x + obs.width - r, obs.y);
        ctx.quadraticCurveTo(obs.x + obs.width, obs.y, obs.x + obs.width, obs.y + r);
        ctx.lineTo(obs.x + obs.width, obs.y + obs.height - r);
        ctx.quadraticCurveTo(obs.x + obs.width, obs.y + obs.height, obs.x + obs.width - r, obs.y + obs.height);
        ctx.lineTo(obs.x + r, obs.y + obs.height);
        ctx.quadraticCurveTo(obs.x, obs.y + obs.height, obs.x, obs.y + obs.height - r);
        ctx.lineTo(obs.x, obs.y + r);
        ctx.quadraticCurveTo(obs.x, obs.y, obs.x + r, obs.y);
        ctx.closePath();
        ctx.fill();

        // Shiny highlight streak
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(obs.x + 8, obs.y + 2);
        ctx.lineTo(obs.x + obs.width - 10, obs.y + 2);
        ctx.stroke();

        // Sparkle animation
        obs.sparkles.forEach(sp => {
            const sparkleAlpha = 0.4 + 0.6 * Math.abs(Math.sin(frameCount * 0.08 + sp.phase));
            const sparkleSize = sp.size * (0.6 + 0.4 * Math.abs(Math.sin(frameCount * 0.1 + sp.phase)));
            ctx.fillStyle = `rgba(255, 255, 255, ${sparkleAlpha})`;

            // Four-pointed star sparkle
            const sx = obs.x + sp.ox;
            const sy = obs.y + sp.oy;
            ctx.beginPath();
            ctx.moveTo(sx, sy - sparkleSize);
            ctx.lineTo(sx + sparkleSize * 0.3, sy);
            ctx.lineTo(sx, sy + sparkleSize);
            ctx.lineTo(sx - sparkleSize * 0.3, sy);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(sx - sparkleSize, sy);
            ctx.lineTo(sx, sy + sparkleSize * 0.3);
            ctx.lineTo(sx + sparkleSize, sy);
            ctx.lineTo(sx, sy - sparkleSize * 0.3);
            ctx.closePath();
            ctx.fill();
        });
    }

    function drawGrinch(obs) {
        const cx = obs.x + obs.width / 2;
        const dir = obs.patrolDir;               // facing direction
        const bobble = Math.sin(obs.walkFrame * 0.15) * 2;

        // Legs with walk animation
        const legSwing = Math.sin(obs.walkFrame * 0.2) * 6;
        ctx.fillStyle = '#1b5e20';
        ctx.fillRect(obs.x + 8, obs.y + 42 + bobble, 10, 14);
        ctx.fillRect(obs.x + 22, obs.y + 42 + bobble, 10, 14);

        // Boots (black, Santa-style)
        ctx.fillStyle = '#111';
        ctx.fillRect(obs.x + 5 + (dir > 0 ? legSwing * 0.3 : 0), obs.y + 52 + bobble, 14, 5);
        ctx.fillRect(obs.x + 20 + (dir > 0 ? 0 : -legSwing * 0.3), obs.y + 52 + bobble, 14, 5);

        // Body (green torso with Santa outfit)
        ctx.fillStyle = '#2e7d32';
        ctx.fillRect(obs.x + 5, obs.y + 18 + bobble, 30, 26);

        // Belt
        ctx.fillStyle = '#111';
        ctx.fillRect(obs.x + 5, obs.y + 36 + bobble, 30, 4);
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(obs.x + 17, obs.y + 35 + bobble, 8, 6);

        // White fur trim at bottom of coat
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.fillRect(obs.x + 5, obs.y + 41 + bobble, 30, 3);

        // Arms
        ctx.fillStyle = '#2e7d32';
        const armSwing = Math.sin(obs.walkFrame * 0.2) * 4;
        ctx.save();
        ctx.translate(obs.x + 3, obs.y + 22 + bobble);
        ctx.rotate((-0.2 + armSwing * 0.03) * dir);
        ctx.fillRect(-3, 0, 8, 18);
        ctx.restore();
        ctx.save();
        ctx.translate(obs.x + 32, obs.y + 22 + bobble);
        ctx.rotate((0.2 - armSwing * 0.03) * dir);
        ctx.fillRect(-3, 0, 8, 18);
        ctx.restore();

        // Head (green, round)
        ctx.fillStyle = '#4caf50';
        ctx.beginPath();
        ctx.arc(cx, obs.y + 13 + bobble, 13, 0, Math.PI * 2);
        ctx.fill();

        // Evil grin
        ctx.strokeStyle = '#1b5e20';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx + dir * 2, obs.y + 17 + bobble, 7, 0.1 * Math.PI, 0.9 * Math.PI);
        ctx.stroke();

        // Teeth in grin
        ctx.fillStyle = '#fffde7';
        ctx.fillRect(cx - 3 + dir * 2, obs.y + 18 + bobble, 2, 3);
        ctx.fillRect(cx + 1 + dir * 2, obs.y + 18 + bobble, 2, 3);

        // Eyes (evil, slanted)
        ctx.fillStyle = '#ffeb3b';
        ctx.beginPath();
        ctx.arc(cx - 5 * dir, obs.y + 10 + bobble, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx + 3 * dir, obs.y + 10 + bobble, 3, 0, Math.PI * 2);
        ctx.fill();

        // Pupils
        ctx.fillStyle = '#b71c1c';
        ctx.beginPath();
        ctx.arc(cx - 5 * dir, obs.y + 10 + bobble, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx + 3 * dir, obs.y + 10 + bobble, 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Angry eyebrows
        ctx.strokeStyle = '#1b5e20';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx - 8 * dir, obs.y + 6 + bobble);
        ctx.lineTo(cx - 3 * dir, obs.y + 8 + bobble);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx + 6 * dir, obs.y + 8 + bobble);
        ctx.lineTo(cx + 1 * dir, obs.y + 6 + bobble);
        ctx.stroke();

        // Santa hat (but green/dark)
        ctx.fillStyle = '#8b0000';
        ctx.beginPath();
        ctx.moveTo(cx - 12, obs.y + 4 + bobble);
        ctx.lineTo(cx + 12, obs.y + 4 + bobble);
        ctx.lineTo(cx + 6 * dir, obs.y - 16 + bobble);
        ctx.closePath();
        ctx.fill();

        // Hat trim
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.fillRect(cx - 14, obs.y + 2 + bobble, 28, 4);

        // Hat pompom
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(cx + 6 * dir, obs.y - 16 + bobble, 4, 0, Math.PI * 2);
        ctx.fill();
    }

    function drawSnowballLauncher(obs) {
        // Base / platform
        ctx.fillStyle = '#5d4037';
        ctx.fillRect(obs.x, obs.y + 18, obs.width, 12);

        // Wheels
        ctx.fillStyle = '#3e2723';
        ctx.beginPath();
        ctx.arc(obs.x + 6, obs.y + 30, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(obs.x + obs.width - 6, obs.y + 30, 5, 0, Math.PI * 2);
        ctx.fill();

        // Wheel spokes
        ctx.strokeStyle = '#795548';
        ctx.lineWidth = 1;
        [obs.x + 6, obs.x + obs.width - 6].forEach(wx => {
            for (let a = 0; a < Math.PI * 2; a += Math.PI / 3) {
                ctx.beginPath();
                ctx.moveTo(wx, obs.y + 30);
                ctx.lineTo(wx + Math.cos(a + frameCount * 0.05) * 4, obs.y + 30 + Math.sin(a + frameCount * 0.05) * 4);
                ctx.stroke();
            }
        });

        // Cannon barrel with recoil
        const recoil = obs.launchAnim > 0 ? Math.sin(obs.launchAnim * 0.5) * 3 : 0;
        ctx.fillStyle = '#424242';
        ctx.save();
        ctx.translate(obs.x + obs.width / 2, obs.y + 14);
        ctx.rotate(-0.5);                          // angled upward
        ctx.fillRect(-5 + recoil, -4, 20, 8);

        // Barrel opening
        ctx.fillStyle = '#212121';
        ctx.beginPath();
        ctx.arc(15 + recoil, 0, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Ammo pile (small snowballs near the base)
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(obs.x + 5, obs.y + 16, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(obs.x + 13, obs.y + 16, 3, 0, Math.PI * 2);
        ctx.fill();

        // Draw launched snowballs
        obs.projectiles.forEach(p => {
            // Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.15)';
            ctx.beginPath();
            ctx.ellipse(p.x, 338, 6, 2, 0, 0, Math.PI * 2);
            ctx.fill();

            // Snowball body
            const grad = ctx.createRadialGradient(p.x - 2, p.y - 2, 1, p.x, p.y, 8);
            grad.addColorStop(0, '#ffffff');
            grad.addColorStop(1, '#b3e5fc');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
            ctx.fill();

            // Snow particles trailing
            ctx.fillStyle = 'rgba(255,255,255,0.6)';
            for (let i = 0; i < 3; i++) {
                const tx = p.x + 5 + i * 4 + Math.random() * 2;
                const ty = p.y + Math.random() * 4 - 2;
                ctx.beginPath();
                ctx.arc(tx, ty, 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
        });
    }

    function drawWindGust(obs) {
        // Wind lines - translucent white streaks
        const baseAlpha = obs.triggered ? 0.6 : 0.25;
        const pulse = obs.triggered ? 1 + 0.3 * Math.sin(frameCount * 0.3) : 1;

        obs.windLines.forEach(wl => {
            const phase = (frameCount * wl.speed * 0.02 + wl.phase) % 1;
            const wx = obs.x + wl.ox + phase * 15;
            const wy = wl.oy + Math.sin(frameCount * 0.05 + wl.phase) * 5;
            const alpha = baseAlpha * (0.5 + 0.5 * Math.sin(frameCount * 0.1 + wl.phase)) * pulse;

            ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(wx, wy);

            // Wavy wind line
            const len = wl.length * pulse;
            ctx.bezierCurveTo(
                wx - len * 0.3, wy - 3,
                wx - len * 0.6, wy + 3,
                wx - len, wy
            );
            ctx.stroke();

            // Arrow tips for direction
            if (alpha > 0.2) {
                ctx.beginPath();
                ctx.moveTo(wx - len, wy);
                ctx.lineTo(wx - len + 4, wy - 3);
                ctx.moveTo(wx - len, wy);
                ctx.lineTo(wx - len + 4, wy + 3);
                ctx.stroke();
            }
        });

        // When triggered, show strong gusting effect
        if (obs.triggered && obs.effectTimer > 0) {
            ctx.fillStyle = `rgba(200, 230, 255, ${0.08 * pulse})`;
            ctx.fillRect(obs.x - 20, 0, obs.width + 40, 340);
        }
    }

    function drawReindeer(obs) {
        const bounce = Math.sin(obs.runFrame * 0.25) * 3;
        const legCycle = Math.sin(obs.runFrame * 0.3);

        // Shadow on ground
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.beginPath();
        ctx.ellipse(obs.x + 25, 338, 20, 3, 0, 0, Math.PI * 2);
        ctx.fill();

        const by = obs.y + bounce;

        // Body
        ctx.fillStyle = '#6d4c41';
        ctx.beginPath();
        ctx.ellipse(obs.x + 25, by + 18, 22, 12, 0, 0, Math.PI * 2);
        ctx.fill();

        // Legs (running animation)
        ctx.fillStyle = '#5d4037';
        const frontLegAngle = legCycle * 0.4;
        const backLegAngle = -legCycle * 0.4;

        // Front legs
        ctx.save();
        ctx.translate(obs.x + 36, by + 24);
        ctx.rotate(frontLegAngle);
        ctx.fillRect(-2, 0, 4, 14);
        ctx.restore();

        ctx.save();
        ctx.translate(obs.x + 32, by + 24);
        ctx.rotate(-frontLegAngle * 0.8);
        ctx.fillRect(-2, 0, 4, 14);
        ctx.restore();

        // Back legs
        ctx.save();
        ctx.translate(obs.x + 14, by + 24);
        ctx.rotate(backLegAngle);
        ctx.fillRect(-2, 0, 4, 14);
        ctx.restore();

        ctx.save();
        ctx.translate(obs.x + 10, by + 24);
        ctx.rotate(-backLegAngle * 0.8);
        ctx.fillRect(-2, 0, 4, 14);
        ctx.restore();

        // Hooves
        ctx.fillStyle = '#3e2723';
        const hoofOffsets = [
            { x: 36, a: frontLegAngle },
            { x: 32, a: -frontLegAngle * 0.8 },
            { x: 14, a: backLegAngle },
            { x: 10, a: -backLegAngle * 0.8 }
        ];
        hoofOffsets.forEach(h => {
            const hx = obs.x + h.x + Math.sin(h.a) * 14;
            const hy = by + 24 + Math.cos(h.a) * 14;
            ctx.fillRect(hx - 3, hy, 6, 3);
        });

        // Tail
        ctx.fillStyle = '#8d6e63';
        ctx.beginPath();
        ctx.arc(obs.x + 3, by + 14 + Math.sin(frameCount * 0.2) * 2, 4, 0, Math.PI * 2);
        ctx.fill();

        // Neck
        ctx.fillStyle = '#6d4c41';
        ctx.beginPath();
        ctx.moveTo(obs.x + 38, by + 10);
        ctx.quadraticCurveTo(obs.x + 46, by + 2, obs.x + 44, by - 4);
        ctx.lineTo(obs.x + 38, by - 2);
        ctx.quadraticCurveTo(obs.x + 38, by + 6, obs.x + 34, by + 12);
        ctx.closePath();
        ctx.fill();

        // Head
        ctx.fillStyle = '#795548';
        ctx.beginPath();
        ctx.ellipse(obs.x + 44, by - 2, 7, 6, -0.3, 0, Math.PI * 2);
        ctx.fill();

        // Antlers
        ctx.strokeStyle = '#5d4037';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';

        // Left antler
        ctx.beginPath();
        ctx.moveTo(obs.x + 40, by - 6);
        ctx.lineTo(obs.x + 36, by - 16);
        ctx.lineTo(obs.x + 32, by - 14);
        ctx.moveTo(obs.x + 36, by - 16);
        ctx.lineTo(obs.x + 38, by - 22);
        ctx.stroke();

        // Right antler
        ctx.beginPath();
        ctx.moveTo(obs.x + 46, by - 6);
        ctx.lineTo(obs.x + 50, by - 16);
        ctx.lineTo(obs.x + 54, by - 14);
        ctx.moveTo(obs.x + 50, by - 16);
        ctx.lineTo(obs.x + 48, by - 22);
        ctx.stroke();

        // Red nose (Rudolph!)
        ctx.fillStyle = '#f44336';
        const noseGlow = 0.5 + 0.5 * Math.sin(frameCount * 0.15);
        ctx.shadowColor = '#f44336';
        ctx.shadowBlur = 6 * noseGlow;
        ctx.beginPath();
        ctx.arc(obs.x + 50, by, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Eye
        ctx.fillStyle = '#212121';
        ctx.beginPath();
        ctx.arc(obs.x + 45, by - 4, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(obs.x + 45.5, by - 4.5, 0.8, 0, Math.PI * 2);
        ctx.fill();
    }

    // ---------- UPDATE FUNCTIONS ----------

    function updateAdvancedObstacle(obs) {
        if (!obs.active) return;

        switch (obs.type) {
            case 'icePatch':
                // Ice patches scroll normally; collision handled externally
                obs.x -= gameSpeed;
                break;

            case 'grinch':
                // World scroll
                obs.x -= gameSpeed;
                obs.baseX -= gameSpeed;

                // Patrol movement
                obs.patrolOffset += 0.8 * obs.patrolDir;
                if (Math.abs(obs.patrolOffset) > obs.patrolRange) {
                    obs.patrolDir *= -1;
                }
                obs.x = obs.baseX + obs.patrolOffset;
                obs.walkFrame++;
                break;

            case 'snowballLauncher':
                obs.x -= gameSpeed;

                // Recoil animation cooldown
                if (obs.launchAnim > 0) obs.launchAnim--;

                // Launch timer
                obs.launchTimer--;
                if (obs.launchTimer <= 0) {
                    obs.launchTimer = obs.launchInterval;
                    obs.launchAnim = 15;

                    // Spawn a snowball projectile in an arc
                    obs.projectiles.push({
                        x: obs.x + obs.width / 2 + 8,
                        y: obs.y + 6,
                        vx: -(gameSpeed + 2),
                        vy: -7,
                        gravity: 0.25,
                        active: true
                    });
                }

                // Update snowball projectiles
                for (let i = obs.projectiles.length - 1; i >= 0; i--) {
                    const p = obs.projectiles[i];
                    p.x += p.vx;
                    p.y += p.vy;
                    p.vy += p.gravity;

                    // Remove if below ground or off-screen
                    if (p.y > 345 || p.x < -20) {
                        obs.projectiles.splice(i, 1);
                    }
                }
                break;

            case 'windGust':
                obs.x -= gameSpeed;

                // Check if Santa is within the wind zone
                if (!obs.triggered) {
                    const santaHitbox = santa.getHitbox();
                    if (santaHitbox.x + santaHitbox.width > obs.x &&
                        santaHitbox.x < obs.x + obs.width) {
                        obs.triggered = true;
                        obs.effectTimer = 30;
                        windEffect = { timer: 30, pushStrength: 3 };
                    }
                }

                if (obs.effectTimer > 0) {
                    obs.effectTimer--;
                }
                break;

            case 'reindeer':
                // Moves 1.5x game speed from right to left
                obs.x -= gameSpeed * obs.speedMultiplier;
                obs.runFrame++;
                break;
        }

        // Off-screen cleanup
        if (obs.x + obs.width < -50) {
            obs.active = false;
        }

        // Score for passing
        if (!obs.passed && obs.x + obs.width < santa.x) {
            obs.passed = true;
            score += 15;
        }
    }

    // ---------- COLLISION HANDLING FOR ADVANCED OBSTACLES ----------

    function checkAdvancedCollisions() {
        if (bossDefeatedTimer > 0) return;       // invincible after boss

        const santaHitbox = santa.getHitbox();

        for (let i = advancedObstacles.length - 1; i >= 0; i--) {
            const obs = advancedObstacles[i];
            if (!obs.active) continue;

            let hitbox;
            switch (obs.type) {
                case 'icePatch':
                    hitbox = { x: obs.x, y: obs.y, width: obs.width, height: obs.height };
                    if (checkCollision(santaHitbox, hitbox)) {
                        // Don't kill, apply slide effect
                        if (!slideEffect) {
                            slideEffect = { timer: 120 };  // 2 seconds at 60fps
                        }
                    }
                    break;

                case 'grinch':
                    hitbox = { x: obs.x + 4, y: obs.y + 5, width: obs.width - 8, height: obs.height - 5 };
                    if (checkCollision(santaHitbox, hitbox)) {
                        return true;              // lethal
                    }
                    break;

                case 'snowballLauncher':
                    // Launcher body collision
                    hitbox = { x: obs.x, y: obs.y, width: obs.width, height: obs.height };
                    if (checkCollision(santaHitbox, hitbox)) {
                        return true;
                    }
                    // Snowball projectile collision
                    for (let j = obs.projectiles.length - 1; j >= 0; j--) {
                        const p = obs.projectiles[j];
                        if (!p.active) continue;
                        const pHit = { x: p.x - 7, y: p.y - 7, width: 14, height: 14 };
                        if (checkCollision(santaHitbox, pHit)) {
                            return true;
                        }
                    }
                    break;

                case 'windGust':
                    // Wind gust doesn't kill, it pushes (handled in update)
                    break;

                case 'reindeer':
                    hitbox = { x: obs.x + 5, y: obs.y + 5, width: obs.width - 10, height: obs.height - 5 };
                    if (checkCollision(santaHitbox, hitbox)) {
                        return true;
                    }
                    break;
            }
        }
        return false;
    }

    // ---------- EFFECTS ON SANTA ----------

    function applyEffectsToSanta() {
        // Ice slide effect: force Santa to drift and prevent stopping
        if (slideEffect) {
            slideEffect.timer--;
            if (slideEffect.timer <= 0) {
                slideEffect = null;
            }
        }

        // Wind pushback effect
        if (windEffect) {
            windEffect.timer--;
            // We simulate pushback by shifting Santa's effective position briefly
            // Since Santa's x is fixed, we adjust speed perception
            if (windEffect.timer <= 0) {
                windEffect = null;
            }
        }

        // Boss invincibility timer
        if (bossDefeatedTimer > 0) {
            bossDefeatedTimer--;
        }
    }

    function isSliding() {
        return slideEffect !== null;
    }

    function isWindAffected() {
        return windEffect !== null;
    }

    function getWindPushback() {
        if (windEffect) return windEffect.pushStrength;
        return 0;
    }

    // Draw effects overlay
    function drawEffectsOverlay() {
        // Ice slide indicator
        if (slideEffect) {
            const alpha = 0.15 + 0.1 * Math.sin(frameCount * 0.2);
            ctx.fillStyle = `rgba(100, 200, 255, ${alpha})`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Sliding text
            ctx.save();
            ctx.font = 'bold 14px Arial';
            ctx.fillStyle = `rgba(100, 200, 255, ${0.6 + 0.3 * Math.sin(frameCount * 0.15)})`;
            ctx.textAlign = 'center';
            ctx.fillText('SLIPPERY!', santa.x + 20, santa.y - 15);
            ctx.restore();
        }

        // Wind effect indicator
        if (windEffect) {
            // Horizontal speed lines across screen
            ctx.strokeStyle = `rgba(255, 255, 255, ${0.3 + 0.2 * Math.sin(frameCount * 0.3)})`;
            ctx.lineWidth = 1;
            for (let i = 0; i < 8; i++) {
                const y = 40 + i * 38;
                const xOff = (frameCount * 6 + i * 50) % canvas.width;
                ctx.beginPath();
                ctx.moveTo(xOff, y);
                ctx.lineTo(xOff - 40 - Math.random() * 20, y + (Math.random() - 0.5) * 4);
                ctx.stroke();
            }
        }

        // Boss defeated invincibility
        if (bossDefeatedTimer > 0) {
            if (Math.floor(frameCount / 4) % 2 === 0) {
                ctx.fillStyle = 'rgba(255, 215, 0, 0.08)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
        }
    }

    // ---------- WAVE SYSTEM ----------

    function getCurrentWave() {
        if (distance < 500) return 1;
        if (distance < 1000) return 2;
        if (distance < 2000) return 3;
        if (distance < 3500) return 4;
        return 5;
    }

    function getSpawnConfig() {
        const wave = getCurrentWave();
        switch (wave) {
            case 1:
                return {
                    minInterval: 120,
                    maxInterval: 200,
                    allowedTypes: ['chimney', 'snowman', 'tree'],
                    advancedTypes: [],
                    patternChance: 0.02,
                    giftInterval: 80
                };
            case 2:
                return {
                    minInterval: 75,
                    maxInterval: 130,
                    allowedTypes: ['chimney', 'snowman', 'tree', 'bird'],
                    advancedTypes: ['icePatch'],
                    patternChance: 0.12,
                    giftInterval: 85
                };
            case 3:
                return {
                    minInterval: 65,
                    maxInterval: 110,
                    allowedTypes: ['chimney', 'snowman', 'tree', 'bird'],
                    advancedTypes: ['icePatch', 'grinch', 'windGust'],
                    patternChance: 0.2,
                    giftInterval: 75
                };
            case 4:
                return {
                    minInterval: 55,
                    maxInterval: 100,
                    allowedTypes: ['chimney', 'snowman', 'tree', 'bird'],
                    advancedTypes: ['icePatch', 'grinch', 'windGust', 'snowballLauncher', 'reindeer'],
                    patternChance: 0.3,
                    giftInterval: 65
                };
            case 5:
            default:
                return {
                    minInterval: 40,
                    maxInterval: 80,
                    allowedTypes: ['chimney', 'snowman', 'tree', 'bird'],
                    advancedTypes: ['icePatch', 'grinch', 'windGust', 'snowballLauncher', 'reindeer'],
                    patternChance: 0.4,
                    giftInterval: 55
                };
        }
    }

    // ---------- PATTERN SPAWNING ----------

    function trySpawnPattern() {
        if (patternCooldown > 0) return false;

        const config = getSpawnConfig();
        if (Math.random() > config.patternChance) return false;

        const allTypes = config.allowedTypes.concat(config.advancedTypes);
        const patterns = ['double', 'gauntlet', 'highLow', 'giftCorridor'];
        const wave = getCurrentWave();

        // Filter patterns: gauntlet only from wave 3+, gift corridor always available
        const available = patterns.filter(p => {
            if (p === 'gauntlet' && wave < 3) return false;
            return true;
        });

        const pattern = available[Math.floor(Math.random() * available.length)];

        switch (pattern) {
            case 'double':
                spawnPatternDouble(allTypes);
                patternCooldown = 90;
                break;
            case 'gauntlet':
                spawnPatternGauntlet(allTypes);
                patternCooldown = 180;
                break;
            case 'highLow':
                spawnPatternHighLow(config);
                patternCooldown = 120;
                break;
            case 'giftCorridor':
                spawnPatternGiftCorridor();
                patternCooldown = 100;
                break;
        }

        return true;
    }

    function spawnPatternDouble(types) {
        // Two obstacles with a small gap
        const groundTypes = types.filter(t => t !== 'bird' && t !== 'reindeer' && t !== 'windGust');
        if (groundTypes.length === 0) return;

        for (let i = 0; i < 2; i++) {
            const type = groundTypes[Math.floor(Math.random() * groundTypes.length)];
            const isAdvanced = advancedObstacleTypes.some(a => a.type === type);
            if (isAdvanced) {
                const obs = createAdvancedObstacle(type);
                if (obs) obs.x = canvas.width + 50 + i * 120;
            } else {
                spawnBasicObstacleOfType(type, canvas.width + 50 + i * 120);
            }
        }
    }

    function spawnPatternGauntlet(types) {
        // 3-4 obstacles in rapid succession
        const count = 3 + Math.floor(Math.random() * 2);
        const groundTypes = types.filter(t => t !== 'bird' && t !== 'reindeer');

        for (let i = 0; i < count; i++) {
            const type = groundTypes[Math.floor(Math.random() * groundTypes.length)];
            const isAdvanced = advancedObstacleTypes.some(a => a.type === type);
            if (isAdvanced) {
                const obs = createAdvancedObstacle(type);
                if (obs) obs.x = canvas.width + 50 + i * 100;
            } else {
                spawnBasicObstacleOfType(type, canvas.width + 50 + i * 100);
            }
        }
    }

    function spawnPatternHighLow(config) {
        // Bird (high, need slide) + ground obstacle simultaneously
        const groundTypes = config.allowedTypes.concat(config.advancedTypes)
            .filter(t => t !== 'bird' && t !== 'reindeer' && t !== 'windGust');
        if (groundTypes.length === 0) return;

        // Spawn a bird
        spawnBasicObstacleOfType('bird', canvas.width + 50);

        // Spawn a ground obstacle slightly offset so player must choose timing
        const gType = groundTypes[Math.floor(Math.random() * groundTypes.length)];
        const isAdvanced = advancedObstacleTypes.some(a => a.type === gType);
        if (isAdvanced) {
            const obs = createAdvancedObstacle(gType);
            if (obs) obs.x = canvas.width + 50 + 130;
        } else {
            spawnBasicObstacleOfType(gType, canvas.width + 50 + 130);
        }
    }

    function spawnPatternGiftCorridor() {
        // Line of gifts leading through a safe path
        const count = 5 + Math.floor(Math.random() * 4);
        for (let i = 0; i < count; i++) {
            const gift = {
                x: canvas.width + 50 + i * 55,
                y: 240 + Math.sin(i * 0.5) * 30,
                width: 25,
                height: 25,
                color: ['#f44336', '#4caf50', '#2196f3', '#9c27b0', '#ff9800'][i % 5],
                collected: false
            };
            gifts.push(gift);
        }
    }

    // Helper: spawn a basic (original) obstacle type at a specific x
    function spawnBasicObstacleOfType(type, xPos) {
        const basicTypes = [
            { type: 'chimney', width: 40, height: 60, color: '#5d4037', flying: false },
            { type: 'snowman', width: 35, height: 55, color: 'white', flying: false },
            { type: 'bird', width: 30, height: 25, color: '#37474f', flying: true },
            { type: 'tree', width: 45, height: 70, color: '#2e7d32', flying: false }
        ];

        const def = basicTypes.find(t => t.type === type);
        if (!def) return;

        const obstacle = {
            x: xPos,
            y: def.flying ? 260 : 340 - def.height,
            width: def.width,
            height: def.height,
            type: def.type,
            color: def.color,
            flying: def.flying,
            passed: false
        };
        obstacles.push(obstacle);
    }

    // ---------- WAVE OBSTACLE SPAWNING ----------

    function spawnWaveObstacle() {
        if (isBossActive()) return;                // no spawning during boss

        const config = getSpawnConfig();

        // Check wave transitions for announcements
        const currentWave = getCurrentWave();
        if (currentWave !== lastWave) {
            lastWave = currentWave;
            if (currentWave > 1) {
                waveAnnouncement = { text: 'WAVE ' + currentWave, timer: 120 };
            }
        }

        // Determine spawn interval based on wave config
        const interval = config.minInterval + Math.floor(Math.random() * (config.maxInterval - config.minInterval));
        if (frameCount - lastAdvancedSpawnFrame < interval) return;

        // Try pattern spawn first
        if (trySpawnPattern()) {
            lastAdvancedSpawnFrame = frameCount;
            return;
        }

        // Decide between basic and advanced
        const allTypes = config.allowedTypes.concat(config.advancedTypes);
        const chosen = allTypes[Math.floor(Math.random() * allTypes.length)];

        const isAdvanced = advancedObstacleTypes.some(a => a.type === chosen);
        if (isAdvanced) {
            createAdvancedObstacle(chosen);
        } else {
            spawnBasicObstacleOfType(chosen, canvas.width + 50);
        }

        lastAdvancedSpawnFrame = frameCount;
    }

    // Gift spawning using wave config
    function spawnWaveGift() {
        if (isBossActive()) return;
        const config = getSpawnConfig();
        if (frameCount % config.giftInterval === 0) {
            const gift = {
                x: canvas.width + 30,
                y: 200 + Math.random() * 80,
                width: 25,
                height: 25,
                color: ['#f44336', '#4caf50', '#2196f3', '#9c27b0', '#ff9800'][Math.floor(Math.random() * 5)],
                collected: false
            };
            gifts.push(gift);
        }
    }

    // Draw wave announcement
    function drawWaveAnnouncement() {
        if (!waveAnnouncement || waveAnnouncement.timer <= 0) {
            waveAnnouncement = null;
            return;
        }

        waveAnnouncement.timer--;
        const alpha = waveAnnouncement.timer > 90
            ? (120 - waveAnnouncement.timer) / 30
            : waveAnnouncement.timer / 90;

        ctx.save();
        ctx.globalAlpha = Math.min(alpha, 1);
        ctx.font = 'bold 36px Arial';
        ctx.textAlign = 'center';

        // Text shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillText(waveAnnouncement.text, canvas.width / 2 + 2, 82);

        // Main text
        ctx.fillStyle = '#ffd700';
        ctx.fillText(waveAnnouncement.text, canvas.width / 2, 80);

        // Subtitle
        ctx.font = '16px Arial';
        ctx.fillStyle = 'white';
        const subtitles = {
            2: 'Birds incoming! Watch the skies!',
            3: 'The Grinch appears! Stay alert!',
            4: 'Full assault! Dodge everything!',
            5: 'MAXIMUM DANGER!'
        };
        const sub = subtitles[getCurrentWave()] || '';
        ctx.fillText(sub, canvas.width / 2, 105);

        ctx.restore();
    }

    // ---------- BOSS SYSTEM: THE ABOMINABLE SNOWMAN ----------

    function initBoss() {
        if (bossState) return;                    // already active

        bossState = {
            x: canvas.width + 20,                // slides in from right
            targetX: canvas.width * 0.62,         // rests at ~62% across
            y: 100,
            width: 180,
            height: 230,
            hp: 5,
            maxHp: 5,
            phase: 'entering',                    // entering -> fighting -> dying -> done
            attackTimer: 90,
            attackCooldown: 80,
            animFrame: 0,
            hitFlash: 0,
            throwAnim: 0,
            deathTimer: 0,
            shakeX: 0,
            shakeY: 0,
            roarTimer: 0,
            giftsHeld: 0                          // auto-collected gifts during boss
        };

        bossProjectiles = [];
        playerProjectiles = [];

        // Clear existing obstacles for boss arena
        advancedObstacles = advancedObstacles.filter(o => false);
    }

    function isBossActive() {
        return bossState !== null && bossState.phase !== 'done';
    }

    function updateBoss() {
        if (!bossState) return;

        bossState.animFrame++;

        switch (bossState.phase) {
            case 'entering':
                // Slide in from right
                bossState.x -= 2;
                if (bossState.x <= bossState.targetX) {
                    bossState.x = bossState.targetX;
                    bossState.phase = 'fighting';
                    bossState.roarTimer = 45;      // roar before first attack
                }
                break;

            case 'fighting':
                // Roar cooldown
                if (bossState.roarTimer > 0) {
                    bossState.roarTimer--;
                    bossState.shakeX = (Math.random() - 0.5) * 4;
                    bossState.shakeY = (Math.random() - 0.5) * 2;
                    break;
                }

                bossState.shakeX = 0;
                bossState.shakeY = 0;

                // Hit flash decay
                if (bossState.hitFlash > 0) bossState.hitFlash--;
                if (bossState.throwAnim > 0) bossState.throwAnim--;

                // Attack pattern: throw snowballs at Santa
                bossState.attackTimer--;
                if (bossState.attackTimer <= 0) {
                    bossState.attackTimer = bossState.attackCooldown;
                    bossState.throwAnim = 20;

                    // Difficulty scaling: more projectiles as HP decreases
                    const numProjectiles = bossState.hp <= 2 ? 3 : (bossState.hp <= 3 ? 2 : 1);
                    for (let i = 0; i < numProjectiles; i++) {
                        const delay = i * 15;
                        setTimeout(() => {
                            if (!bossState || bossState.phase !== 'fighting') return;
                            bossProjectiles.push({
                                x: bossState.x + 20,
                                y: bossState.y + 80 + i * 20,
                                vx: -(5 + Math.random() * 3),
                                vy: -3 + Math.random() * 2 + i * 1.5,
                                gravity: 0.12,
                                radius: 10 + Math.random() * 4,
                                active: true,
                                rotation: 0
                            });
                        }, delay * 16);            // approximate frame time
                    }

                    // Speed up attacks as HP drops
                    bossState.attackCooldown = Math.max(40, 80 - (bossState.maxHp - bossState.hp) * 8);
                }

                // Auto-collect gifts during boss fight
                for (let i = gifts.length - 1; i >= 0; i--) {
                    const gift = gifts[i];
                    if (!gift.collected && checkCollision(santa.getHitbox(), gift)) {
                        gift.collected = true;
                        bossState.giftsHeld++;
                        score += 10;

                        // Auto-throw gift at boss
                        playerProjectiles.push({
                            x: santa.x + 40,
                            y: santa.y + 20,
                            vx: 8,
                            vy: -3,
                            gravity: 0.08,
                            active: true,
                            color: gift.color,
                            size: 15
                        });
                    }
                }

                // Spawn gifts more frequently during boss fight
                if (bossState.animFrame % 50 === 0) {
                    gifts.push({
                        x: -20,
                        y: 220 + Math.random() * 60,
                        width: 25,
                        height: 25,
                        color: ['#f44336', '#4caf50', '#2196f3'][Math.floor(Math.random() * 3)],
                        collected: false,
                        bossGift: true              // special flag: these drift right
                    });
                }

                break;

            case 'dying':
                bossState.deathTimer++;
                bossState.shakeX = (Math.random() - 0.5) * (8 - bossState.deathTimer * 0.05);
                bossState.shakeY = (Math.random() - 0.5) * 4;
                bossState.y += 0.5;

                if (bossState.deathTimer > 120) {
                    bossState.phase = 'done';
                    score += 500;
                    bossDefeatedTimer = 180;        // 3 seconds invincibility
                    waveAnnouncement = { text: 'BOSS DEFEATED!', timer: 150 };

                    // Bonus gift shower
                    for (let i = 0; i < 10; i++) {
                        gifts.push({
                            x: bossState.x + Math.random() * bossState.width,
                            y: bossState.y + Math.random() * 80,
                            width: 25,
                            height: 25,
                            color: ['#f44336', '#4caf50', '#ffd700'][Math.floor(Math.random() * 3)],
                            collected: false
                        });
                    }

                    bossState = null;
                    bossProjectiles = [];
                    playerProjectiles = [];
                }
                break;
        }

        if (!bossState) return;

        // Update boss projectiles
        for (let i = bossProjectiles.length - 1; i >= 0; i--) {
            const p = bossProjectiles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += p.gravity;
            p.rotation += 0.1;

            if (p.y > 345 || p.x < -30) {
                bossProjectiles.splice(i, 1);
                continue;
            }

            // Hit Santa
            if (p.active) {
                const pHit = { x: p.x - p.radius, y: p.y - p.radius, width: p.radius * 2, height: p.radius * 2 };
                if (checkCollision(santa.getHitbox(), pHit)) {
                    if (bossDefeatedTimer <= 0) {
                        return 'hit';              // Santa got hit by boss projectile
                    }
                }
            }
        }

        // Update player projectiles (gifts thrown at boss)
        for (let i = playerProjectiles.length - 1; i >= 0; i--) {
            const p = playerProjectiles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += p.gravity;

            if (p.x > canvas.width + 20 || p.y > 350) {
                playerProjectiles.splice(i, 1);
                continue;
            }

            // Hit boss
            if (p.active && bossState && bossState.phase === 'fighting') {
                const bossHit = {
                    x: bossState.x,
                    y: bossState.y + 30,
                    width: bossState.width * 0.6,
                    height: bossState.height * 0.7
                };
                const pHit = { x: p.x - p.size / 2, y: p.y - p.size / 2, width: p.size, height: p.size };
                if (checkCollision(pHit, bossHit)) {
                    p.active = false;
                    playerProjectiles.splice(i, 1);
                    damageBoss();
                }
            }
        }

        // Update boss-fight gifts (drift right toward Santa)
        gifts.forEach(g => {
            if (g.bossGift && !g.collected) {
                g.x += 2;
            }
        });

        return null;
    }

    function damageBoss() {
        if (!bossState || bossState.phase !== 'fighting') return;

        bossState.hp--;
        bossState.hitFlash = 12;
        bossState.shakeX = (Math.random() - 0.5) * 10;

        if (bossState.hp <= 0) {
            bossState.phase = 'dying';
            bossState.deathTimer = 0;
        }
    }

    function drawBoss() {
        if (!bossState) return;

        ctx.save();

        const bx = bossState.x + bossState.shakeX;
        const by = bossState.y + bossState.shakeY;

        // Death fade
        if (bossState.phase === 'dying') {
            ctx.globalAlpha = Math.max(0, 1 - bossState.deathTimer / 120);
        }

        // Hit flash
        if (bossState.hitFlash > 0 && bossState.hitFlash % 3 === 0) {
            ctx.globalAlpha *= 0.5;
        }

        // ---- ABOMINABLE SNOWMAN BODY ----

        // Shadow on ground
        ctx.fillStyle = 'rgba(0, 0, 50, 0.2)';
        ctx.beginPath();
        ctx.ellipse(bx + 90, 338, 70, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Feet
        ctx.fillStyle = '#cfd8dc';
        ctx.beginPath();
        ctx.ellipse(bx + 50, by + 215, 28, 12, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(bx + 120, by + 215, 28, 12, 0.2, 0, Math.PI * 2);
        ctx.fill();

        // Toes/claws on feet
        ctx.fillStyle = '#90a4ae';
        for (let foot = 0; foot < 2; foot++) {
            const fx = foot === 0 ? bx + 30 : bx + 105;
            for (let t = 0; t < 3; t++) {
                ctx.beginPath();
                ctx.arc(fx + t * 10, by + 222, 4, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Legs
        ctx.fillStyle = '#e8eaf0';
        ctx.fillRect(bx + 35, by + 175, 35, 45);
        ctx.fillRect(bx + 100, by + 175, 35, 45);

        // Lower body (large, round)
        ctx.fillStyle = '#eceff1';
        ctx.beginPath();
        ctx.ellipse(bx + 85, by + 160, 75, 50, 0, 0, Math.PI * 2);
        ctx.fill();

        // Upper body / chest
        const bodyGrad = ctx.createRadialGradient(bx + 85, by + 100, 10, bx + 85, by + 110, 80);
        bodyGrad.addColorStop(0, '#f5f5f5');
        bodyGrad.addColorStop(1, '#cfd8dc');
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.ellipse(bx + 85, by + 105, 70, 65, 0, 0, Math.PI * 2);
        ctx.fill();

        // Chest fur detail
        ctx.strokeStyle = 'rgba(176, 190, 197, 0.4)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 8; i++) {
            const fy = by + 75 + i * 12;
            ctx.beginPath();
            ctx.moveTo(bx + 55, fy);
            ctx.quadraticCurveTo(bx + 85, fy + 5 + Math.sin(i) * 3, bx + 115, fy);
            ctx.stroke();
        }

        // Arms
        const armWave = bossState.throwAnim > 0
            ? Math.sin(bossState.throwAnim * 0.3) * 0.5
            : Math.sin(bossState.animFrame * 0.03) * 0.1;

        // Left arm
        ctx.fillStyle = '#e0e3e7';
        ctx.save();
        ctx.translate(bx + 20, by + 80);
        ctx.rotate(-0.4 + armWave);
        ctx.beginPath();
        ctx.ellipse(0, 25, 18, 35, 0, 0, Math.PI * 2);
        ctx.fill();
        // Claws
        ctx.fillStyle = '#78909c';
        for (let c = 0; c < 3; c++) {
            ctx.beginPath();
            ctx.arc(-8 + c * 8, 58, 4, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        // Right arm (throwing arm)
        ctx.fillStyle = '#e0e3e7';
        ctx.save();
        ctx.translate(bx + 150, by + 80);
        const throwAngle = bossState.throwAnim > 10 ? -0.8 : 0.3 - armWave;
        ctx.rotate(throwAngle);
        ctx.beginPath();
        ctx.ellipse(0, 25, 18, 35, 0, 0, Math.PI * 2);
        ctx.fill();
        // Claws
        ctx.fillStyle = '#78909c';
        for (let c = 0; c < 3; c++) {
            ctx.beginPath();
            ctx.arc(-8 + c * 8, 58, 4, 0, Math.PI * 2);
            ctx.fill();
        }

        // Snowball in hand during throw windup
        if (bossState.throwAnim > 10) {
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.arc(0, 60, 10, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        // Head
        const headGrad = ctx.createRadialGradient(bx + 85, by + 30, 5, bx + 85, by + 35, 40);
        headGrad.addColorStop(0, '#ffffff');
        headGrad.addColorStop(1, '#cfd8dc');
        ctx.fillStyle = headGrad;
        ctx.beginPath();
        ctx.ellipse(bx + 85, by + 35, 40, 38, 0, 0, Math.PI * 2);
        ctx.fill();

        // Brow ridge
        ctx.fillStyle = '#b0bec5';
        ctx.beginPath();
        ctx.ellipse(bx + 85, by + 20, 35, 8, 0, Math.PI, Math.PI * 2);
        ctx.fill();

        // Eyes (icy blue, glowing)
        const eyeGlow = 0.5 + 0.5 * Math.sin(bossState.animFrame * 0.08);

        // Left eye
        ctx.fillStyle = '#e3f2fd';
        ctx.beginPath();
        ctx.ellipse(bx + 68, by + 28, 10, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(33, 150, 243, ${0.7 + eyeGlow * 0.3})`;
        ctx.shadowColor = '#2196f3';
        ctx.shadowBlur = 8 * eyeGlow;
        ctx.beginPath();
        ctx.arc(bx + 68, by + 28, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0d47a1';
        ctx.beginPath();
        ctx.arc(bx + 67, by + 28, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Right eye
        ctx.fillStyle = '#e3f2fd';
        ctx.beginPath();
        ctx.ellipse(bx + 102, by + 28, 10, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(33, 150, 243, ${0.7 + eyeGlow * 0.3})`;
        ctx.shadowColor = '#2196f3';
        ctx.shadowBlur = 8 * eyeGlow;
        ctx.beginPath();
        ctx.arc(bx + 102, by + 28, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0d47a1';
        ctx.beginPath();
        ctx.arc(bx + 101, by + 28, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Angry eyebrows
        ctx.strokeStyle = '#78909c';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(bx + 56, by + 17);
        ctx.lineTo(bx + 75, by + 21);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(bx + 114, by + 17);
        ctx.lineTo(bx + 95, by + 21);
        ctx.stroke();

        // Nose
        ctx.fillStyle = '#b0bec5';
        ctx.beginPath();
        ctx.moveTo(bx + 85, by + 32);
        ctx.lineTo(bx + 80, by + 42);
        ctx.lineTo(bx + 90, by + 42);
        ctx.closePath();
        ctx.fill();

        // Mouth (roaring or snarling)
        const mouthOpen = bossState.roarTimer > 0
            ? 12 + Math.sin(bossState.roarTimer * 0.3) * 5
            : 5 + Math.sin(bossState.animFrame * 0.05) * 2;
        ctx.fillStyle = '#37474f';
        ctx.beginPath();
        ctx.ellipse(bx + 85, by + 52, 18, mouthOpen, 0, 0, Math.PI * 2);
        ctx.fill();

        // Teeth (upper)
        ctx.fillStyle = '#eceff1';
        for (let t = 0; t < 5; t++) {
            ctx.beginPath();
            ctx.moveTo(bx + 70 + t * 8, by + 46);
            ctx.lineTo(bx + 73 + t * 8, by + 50);
            ctx.lineTo(bx + 67 + t * 8, by + 50);
            ctx.closePath();
            ctx.fill();
        }

        // Fangs
        ctx.fillStyle = '#eceff1';
        ctx.beginPath();
        ctx.moveTo(bx + 70, by + 46);
        ctx.lineTo(bx + 72, by + 55);
        ctx.lineTo(bx + 68, by + 50);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(bx + 100, by + 46);
        ctx.lineTo(bx + 98, by + 55);
        ctx.lineTo(bx + 102, by + 50);
        ctx.closePath();
        ctx.fill();

        // Horns / ice spikes on head
        ctx.fillStyle = '#b3e5fc';
        ctx.beginPath();
        ctx.moveTo(bx + 55, by + 8);
        ctx.lineTo(bx + 45, by - 20);
        ctx.lineTo(bx + 65, by + 5);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(bx + 115, by + 8);
        ctx.lineTo(bx + 125, by - 20);
        ctx.lineTo(bx + 105, by + 5);
        ctx.closePath();
        ctx.fill();

        // HP Bar above boss
        if (bossState.phase === 'fighting' || bossState.phase === 'dying') {
            const barWidth = 140;
            const barHeight = 10;
            const barX = bx + 85 - barWidth / 2;
            const barY = by - 35;

            // Background
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4);

            // HP fill
            const hpRatio = bossState.hp / bossState.maxHp;
            const hpColor = hpRatio > 0.5 ? '#4caf50' : (hpRatio > 0.25 ? '#ff9800' : '#f44336');
            ctx.fillStyle = hpColor;
            ctx.fillRect(barX, barY, barWidth * hpRatio, barHeight);

            // HP segments
            ctx.strokeStyle = 'rgba(0,0,0,0.3)';
            ctx.lineWidth = 1;
            for (let s = 1; s < bossState.maxHp; s++) {
                const sx = barX + (barWidth / bossState.maxHp) * s;
                ctx.beginPath();
                ctx.moveTo(sx, barY);
                ctx.lineTo(sx, barY + barHeight);
                ctx.stroke();
            }

            // Label
            ctx.font = 'bold 11px Arial';
            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            ctx.fillText('ABOMINABLE SNOWMAN', bx + 85, barY - 6);
        }

        ctx.restore();

        // Draw boss projectiles (snowballs)
        bossProjectiles.forEach(p => {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation);

            // Snowball
            const sg = ctx.createRadialGradient(-2, -2, 1, 0, 0, p.radius);
            sg.addColorStop(0, '#ffffff');
            sg.addColorStop(0.7, '#e1f5fe');
            sg.addColorStop(1, '#b3e5fc');
            ctx.fillStyle = sg;
            ctx.beginPath();
            ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
            ctx.fill();

            // Snow chunks
            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            ctx.beginPath();
            ctx.arc(p.radius * 0.5, -p.radius * 0.3, 3, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        });

        // Draw player projectiles (gifts thrown at boss)
        playerProjectiles.forEach(p => {
            if (!p.active) return;
            ctx.save();
            ctx.translate(p.x, p.y);

            // Gift box
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);

            // Ribbon
            ctx.fillStyle = '#ffd700';
            ctx.fillRect(-1, -p.size / 2, 2, p.size);
            ctx.fillRect(-p.size / 2, -1, p.size, 2);

            // Sparkle trail
            ctx.fillStyle = 'rgba(255, 215, 0, 0.5)';
            ctx.beginPath();
            ctx.arc(-8, 2, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(-14, 5, 2, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        });

        // Roar effect
        if (bossState && bossState.roarTimer > 0) {
            const roarAlpha = bossState.roarTimer / 45;
            ctx.save();
            ctx.font = 'bold 48px Arial';
            ctx.fillStyle = `rgba(255, 0, 0, ${roarAlpha * 0.6})`;
            ctx.textAlign = 'center';
            ctx.fillText('ROARRR!', canvas.width / 2, 60);
            ctx.restore();
        }
    }

    // ---------- BOSS TRIGGER CHECK ----------

    function checkBossTrigger() {
        if (bossState) return;                    // already in boss fight

        // Trigger every 2000m
        const bossThreshold = Math.floor(distance / 2000);
        if (bossThreshold > 0 && bossThreshold > lastBossDistance) {
            lastBossDistance = bossThreshold;
            initBoss();
        }
    }

    // ---------- MASTER UPDATE (call from game loop) ----------

    function updateAdvancedEnemies() {
        // Pattern cooldown
        if (patternCooldown > 0) patternCooldown--;

        // Apply santa effects
        applyEffectsToSanta();

        // Check for boss trigger
        checkBossTrigger();

        // If boss is active, update boss
        if (isBossActive()) {
            const bossResult = updateBoss();
            if (bossResult === 'hit') return 'death';

            // During boss fight, don't update normal advanced obstacles
        } else {
            // Spawn wave-based obstacles
            spawnWaveObstacle();
            spawnWaveGift();
        }

        // Update all advanced obstacles
        for (let i = advancedObstacles.length - 1; i >= 0; i--) {
            updateAdvancedObstacle(advancedObstacles[i]);

            // Remove inactive
            if (!advancedObstacles[i].active) {
                advancedObstacles.splice(i, 1);
            }
        }

        // Check collisions with advanced obstacles
        if (checkAdvancedCollisions()) {
            return 'death';
        }

        return null;
    }

    // ---------- MASTER DRAW (call from game loop) ----------

    function drawAdvancedEnemies() {
        // Draw all advanced obstacles
        advancedObstacles.forEach(obs => {
            drawAdvancedObstacle(obs);
        });

        // Draw boss if active
        if (bossState) {
            drawBoss();
        }

        // Draw effects overlay (ice, wind, invincibility)
        drawEffectsOverlay();

        // Draw wave announcement
        drawWaveAnnouncement();
    }

    // ---------- RESET ----------

    function resetAdvancedEnemies() {
        advancedObstacles = [];
        bossState = null;
        bossProjectiles = [];
        playerProjectiles = [];
        lastBossDistance = 0;
        patternCooldown = 0;
        lastAdvancedSpawnFrame = 0;
        slideEffect = null;
        windEffect = null;
        bossDefeatedTimer = 0;
        waveAnnouncement = null;
        lastWave = 0;
    }

    // ---------- PUBLIC API ----------

    window.AdvancedEnemies = {
        // Type definitions
        advancedObstacleTypes: advancedObstacleTypes,

        // Factory
        createAdvancedObstacle: createAdvancedObstacle,

        // Rendering
        drawAdvancedObstacle: drawAdvancedObstacle,
        drawAdvancedEnemies: drawAdvancedEnemies,

        // Updates
        updateAdvancedObstacle: updateAdvancedObstacle,
        updateAdvancedEnemies: updateAdvancedEnemies,

        // Wave system
        getCurrentWave: getCurrentWave,
        getSpawnConfig: getSpawnConfig,
        trySpawnPattern: trySpawnPattern,
        spawnWaveObstacle: spawnWaveObstacle,

        // Boss system
        initBoss: initBoss,
        updateBoss: updateBoss,
        drawBoss: drawBoss,
        isBossActive: isBossActive,
        damageBoss: damageBoss,

        // Reset
        resetAdvancedEnemies: resetAdvancedEnemies,

        // Status queries
        isSliding: isSliding,
        isWindAffected: isWindAffected,
        getWindPushback: getWindPushback,
        getBossDefeatedTimer: function () { return bossDefeatedTimer; },

        // Direct access for integration
        getAdvancedObstacles: function () { return advancedObstacles; },
        getBossState: function () { return bossState; }
    };

})();
// ==================== END ADVANCED ENEMIES & OBSTACLES ====================
