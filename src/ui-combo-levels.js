// ==================== UI, COMBO & LEVEL PROGRESSION ====================
// Agent 4: UI, Combo System & Level Progression Module
// Santa Speed Runner - Christmas-themed endless runner
// Requires: ctx, canvas, frameCount, gameSpeed, score, distance, giftsCollected
// Canvas: 800x400
// ========================================================================

(function () {
    'use strict';

    // -------------------------------------------------------
    // Easing helpers (CSS-like curves via math)
    // -------------------------------------------------------
    function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
    function easeInOutCubic(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
    function easeOutBack(t) { const c1 = 1.70158; const c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }
    function easeOutElastic(t) {
        if (t === 0 || t === 1) return t;
        return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / 3) + 1;
    }
    function easeOutQuad(t) { return 1 - (1 - t) * (1 - t); }
    function lerp(a, b, t) { return a + (b - a) * t; }
    function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

    // -------------------------------------------------------
    // 1. COMBO SYSTEM
    // -------------------------------------------------------
    const COMBO_WINDOW = 60; // frames between hits to keep combo alive
    const COMBO_MAX = 5;
    const COMBO_COLORS = [
        '#ffffff',   // x1 white
        '#ffeb3b',   // x2 yellow
        '#ff9800',   // x3 orange
        '#f44336',   // x4 red
        null         // x5 rainbow (handled specially)
    ];

    const combo = {
        count: 0,
        timer: 0,            // frames since last gift
        multiplier: 1,
        displayScale: 1.0,
        shakeX: 0,
        shakeY: 0,
        lostTimer: 0,        // countdown for "COMBO LOST!" text
        lostAlpha: 0,
        popTimer: 0,         // visual pop on hit
        active: false
    };

    function resetCombo() {
        combo.count = 0;
        combo.timer = 0;
        combo.multiplier = 1;
        combo.displayScale = 1.0;
        combo.shakeX = 0;
        combo.shakeY = 0;
        combo.lostTimer = 0;
        combo.lostAlpha = 0;
        combo.popTimer = 0;
        combo.active = false;
    }

    function addComboHit() {
        if (combo.count > 0 && combo.timer > COMBO_WINDOW) {
            // combo already broken, start fresh
            combo.count = 0;
        }
        combo.count++;
        combo.timer = 0;
        combo.active = true;
        combo.multiplier = Math.min(combo.count, COMBO_MAX);
        combo.popTimer = 15; // pop animation frames
        combo.displayScale = 1.4 + combo.multiplier * 0.1;
        combo.shakeX = (Math.random() - 0.5) * 8 * combo.multiplier;
        combo.shakeY = (Math.random() - 0.5) * 6 * combo.multiplier;
        combo.lostTimer = 0;
        combo.lostAlpha = 0;
        return combo.multiplier;
    }

    function getComboMultiplier() {
        return combo.active ? combo.multiplier : 1;
    }

    function updateCombo() {
        if (!combo.active) return;

        combo.timer++;

        // Animate display scale back to 1.0
        if (combo.displayScale > 1.0) {
            combo.displayScale = lerp(combo.displayScale, 1.0, 0.12);
            if (combo.displayScale < 1.01) combo.displayScale = 1.0;
        }

        // Shake decay
        combo.shakeX *= 0.85;
        combo.shakeY *= 0.85;

        // Pop timer
        if (combo.popTimer > 0) combo.popTimer--;

        // Check if combo expired
        if (combo.timer > COMBO_WINDOW && combo.count > 1) {
            // Break the combo
            combo.lostTimer = 90; // show "COMBO LOST!" for 1.5s
            combo.lostAlpha = 1.0;
            combo.count = 0;
            combo.multiplier = 1;
            combo.active = false;
        }

        // Fade "COMBO LOST!"
        if (combo.lostTimer > 0) {
            combo.lostTimer--;
            if (combo.lostTimer < 30) {
                combo.lostAlpha = combo.lostTimer / 30;
            }
        }
    }

    function _getRainbowColor(frame) {
        const r = Math.sin(frame * 0.05) * 127 + 128;
        const g = Math.sin(frame * 0.05 + 2.094) * 127 + 128;
        const b = Math.sin(frame * 0.05 + 4.189) * 127 + 128;
        return 'rgb(' + Math.floor(r) + ',' + Math.floor(g) + ',' + Math.floor(b) + ')';
    }

    function drawCombo(ctx, frameCount) {
        // Draw "COMBO LOST!" text
        if (combo.lostTimer > 0 && combo.lostAlpha > 0) {
            ctx.save();
            ctx.globalAlpha = combo.lostAlpha;
            ctx.font = 'bold 28px "Segoe UI", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Slide up animation
            var lostY = 160 - (90 - combo.lostTimer) * 0.5;

            ctx.fillStyle = '#ff1744';
            ctx.shadowColor = '#ff1744';
            ctx.shadowBlur = 12;
            ctx.fillText('COMBO LOST!', 400, lostY);
            ctx.shadowBlur = 0;
            ctx.restore();
        }

        // Active combo display
        if (!combo.active || combo.multiplier <= 1) return;

        ctx.save();

        var cx = 400 + combo.shakeX;
        var cy = 120 + combo.shakeY;

        var scale = combo.displayScale;
        ctx.translate(cx, cy);
        ctx.scale(scale, scale);

        // Color
        var colorIdx = combo.multiplier - 1;
        var color;
        if (colorIdx >= 4) {
            color = _getRainbowColor(frameCount);
        } else {
            color = COMBO_COLORS[colorIdx];
        }

        // Glow
        ctx.shadowColor = color;
        ctx.shadowBlur = 15 + combo.multiplier * 3;

        ctx.font = 'bold ' + (36 + combo.multiplier * 4) + 'px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Outline
        ctx.strokeStyle = 'rgba(0,0,0,0.6)';
        ctx.lineWidth = 4;
        ctx.strokeText('x' + combo.multiplier + ' COMBO!', 0, 0);

        // Fill
        ctx.fillStyle = color;
        ctx.fillText('x' + combo.multiplier + ' COMBO!', 0, 0);

        // Pop ring effect
        if (combo.popTimer > 0) {
            var progress = 1 - combo.popTimer / 15;
            var radius = 40 + progress * 60;
            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
            ctx.strokeStyle = color;
            ctx.lineWidth = 3 * (1 - progress);
            ctx.globalAlpha = 1 - progress;
            ctx.stroke();
        }

        ctx.restore();
    }

    // -------------------------------------------------------
    // 2. LEVEL / ENVIRONMENT PROGRESSION
    // -------------------------------------------------------
    var levelConfigs = [
        {
            id: 1,
            name: 'Snowy Village',
            startDistance: 0,
            endDistance: 1000,
            skyTop: '#0c1445',
            skyBottom: '#3949ab',
            groundColor: '#e8e8e8',
            accentColor: '#bbdefb'
        },
        {
            id: 2,
            name: 'Frozen Forest',
            startDistance: 1000,
            endDistance: 2500,
            skyTop: '#0d2818',
            skyBottom: '#1b5e20',
            groundColor: '#c8e6c9',
            accentColor: '#69f0ae'
        },
        {
            id: 3,
            name: 'Mountain Pass',
            startDistance: 2500,
            endDistance: 4000,
            skyTop: '#1a0033',
            skyBottom: '#4a148c',
            groundColor: '#d1c4e9',
            accentColor: '#b388ff'
        },
        {
            id: 4,
            name: 'Ice Cave',
            startDistance: 4000,
            endDistance: 6000,
            skyTop: '#002040',
            skyBottom: '#006090',
            groundColor: '#b3e5fc',
            accentColor: '#80d8ff'
        },
        {
            id: 5,
            name: 'Rooftop Run',
            startDistance: 6000,
            endDistance: Infinity,
            skyTop: '#ff6f00',
            skyBottom: '#f48fb1',
            groundColor: '#4a4a4a',
            accentColor: '#ffd54f'
        }
    ];

    var levelState = {
        current: 0,           // index in levelConfigs
        transitionTimer: 0,   // >0 means currently transitioning
        transitionDuration: 90,
        flashAlpha: 0,
        nameShowTimer: 0,
        nameAlpha: 0,
        nameScale: 1,
        prevColors: null,
        blendT: 0
    };

    function getCurrentLevel() {
        return levelState.current + 1; // 1-based for display
    }

    function getLevelConfig(dist) {
        dist = (typeof dist === 'number') ? dist : 0;
        for (var i = levelConfigs.length - 1; i >= 0; i--) {
            if (dist >= levelConfigs[i].startDistance) {
                return levelConfigs[i];
            }
        }
        return levelConfigs[0];
    }

    function checkLevelTransition(dist) {
        var newIdx = 0;
        for (var i = levelConfigs.length - 1; i >= 0; i--) {
            if (dist >= levelConfigs[i].startDistance) {
                newIdx = i;
                break;
            }
        }
        if (newIdx !== levelState.current) {
            levelState.prevColors = {
                skyTop: levelConfigs[levelState.current].skyTop,
                skyBottom: levelConfigs[levelState.current].skyBottom,
                groundColor: levelConfigs[levelState.current].groundColor
            };
            levelState.current = newIdx;
            levelState.transitionTimer = levelState.transitionDuration;
            levelState.flashAlpha = 1.0;
            levelState.nameShowTimer = 180; // 3 seconds
            levelState.nameAlpha = 0;
            levelState.nameScale = 2.5;
            levelState.blendT = 0;
        }
    }

    function drawLevelTransition(ctx) {
        if (levelState.transitionTimer <= 0 && levelState.nameShowTimer <= 0) return;

        // Transition flash
        if (levelState.transitionTimer > 0) {
            levelState.transitionTimer--;
            levelState.blendT = 1 - levelState.transitionTimer / levelState.transitionDuration;

            // White flash at start of transition
            if (levelState.flashAlpha > 0) {
                ctx.save();
                ctx.globalAlpha = levelState.flashAlpha;
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, 800, 400);
                ctx.restore();
                levelState.flashAlpha -= 0.04;
                if (levelState.flashAlpha < 0) levelState.flashAlpha = 0;
            }
        }

        // Level name display
        if (levelState.nameShowTimer > 0) {
            levelState.nameShowTimer--;

            // Animate in
            if (levelState.nameShowTimer > 150) {
                var tIn = (180 - levelState.nameShowTimer) / 30;
                levelState.nameAlpha = easeOutCubic(clamp(tIn, 0, 1));
                levelState.nameScale = lerp(2.5, 1.0, easeOutBack(clamp(tIn, 0, 1)));
            }
            // Hold
            else if (levelState.nameShowTimer > 30) {
                levelState.nameAlpha = 1.0;
                levelState.nameScale = 1.0;
            }
            // Animate out
            else {
                var tOut = levelState.nameShowTimer / 30;
                levelState.nameAlpha = easeOutQuad(tOut);
                levelState.nameScale = lerp(0.8, 1.0, tOut);
            }

            var config = levelConfigs[levelState.current];
            ctx.save();
            ctx.globalAlpha = levelState.nameAlpha;
            ctx.translate(400, 180);
            ctx.scale(levelState.nameScale, levelState.nameScale);

            // Shadow
            ctx.font = 'bold 18px "Segoe UI", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillText('LEVEL ' + config.id, 2, -18);

            ctx.font = 'bold 32px "Segoe UI", sans-serif';
            ctx.fillText(config.name.toUpperCase(), 2, 18);

            // Main text
            ctx.font = 'bold 18px "Segoe UI", sans-serif';
            ctx.fillStyle = config.accentColor;
            ctx.shadowColor = config.accentColor;
            ctx.shadowBlur = 20;
            ctx.fillText('LEVEL ' + config.id, 0, -16);

            ctx.font = 'bold 32px "Segoe UI", sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = '#ffffff';
            ctx.shadowBlur = 15;
            ctx.fillText(config.name.toUpperCase(), 0, 18);

            ctx.restore();
        }
    }

    // -- Helper: parse hex color to {r,g,b} --
    function _hexToRgb(hex) {
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    }

    function _blendHex(hexA, hexB, t) {
        var a = _hexToRgb(hexA);
        var b = _hexToRgb(hexB);
        var r = Math.round(lerp(a.r, b.r, t));
        var g = Math.round(lerp(a.g, b.g, t));
        var bl = Math.round(lerp(a.b, b.b, t));
        return 'rgb(' + r + ',' + g + ',' + bl + ')';
    }

    function _getCurrentSkyColors(config) {
        // During transition, blend from prev to new
        if (levelState.transitionTimer > 0 && levelState.prevColors) {
            var t = easeInOutCubic(levelState.blendT);
            return {
                skyTop: _blendHex(levelState.prevColors.skyTop, config.skyTop, t),
                skyBottom: _blendHex(levelState.prevColors.skyBottom, config.skyBottom, t),
                groundColor: _blendHex(levelState.prevColors.groundColor, config.groundColor, t)
            };
        }
        return {
            skyTop: config.skyTop,
            skyBottom: config.skyBottom,
            groundColor: config.groundColor
        };
    }

    // -- Level-specific background elements --

    function _drawLevel1Background(ctx, fc, gs) {
        // Snowy Village: handled by existing drawBackground (moon, stars, houses, mountains)
        // We add subtle falling snow and cozy glow
        // Stars
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        for (var i = 0; i < 20; i++) {
            var sx = (i * 47 + fc * 0.1) % 800;
            var sy = 20 + (i * 23) % 100;
            var twinkle = 0.5 + 0.5 * Math.sin(fc * 0.08 + i);
            ctx.globalAlpha = twinkle;
            ctx.beginPath();
            ctx.arc(sx, sy, 1.2, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Moon
        ctx.fillStyle = '#fff9c4';
        ctx.beginPath();
        ctx.arc(700, 60, 30, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0c1445';
        ctx.beginPath();
        ctx.arc(710, 55, 25, 0, Math.PI * 2);
        ctx.fill();
    }

    function _drawLevel2Background(ctx, fc, gs) {
        // Frozen Forest: northern lights + dense tree parallax

        // Stars
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        for (var i = 0; i < 25; i++) {
            var sx = (i * 37 + fc * 0.08) % 800;
            var sy = 15 + (i * 19) % 80;
            var tw = 0.4 + 0.6 * Math.sin(fc * 0.06 + i * 0.8);
            ctx.globalAlpha = tw;
            ctx.beginPath();
            ctx.arc(sx, sy, 1, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Northern lights
        ctx.save();
        for (var band = 0; band < 3; band++) {
            var gradient = ctx.createLinearGradient(0, 30 + band * 25, 800, 30 + band * 25);
            var hue1 = (fc * 0.3 + band * 60) % 360;
            var hue2 = (hue1 + 40) % 360;
            gradient.addColorStop(0, 'hsla(' + hue1 + ',80%,60%,0)');
            gradient.addColorStop(0.3, 'hsla(' + hue1 + ',80%,60%,0.12)');
            gradient.addColorStop(0.5, 'hsla(' + hue2 + ',70%,50%,0.18)');
            gradient.addColorStop(0.7, 'hsla(' + hue1 + ',80%,60%,0.12)');
            gradient.addColorStop(1, 'hsla(' + hue2 + ',80%,60%,0)');
            ctx.fillStyle = gradient;

            ctx.beginPath();
            for (var px = 0; px <= 800; px += 10) {
                var py = 50 + band * 20 + Math.sin(px * 0.008 + fc * 0.02 + band) * 20
                    + Math.sin(px * 0.015 + fc * 0.01) * 10;
                if (px === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            for (var px2 = 800; px2 >= 0; px2 -= 10) {
                var py2 = 80 + band * 20 + Math.sin(px2 * 0.008 + fc * 0.02 + band) * 20
                    + Math.sin(px2 * 0.015 + fc * 0.01) * 10;
                ctx.lineTo(px2, py2);
            }
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();

        // Dense trees in background layers
        for (var layer = 0; layer < 3; layer++) {
            var alpha = 0.25 + layer * 0.15;
            var treeH = 60 + layer * 20;
            var parallax = 0.3 + layer * 0.4;
            var baseY = 340 - layer * 15;
            ctx.fillStyle = 'rgba(' + (10 + layer * 15) + ',' + (50 + layer * 20) + ',' + (20 + layer * 10) + ',' + alpha + ')';

            for (var t = 0; t < 12; t++) {
                var tx = ((t * 80 + layer * 30 - fc * parallax) % 960) - 80;
                if (tx < -60) tx += 960;

                // Tree triangle
                ctx.beginPath();
                ctx.moveTo(tx, baseY);
                ctx.lineTo(tx + 20 + layer * 5, baseY - treeH);
                ctx.lineTo(tx + 40 + layer * 10, baseY);
                ctx.closePath();
                ctx.fill();
            }
        }
    }

    function _drawLevel3Background(ctx, fc, gs) {
        // Mountain Pass: large mountains, wind, purple twilight, more stars

        // Many stars
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        for (var i = 0; i < 45; i++) {
            var sx = (i * 31 + fc * 0.05) % 800;
            var sy = 10 + (i * 17) % 110;
            var tw = 0.3 + 0.7 * Math.sin(fc * 0.1 + i * 1.2);
            ctx.globalAlpha = tw;
            var sz = (i % 3 === 0) ? 2 : 1;
            ctx.beginPath();
            ctx.arc(sx, sy, sz, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Large mountains parallax
        for (var m = 0; m < 5; m++) {
            var mParallax = 0.15 + m * 0.1;
            var mHeight = 140 - m * 15;
            var mWidth = 280 - m * 20;
            var mX = ((m * 200 + 50 - fc * mParallax) % (800 + mWidth)) - mWidth * 0.5;
            if (mX < -mWidth) mX += 800 + mWidth;

            var grad = ctx.createLinearGradient(mX, 340 - mHeight, mX, 340);
            var darkness = 0.3 + m * 0.12;
            grad.addColorStop(0, 'rgba(60,20,80,' + darkness + ')');
            grad.addColorStop(1, 'rgba(30,10,50,' + (darkness * 0.5) + ')');
            ctx.fillStyle = grad;

            ctx.beginPath();
            ctx.moveTo(mX, 340);
            ctx.lineTo(mX + mWidth * 0.5, 340 - mHeight);
            ctx.lineTo(mX + mWidth, 340);
            ctx.closePath();
            ctx.fill();

            // Snow cap
            ctx.fillStyle = 'rgba(255,255,255,' + (0.6 + m * 0.08) + ')';
            ctx.beginPath();
            ctx.moveTo(mX + mWidth * 0.5, 340 - mHeight);
            ctx.lineTo(mX + mWidth * 0.5 - 20, 340 - mHeight + 25);
            ctx.lineTo(mX + mWidth * 0.5 + 20, 340 - mHeight + 25);
            ctx.closePath();
            ctx.fill();
        }

        // Wind streaks
        ctx.save();
        ctx.strokeStyle = 'rgba(200,180,255,0.15)';
        ctx.lineWidth = 1;
        for (var w = 0; w < 8; w++) {
            var wy = 80 + w * 30 + Math.sin(fc * 0.05 + w) * 10;
            var wx = (fc * 3 + w * 120) % 1000 - 100;
            var wLen = 60 + Math.sin(w) * 30;
            ctx.beginPath();
            ctx.moveTo(wx, wy);
            ctx.lineTo(wx + wLen, wy - 3);
            ctx.stroke();
        }
        ctx.restore();
    }

    function _drawLevel4Background(ctx, fc, gs) {
        // Ice Cave: icicles from top, crystal blue, sparkling ice, reflective floor

        // Crystal blue background shimmer
        for (var s = 0; s < 20; s++) {
            var sx = (s * 53 + Math.sin(fc * 0.03 + s) * 30) % 800;
            var sy = 30 + (s * 41) % 250;
            var sz = 1 + Math.sin(fc * 0.08 + s * 2) * 1;
            if (sz > 0) {
                ctx.fillStyle = 'rgba(150,220,255,' + (0.2 + 0.3 * Math.sin(fc * 0.1 + s)) + ')';
                ctx.beginPath();
                ctx.arc(sx, sy, sz, 0, Math.PI * 2);
                ctx.fill();

                // Sparkle cross
                if (Math.sin(fc * 0.15 + s * 3) > 0.7) {
                    ctx.strokeStyle = 'rgba(200,240,255,0.4)';
                    ctx.lineWidth = 0.5;
                    ctx.beginPath();
                    ctx.moveTo(sx - 4, sy);
                    ctx.lineTo(sx + 4, sy);
                    ctx.moveTo(sx, sy - 4);
                    ctx.lineTo(sx, sy + 4);
                    ctx.stroke();
                }
            }
        }

        // Icicles from the top
        for (var ic = 0; ic < 15; ic++) {
            var icx = (ic * 58 + 10 - fc * 0.2) % 870 - 35;
            if (icx < -30) icx += 870;
            var icLen = 30 + (ic * 7) % 40;
            var icW = 6 + (ic % 4) * 2;

            var icicleGrad = ctx.createLinearGradient(icx, 0, icx, icLen);
            icicleGrad.addColorStop(0, 'rgba(180,230,255,0.7)');
            icicleGrad.addColorStop(0.5, 'rgba(120,200,255,0.5)');
            icicleGrad.addColorStop(1, 'rgba(100,180,255,0.1)');
            ctx.fillStyle = icicleGrad;

            ctx.beginPath();
            ctx.moveTo(icx - icW / 2, 0);
            ctx.lineTo(icx + icW / 2, 0);
            ctx.lineTo(icx, icLen);
            ctx.closePath();
            ctx.fill();

            // Highlight
            ctx.strokeStyle = 'rgba(255,255,255,0.4)';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(icx - 1, 2);
            ctx.lineTo(icx - 1, icLen * 0.6);
            ctx.stroke();
        }

        // Reflective ice floor (subtle mirror)
        ctx.save();
        var floorGrad = ctx.createLinearGradient(0, 335, 0, 345);
        floorGrad.addColorStop(0, 'rgba(150,220,255,0.3)');
        floorGrad.addColorStop(1, 'rgba(150,220,255,0)');
        ctx.fillStyle = floorGrad;
        ctx.fillRect(0, 335, 800, 10);

        // Moving light reflections on floor
        for (var r = 0; r < 6; r++) {
            var rx = (r * 150 + fc * 1.5) % 900 - 50;
            ctx.fillStyle = 'rgba(200,240,255,' + (0.1 + 0.05 * Math.sin(fc * 0.06 + r)) + ')';
            ctx.fillRect(rx, 340, 60, 3);
        }
        ctx.restore();
    }

    function _drawLevel5Background(ctx, fc, gs) {
        // Rooftop Run: above clouds, sunrise, rooftop silhouettes

        // Sun (low on horizon)
        var sunY = 260 + Math.sin(fc * 0.005) * 5;
        var sunGrad = ctx.createRadialGradient(400, sunY, 20, 400, sunY, 200);
        sunGrad.addColorStop(0, 'rgba(255,200,50,0.8)');
        sunGrad.addColorStop(0.3, 'rgba(255,150,50,0.3)');
        sunGrad.addColorStop(1, 'rgba(255,100,50,0)');
        ctx.fillStyle = sunGrad;
        ctx.beginPath();
        ctx.arc(400, sunY, 200, 0, Math.PI * 2);
        ctx.fill();

        // Sun disc
        ctx.fillStyle = '#ffdd44';
        ctx.beginPath();
        ctx.arc(400, sunY, 25, 0, Math.PI * 2);
        ctx.fill();

        // Clouds below (parallax)
        for (var c = 0; c < 8; c++) {
            var cx = ((c * 130 + 20 - fc * (0.4 + c * 0.1)) % 1000) - 100;
            if (cx < -120) cx += 1000;
            var cy = 280 + c * 8 + Math.sin(fc * 0.01 + c) * 5;
            var cw = 100 + (c * 23) % 80;

            ctx.fillStyle = 'rgba(255,' + (200 + (c * 10) % 55) + ',' + (180 + (c * 15) % 70) + ',0.4)';
            ctx.beginPath();
            ctx.ellipse(cx + cw / 2, cy, cw / 2, 12 + c * 2, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // Rooftop silhouettes (far background)
        ctx.fillStyle = 'rgba(60,30,20,0.5)';
        for (var rt = 0; rt < 10; rt++) {
            var rtx = ((rt * 100 + 30 - fc * 0.6) % 1100) - 150;
            if (rtx < -100) rtx += 1100;
            var rtw = 50 + (rt * 17) % 40;
            var rth = 20 + (rt * 13) % 30;
            ctx.fillRect(rtx, 320 - rth, rtw, rth + 20);

            // Chimney
            if (rt % 3 === 0) {
                ctx.fillRect(rtx + rtw * 0.3, 320 - rth - 10, 8, 12);
            }
        }

        // Stars (fewer, dawn)
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        for (var st = 0; st < 10; st++) {
            var stx = (st * 73 + fc * 0.02) % 800;
            var sty = 10 + (st * 29) % 80;
            var stTw = 0.2 + 0.3 * Math.sin(fc * 0.12 + st);
            ctx.globalAlpha = stTw;
            ctx.beginPath();
            ctx.arc(stx, sty, 1, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    function drawLevelBackground(ctx, config, frameCount, gameSpeed) {
        var colors = _getCurrentSkyColors(config);

        // Sky gradient
        var skyGrad = ctx.createLinearGradient(0, 0, 0, 340);
        skyGrad.addColorStop(0, colors.skyTop);
        skyGrad.addColorStop(1, colors.skyBottom);
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, 800, 340);

        // Level-specific elements
        switch (config.id) {
            case 1: _drawLevel1Background(ctx, frameCount, gameSpeed); break;
            case 2: _drawLevel2Background(ctx, frameCount, gameSpeed); break;
            case 3: _drawLevel3Background(ctx, frameCount, gameSpeed); break;
            case 4: _drawLevel4Background(ctx, frameCount, gameSpeed); break;
            case 5: _drawLevel5Background(ctx, frameCount, gameSpeed); break;
        }

        // Ground
        ctx.fillStyle = colors.groundColor;
        ctx.fillRect(0, 340, 800, 60);
    }

    // -------------------------------------------------------
    // 3. PAUSE MENU
    // -------------------------------------------------------
    var pauseState = {
        paused: false,
        selectedOption: 0,  // 0=Resume, 1=Quit
        overlayAlpha: 0,
        animTimer: 0
    };

    function togglePause() {
        pauseState.paused = !pauseState.paused;
        pauseState.animTimer = 0;
        pauseState.overlayAlpha = 0;
        pauseState.selectedOption = 0;
    }

    function isPaused() {
        return pauseState.paused;
    }

    function drawPauseMenu(ctx, score, distance, gifts) {
        if (!pauseState.paused) return;

        pauseState.animTimer++;
        pauseState.overlayAlpha = Math.min(pauseState.overlayAlpha + 0.05, 0.7);

        // Darken screen
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,' + pauseState.overlayAlpha + ')';
        ctx.fillRect(0, 0, 800, 400);

        var entryT = easeOutBack(clamp(pauseState.animTimer / 20, 0, 1));

        ctx.translate(400, 200);
        ctx.scale(entryT, entryT);

        // Panel background
        ctx.fillStyle = 'rgba(20,20,40,0.95)';
        _roundRect(ctx, -160, -130, 320, 260, 16);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 2;
        _roundRect(ctx, -160, -130, 320, 260, 16);
        ctx.stroke();

        // "PAUSED" title
        ctx.font = 'bold 36px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(255,255,255,0.3)';
        ctx.shadowBlur = 10;
        ctx.fillText('PAUSED', 0, -90);
        ctx.shadowBlur = 0;

        // Stats
        ctx.font = '16px "Segoe UI", sans-serif';
        ctx.fillStyle = '#aaaacc';
        ctx.fillText('Score: ' + Math.floor(score), 0, -40);
        ctx.fillText('Distance: ' + Math.floor(distance) + 'm', 0, -15);
        ctx.fillText('Gifts: ' + gifts, 0, 10);

        // Buttons
        var options = ['RESUME', 'QUIT'];
        for (var i = 0; i < options.length; i++) {
            var btnY = 55 + i * 50;
            var isSelected = pauseState.selectedOption === i;

            if (isSelected) {
                ctx.fillStyle = '#c62828';
                _roundRect(ctx, -90, btnY - 18, 180, 36, 18);
                ctx.fill();
                ctx.fillStyle = '#ffffff';
            } else {
                ctx.fillStyle = 'rgba(255,255,255,0.1)';
                _roundRect(ctx, -90, btnY - 18, 180, 36, 18);
                ctx.fill();
                ctx.fillStyle = '#888899';
            }

            ctx.font = 'bold 18px "Segoe UI", sans-serif';
            ctx.fillText(options[i], 0, btnY);
        }

        // Instruction
        ctx.font = '12px "Segoe UI", sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.fillText('Arrow keys to select, Enter to confirm', 0, 125);

        ctx.restore();
    }

    function _roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.arcTo(x + w, y, x + w, y + r, r);
        ctx.lineTo(x + w, y + h - r);
        ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
        ctx.lineTo(x + r, y + h);
        ctx.arcTo(x, y + h, x, y + h - r, r);
        ctx.lineTo(x, y + r);
        ctx.arcTo(x, y, x + r, y, r);
        ctx.closePath();
    }

    function getPauseSelectedOption() {
        return pauseState.selectedOption;
    }

    function setPauseSelectedOption(idx) {
        pauseState.selectedOption = clamp(idx, 0, 1);
    }

    // -------------------------------------------------------
    // 4. IMPROVED HUD
    // -------------------------------------------------------
    var hudState = {
        displayScore: 0,      // smoothly animates toward actual score
        displayDistance: 0,
        prevGifts: 0,
        giftPopTimer: 0,
        levelNameAlpha: 1.0,
        distBarFlash: 0
    };

    function _drawMiniGiftIcon(ctx, x, y, size) {
        ctx.save();
        ctx.fillStyle = '#f44336';
        ctx.fillRect(x, y, size, size);
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(x + size / 2 - 1, y, 2, size);
        ctx.fillRect(x, y + size / 2 - 1, size, 2);
        // Bow
        ctx.beginPath();
        ctx.arc(x + size / 2 - 3, y - 1, 2.5, 0, Math.PI * 2);
        ctx.arc(x + size / 2 + 3, y - 1, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    function drawHUD(ctx, score, distance, gifts, comboObj, levelConfig, frameCount, powerUpTimer) {
        // Smooth score counter
        if (hudState.displayScore < score) {
            var diff = score - hudState.displayScore;
            hudState.displayScore += Math.max(1, Math.ceil(diff * 0.1));
            if (hudState.displayScore > score) hudState.displayScore = score;
        }

        // Smooth distance
        hudState.displayDistance = lerp(hudState.displayDistance, distance, 0.15);

        // Gift pop
        if (gifts > hudState.prevGifts) {
            hudState.giftPopTimer = 12;
        }
        hudState.prevGifts = gifts;
        if (hudState.giftPopTimer > 0) hudState.giftPopTimer--;

        ctx.save();

        // -- Score (top-left) --
        ctx.font = 'bold 20px "Segoe UI", sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        // Background pill
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        _roundRect(ctx, 10, 10, 150, 32, 16);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(255,255,255,0.3)';
        ctx.shadowBlur = 4;
        ctx.fillText('Score: ' + Math.floor(hudState.displayScore), 22, 16);
        ctx.shadowBlur = 0;

        // -- Distance + progress bar (top-center) --
        ctx.textAlign = 'center';

        // Background pill
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        _roundRect(ctx, 300, 10, 200, 32, 16);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = '16px "Segoe UI", sans-serif';
        ctx.fillText(Math.floor(hudState.displayDistance) + 'm', 400, 16);

        // Progress bar toward next level
        var cfg = levelConfig || levelConfigs[0];
        var levelStart = cfg.startDistance;
        var levelEnd = cfg.endDistance;
        var progressPct;
        if (levelEnd === Infinity) {
            progressPct = 1.0;
        } else {
            progressPct = clamp((distance - levelStart) / (levelEnd - levelStart), 0, 1);
        }

        // Bar background
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        _roundRect(ctx, 310, 35, 180, 5, 2.5);
        ctx.fill();

        // Bar fill
        var barColor = cfg.accentColor || '#69f0ae';
        ctx.fillStyle = barColor;
        if (progressPct > 0) {
            _roundRect(ctx, 310, 35, 180 * progressPct, 5, 2.5);
            ctx.fill();
        }

        // -- Gift counter (top-right) --
        var giftScale = 1 + (hudState.giftPopTimer / 12) * 0.3;

        ctx.save();
        ctx.translate(720, 26);
        ctx.scale(giftScale, giftScale);

        // Background pill
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        _roundRect(ctx, -40, -16, 100, 32, 16);
        ctx.fill();

        _drawMiniGiftIcon(ctx, -30, -8, 14);

        ctx.font = 'bold 18px "Segoe UI", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#ffd700';
        ctx.fillText('' + gifts, -10, -8);

        ctx.restore();

        // -- Level name indicator (bottom-left) --
        ctx.font = '14px "Segoe UI", sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillText('Level ' + cfg.id + ': ' + cfg.name, 14, 395);

        // -- Combo indicator (if active, drawn separately via drawCombo) --
        // Small indicator on HUD
        if (comboObj && comboObj.active && comboObj.multiplier > 1) {
            ctx.save();
            ctx.textAlign = 'right';
            ctx.textBaseline = 'top';

            var cColor;
            var cIdx = comboObj.multiplier - 1;
            if (cIdx >= 4) {
                cColor = _getRainbowColor(frameCount);
            } else {
                cColor = COMBO_COLORS[cIdx] || '#ffffff';
            }

            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            _roundRect(ctx, 640, 50, 100, 28, 14);
            ctx.fill();

            ctx.font = 'bold 16px "Segoe UI", sans-serif';
            ctx.fillStyle = cColor;
            ctx.shadowColor = cColor;
            ctx.shadowBlur = 6;
            ctx.fillText('x' + comboObj.multiplier + ' Combo', 732, 55);
            ctx.shadowBlur = 0;

            ctx.restore();
        }

        // -- Active power-up timer bar (placeholder) --
        if (typeof powerUpTimer === 'number' && powerUpTimer > 0) {
            var puBarW = 120;
            var puBarH = 6;
            var puX = 340;
            var puY = 385;
            var puPct = clamp(powerUpTimer / 600, 0, 1); // assumes max 10s at 60fps

            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            _roundRect(ctx, puX, puY, puBarW, puBarH, 3);
            ctx.fill();

            ctx.fillStyle = '#76ff03';
            if (puPct < 0.3) ctx.fillStyle = '#ff1744';
            else if (puPct < 0.6) ctx.fillStyle = '#ffea00';
            _roundRect(ctx, puX, puY, puBarW * puPct, puBarH, 3);
            ctx.fill();

            ctx.font = '10px "Segoe UI", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = 'rgba(255,255,255,0.6)';
            ctx.fillText('POWER-UP', puX + puBarW / 2, puY - 3);
        }

        ctx.restore();
    }

    // -------------------------------------------------------
    // 5. ACHIEVEMENT SYSTEM
    // -------------------------------------------------------
    var ACHIEVEMENTS_KEY = 'santaAchievements';

    var achievementDefs = [
        { id: 'first_steps',      name: 'First Steps',      desc: 'Travel 100m',                         icon: 'footprints' },
        { id: 'gift_grabber',     name: 'Gift Grabber',     desc: 'Collect 10 gifts in one run',         icon: 'gift' },
        { id: 'speed_demon',      name: 'Speed Demon',      desc: 'Reach game speed 10',                 icon: 'bolt' },
        { id: 'combo_master',     name: 'Combo Master',     desc: 'Get a x5 combo',                      icon: 'fire' },
        { id: 'boss_slayer',      name: 'Boss Slayer',      desc: 'Defeat a boss',                       icon: 'sword' },
        { id: 'marathon_runner',  name: 'Marathon Runner',  desc: 'Travel 5000m',                        icon: 'road' },
        { id: 'gift_hoarder',     name: 'Gift Hoarder',     desc: 'Collect 50 gifts in one run',         icon: 'treasure' },
        { id: 'untouchable',      name: 'Untouchable',      desc: 'Travel 1000m without hitting obstacle', icon: 'shield' }
    ];

    var achievementState = {
        unlocked: {},           // { id: true }  - all time
        newThisRun: [],         // ids earned this run
        bannerQueue: [],        // banners to show
        activeBanner: null,     // currently displaying
        bannerTimer: 0,
        bannerX: 800,           // slide in from right
        distWithoutHit: 0       // for untouchable tracking
    };

    function _loadAchievements() {
        try {
            var stored = localStorage.getItem(ACHIEVEMENTS_KEY);
            if (stored) {
                achievementState.unlocked = JSON.parse(stored);
            }
        } catch (e) {
            achievementState.unlocked = {};
        }
    }

    function _saveAchievements() {
        try {
            localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(achievementState.unlocked));
        } catch (e) {
            // silently fail
        }
    }

    function getAchievements() {
        return {
            unlocked: Object.assign({}, achievementState.unlocked),
            defs: achievementDefs.slice(),
            newThisRun: achievementState.newThisRun.slice()
        };
    }

    function resetRunAchievements() {
        achievementState.newThisRun = [];
        achievementState.bannerQueue = [];
        achievementState.activeBanner = null;
        achievementState.bannerTimer = 0;
        achievementState.bannerX = 800;
        achievementState.distWithoutHit = 0;
    }

    function _unlockAchievement(id) {
        if (achievementState.unlocked[id]) return; // already unlocked
        achievementState.unlocked[id] = true;
        achievementState.newThisRun.push(id);
        achievementState.bannerQueue.push(id);
        _saveAchievements();
    }

    function checkAchievements(stats) {
        // stats: { distance, gifts, gameSpeed, comboMax, bossDefeated, hitObstacle }
        if (!stats) return;

        if (stats.distance >= 100)  _unlockAchievement('first_steps');
        if (stats.distance >= 5000) _unlockAchievement('marathon_runner');
        if (stats.gifts >= 10)      _unlockAchievement('gift_grabber');
        if (stats.gifts >= 50)      _unlockAchievement('gift_hoarder');
        if (stats.gameSpeed >= 10)   _unlockAchievement('speed_demon');
        if (stats.comboMax >= 5)     _unlockAchievement('combo_master');
        if (stats.bossDefeated)      _unlockAchievement('boss_slayer');

        // Untouchable tracking
        if (stats.hitObstacle) {
            achievementState.distWithoutHit = 0;
        } else {
            achievementState.distWithoutHit = stats.distance;
        }
        if (achievementState.distWithoutHit >= 1000) {
            _unlockAchievement('untouchable');
        }
    }

    function updateAchievements() {
        // Process banner queue
        if (!achievementState.activeBanner && achievementState.bannerQueue.length > 0) {
            var nextId = achievementState.bannerQueue.shift();
            achievementState.activeBanner = nextId;
            achievementState.bannerTimer = 0;
            achievementState.bannerX = 820;
        }

        if (achievementState.activeBanner) {
            achievementState.bannerTimer++;

            var totalDur = 180; // 3 seconds total
            var slideInDur = 30;
            var slideOutStart = totalDur - 30;

            // Slide in
            if (achievementState.bannerTimer <= slideInDur) {
                var t = easeOutBack(achievementState.bannerTimer / slideInDur);
                achievementState.bannerX = lerp(820, 540, t);
            }
            // Hold
            else if (achievementState.bannerTimer < slideOutStart) {
                achievementState.bannerX = 540;
            }
            // Slide out
            else if (achievementState.bannerTimer <= totalDur) {
                var t2 = (achievementState.bannerTimer - slideOutStart) / (totalDur - slideOutStart);
                achievementState.bannerX = lerp(540, 820, easeInOutCubic(t2));
            }
            // Done
            else {
                achievementState.activeBanner = null;
                achievementState.bannerTimer = 0;
            }
        }
    }

    function drawAchievementBanner(ctx, frameCount) {
        if (!achievementState.activeBanner) return;

        var achId = achievementState.activeBanner;
        var def = null;
        for (var i = 0; i < achievementDefs.length; i++) {
            if (achievementDefs[i].id === achId) { def = achievementDefs[i]; break; }
        }
        if (!def) return;

        var bx = achievementState.bannerX;
        var by = 80;
        var bw = 250;
        var bh = 60;

        ctx.save();

        // Banner background (gold tinted)
        var grad = ctx.createLinearGradient(bx, by, bx + bw, by);
        grad.addColorStop(0, 'rgba(40,30,10,0.95)');
        grad.addColorStop(1, 'rgba(60,50,20,0.95)');
        ctx.fillStyle = grad;
        _roundRect(ctx, bx, by, bw, bh, 10);
        ctx.fill();

        // Gold border
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 2;
        _roundRect(ctx, bx, by, bw, bh, 10);
        ctx.stroke();

        // Trophy icon area
        ctx.fillStyle = '#ffd700';
        ctx.font = '22px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('\u2605', bx + 25, by + bh / 2); // star character

        // Achievement text
        ctx.textAlign = 'left';
        ctx.font = 'bold 11px "Segoe UI", sans-serif';
        ctx.fillStyle = '#ffd700';
        ctx.fillText('ACHIEVEMENT UNLOCKED', bx + 45, by + 18);

        ctx.font = 'bold 16px "Segoe UI", sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(def.name, bx + 45, by + 38);

        // Shimmer effect
        var shimmerX = bx + ((frameCount * 3) % (bw + 40)) - 20;
        ctx.save();
        ctx.beginPath();
        _roundRect(ctx, bx, by, bw, bh, 10);
        ctx.clip();

        var shimmerGrad = ctx.createLinearGradient(shimmerX - 20, by, shimmerX + 20, by);
        shimmerGrad.addColorStop(0, 'rgba(255,215,0,0)');
        shimmerGrad.addColorStop(0.5, 'rgba(255,215,0,0.15)');
        shimmerGrad.addColorStop(1, 'rgba(255,215,0,0)');
        ctx.fillStyle = shimmerGrad;
        ctx.fillRect(shimmerX - 20, by, 40, bh);
        ctx.restore();

        ctx.restore();
    }

    // -------------------------------------------------------
    // 6. IMPROVED GAME OVER SCREEN
    // -------------------------------------------------------
    var gameOverState = {
        active: false,
        timer: 0,
        overlayAlpha: 0,
        statsRevealed: 0,       // how many stats are shown (animate one-by-one)
        statsValues: [],        // animated counter values
        targetStats: [],        // target values
        statsLabels: [],
        newRecordPulse: 0,
        newAchievements: [],
        tapPulse: 0,
        levelReached: 1
    };

    function _initGameOverScreen(score, distance, gifts, level, isNewRecord) {
        gameOverState.active = true;
        gameOverState.timer = 0;
        gameOverState.overlayAlpha = 0;
        gameOverState.statsRevealed = 0;
        gameOverState.newRecordPulse = 0;
        gameOverState.tapPulse = 0;
        gameOverState.levelReached = level || 1;

        gameOverState.statsLabels = ['SCORE', 'DISTANCE', 'GIFTS COLLECTED', 'LEVEL REACHED'];
        gameOverState.targetStats = [score, Math.floor(distance), gifts, level];
        gameOverState.statsValues = [0, 0, 0, 0];
        gameOverState.isNewRecord = !!isNewRecord;

        // Copy new achievements
        gameOverState.newAchievements = achievementState.newThisRun.slice();
    }

    function updateGameOverAnimation() {
        if (!gameOverState.active) return;

        gameOverState.timer++;

        // Overlay fade in
        if (gameOverState.overlayAlpha < 0.85) {
            gameOverState.overlayAlpha = Math.min(gameOverState.overlayAlpha + 0.03, 0.85);
        }

        // Reveal stats one by one (every 30 frames)
        var revealIdx = Math.floor((gameOverState.timer - 20) / 30);
        if (revealIdx >= 0 && gameOverState.statsRevealed < 4) {
            gameOverState.statsRevealed = Math.min(revealIdx + 1, 4);
        }

        // Animate counter values
        for (var i = 0; i < gameOverState.statsRevealed; i++) {
            var target = gameOverState.targetStats[i];
            var current = gameOverState.statsValues[i];
            if (current < target) {
                var spd = Math.max(1, Math.ceil((target - current) * 0.12));
                gameOverState.statsValues[i] = Math.min(current + spd, target);
            }
        }

        // New record pulse
        if (gameOverState.isNewRecord) {
            gameOverState.newRecordPulse += 0.08;
        }

        // Tap pulse
        if (gameOverState.timer > 150) {
            gameOverState.tapPulse += 0.06;
        }
    }

    function drawGameOverScreen(ctx, score, distance, gifts, level, isNewRecord, frameCount) {
        if (!gameOverState.active) {
            _initGameOverScreen(score, distance, gifts, level, isNewRecord);
        }

        ctx.save();

        // Overlay
        ctx.fillStyle = 'rgba(0,0,0,' + gameOverState.overlayAlpha + ')';
        ctx.fillRect(0, 0, 800, 400);

        // Title "GAME OVER"
        var titleT = easeOutBack(clamp(gameOverState.timer / 25, 0, 1));
        ctx.save();
        ctx.translate(400, 55);
        ctx.scale(titleT, titleT);
        ctx.font = 'bold 42px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.strokeStyle = '#c62828';
        ctx.lineWidth = 3;
        ctx.strokeText('GAME OVER', 0, 0);

        ctx.fillStyle = '#ff5252';
        ctx.shadowColor = '#ff5252';
        ctx.shadowBlur = 15;
        ctx.fillText('GAME OVER', 0, 0);
        ctx.shadowBlur = 0;
        ctx.restore();

        // Stats rolling in one by one
        var statStartY = 110;
        var statSpacing = 42;

        for (var i = 0; i < gameOverState.statsRevealed; i++) {
            var statFrame = gameOverState.timer - 20 - i * 30;
            var slideT = easeOutCubic(clamp(statFrame / 20, 0, 1));
            var alpha = clamp(statFrame / 15, 0, 1);
            var xOffset = lerp(-80, 0, slideT);

            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.translate(400 + xOffset, statStartY + i * statSpacing);

            // Label
            ctx.font = '13px "Segoe UI", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#888899';
            ctx.fillText(gameOverState.statsLabels[i], 0, -8);

            // Value
            ctx.font = 'bold 24px "Segoe UI", sans-serif';
            ctx.fillStyle = '#ffffff';
            var valText = '' + Math.floor(gameOverState.statsValues[i]);
            if (i === 1) valText += 'm'; // distance
            ctx.fillText(valText, 0, 16);

            ctx.restore();
        }

        // NEW RECORD banner
        if (gameOverState.isNewRecord && gameOverState.timer > 140) {
            ctx.save();
            var recAlpha = clamp((gameOverState.timer - 140) / 20, 0, 1);
            var recScale = 1 + Math.sin(gameOverState.newRecordPulse) * 0.08;
            ctx.globalAlpha = recAlpha;
            ctx.translate(400, 290);
            ctx.scale(recScale, recScale);

            ctx.font = 'bold 22px "Segoe UI", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#ffd700';
            ctx.shadowColor = '#ffd700';
            ctx.shadowBlur = 15;
            ctx.fillText('NEW RECORD!', 0, 0);
            ctx.shadowBlur = 0;

            // Sparkles
            for (var sp = 0; sp < 6; sp++) {
                var angle = (sp / 6) * Math.PI * 2 + gameOverState.newRecordPulse;
                var rad = 50 + Math.sin(gameOverState.newRecordPulse * 2 + sp) * 10;
                var spx = Math.cos(angle) * rad;
                var spy = Math.sin(angle) * rad * 0.4;
                ctx.fillStyle = 'rgba(255,215,0,' + (0.4 + 0.4 * Math.sin(gameOverState.newRecordPulse * 3 + sp)) + ')';
                ctx.beginPath();
                ctx.arc(spx, spy, 2, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        }

        // New achievements this run
        if (gameOverState.newAchievements.length > 0 && gameOverState.timer > 160) {
            var achStartY = gameOverState.isNewRecord ? 320 : 295;
            ctx.save();
            var achAlpha = clamp((gameOverState.timer - 160) / 20, 0, 1);
            ctx.globalAlpha = achAlpha;

            ctx.font = '12px "Segoe UI", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#ffd700';
            ctx.fillText('Achievements Unlocked:', 400, achStartY);

            ctx.font = 'bold 14px "Segoe UI", sans-serif';
            ctx.fillStyle = '#ffffff';
            var achNames = [];
            for (var a = 0; a < gameOverState.newAchievements.length; a++) {
                var achId = gameOverState.newAchievements[a];
                for (var d = 0; d < achievementDefs.length; d++) {
                    if (achievementDefs[d].id === achId) {
                        achNames.push(achievementDefs[d].name);
                        break;
                    }
                }
            }
            ctx.fillText(achNames.join(' | '), 400, achStartY + 18);

            ctx.restore();
        }

        // "Tap/Click to restart" prompt
        if (gameOverState.timer > 150) {
            ctx.save();
            var tapAlpha = 0.5 + 0.5 * Math.sin(gameOverState.tapPulse);
            ctx.globalAlpha = tapAlpha;
            ctx.font = '16px "Segoe UI", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#ffffff';
            ctx.fillText('Tap or Click to Restart', 400, 380);
            ctx.restore();
        }

        ctx.restore();
    }

    // -------------------------------------------------------
    // RESET ALL UI STATE (called on game restart)
    // -------------------------------------------------------
    function resetUIState() {
        resetCombo();
        resetRunAchievements();

        levelState.current = 0;
        levelState.transitionTimer = 0;
        levelState.flashAlpha = 0;
        levelState.nameShowTimer = 120; // Show level 1 name on start
        levelState.nameAlpha = 0;
        levelState.nameScale = 2.5;
        levelState.prevColors = null;
        levelState.blendT = 0;

        pauseState.paused = false;
        pauseState.selectedOption = 0;
        pauseState.overlayAlpha = 0;
        pauseState.animTimer = 0;

        hudState.displayScore = 0;
        hudState.displayDistance = 0;
        hudState.prevGifts = 0;
        hudState.giftPopTimer = 0;

        gameOverState.active = false;
        gameOverState.timer = 0;
    }

    // -------------------------------------------------------
    // Initialize achievements from localStorage
    // -------------------------------------------------------
    _loadAchievements();

    // -------------------------------------------------------
    // EXPORT TO GLOBAL SCOPE
    // -------------------------------------------------------
    window.ComboSystem = {
        updateCombo: updateCombo,
        addComboHit: addComboHit,
        getComboMultiplier: getComboMultiplier,
        drawCombo: drawCombo,
        resetCombo: resetCombo,
        getState: function () { return combo; }
    };

    window.LevelSystem = {
        getCurrentLevel: getCurrentLevel,
        getLevelConfig: getLevelConfig,
        drawLevelBackground: drawLevelBackground,
        checkLevelTransition: checkLevelTransition,
        drawLevelTransition: drawLevelTransition,
        levelConfigs: levelConfigs,
        getState: function () { return levelState; }
    };

    window.PauseSystem = {
        togglePause: togglePause,
        isPaused: isPaused,
        drawPauseMenu: drawPauseMenu,
        getSelectedOption: getPauseSelectedOption,
        setSelectedOption: setPauseSelectedOption
    };

    window.HUDSystem = {
        drawHUD: drawHUD
    };

    window.AchievementSystem = {
        checkAchievements: checkAchievements,
        drawAchievementBanner: drawAchievementBanner,
        updateAchievements: updateAchievements,
        getAchievements: getAchievements,
        resetRunAchievements: resetRunAchievements
    };

    window.GameOverSystem = {
        drawGameOverScreen: drawGameOverScreen,
        updateGameOverAnimation: updateGameOverAnimation,
        isActive: function () { return gameOverState.active; },
        getState: function () { return gameOverState; }
    };

    window.resetUIState = resetUIState;

    // Also export flat functions for direct integration
    window.updateCombo = updateCombo;
    window.addComboHit = addComboHit;
    window.getComboMultiplier = getComboMultiplier;
    window.drawCombo = drawCombo;
    window.resetCombo = resetCombo;
    window.getCurrentLevel = getCurrentLevel;
    window.getLevelConfig = getLevelConfig;
    window.drawLevelBackground = drawLevelBackground;
    window.checkLevelTransition = checkLevelTransition;
    window.drawLevelTransition = drawLevelTransition;
    window.levelConfigs = levelConfigs;
    window.togglePause = togglePause;
    window.isPaused = isPaused;
    window.drawPauseMenu = drawPauseMenu;
    window.drawHUD = drawHUD;
    window.checkAchievements = checkAchievements;
    window.drawAchievementBanner = drawAchievementBanner;
    window.updateAchievements = updateAchievements;
    window.getAchievements = getAchievements;
    window.resetRunAchievements = resetRunAchievements;
    window.drawGameOverScreen = drawGameOverScreen;
    window.updateGameOverAnimation = updateGameOverAnimation;
    window.resetUIState = resetUIState;

    console.log('UI, Combo & Level Progression module loaded.');

})();
// ==================== END UI, COMBO & LEVEL PROGRESSION ====================
