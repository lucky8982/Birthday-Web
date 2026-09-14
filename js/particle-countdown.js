/*
 * Real-time Canvas countdown. It retains main.js's play/stop/destroy contract
 * while composing the whole scene from cached Canvas sprites and particles.
 */

import { HEART_MOTION } from './countdown-heart-motion.js';
import { PRECOMPUTED_GLYPH_TARGETS } from './countdown-glyph-targets.js';

const MASTER_WIDTH = 1366;
const MASTER_HEIGHT = 768;
const PORTRAIT_GLYPH_SAFE_WIDTH = .92;
const PORTRAIT_GLYPH_SAFE_HEIGHT = .72;
const PORTRAIT_GLYPH_MIN_CORE = 8;
const OPENING_FIELD_HEIGHT = 320;
const OPENING_FIELD_START = -150;
const OPENING_FIELD_SPEED = .275;
const GLYPH_RESOLVED_AT = 810;
const DIGIT_RESOLVED_HOLD = 1150;
const WORD_RESOLVED_HOLD = 1300;
const GLYPH_EXIT_DURATION = 250;
const glyphTiming = hold => ({
    exitStart: GLYPH_RESOLVED_AT + hold,
    duration: GLYPH_RESOLVED_AT + hold + GLYPH_EXIT_DURATION,
});
const DIGIT_TIMING = glyphTiming(DIGIT_RESOLVED_HOLD);
const WORD_TIMING = glyphTiming(WORD_RESOLVED_HOLD);
const DIGIT_INTER_ITEM_GAP = 0;
const DIGIT_TO_WORD_GAP = 2000;
const WORD_INTER_ITEM_GAP = 1000;
const WIFE_TO_BURST_GAP = 1000;
const DIGIT_THREE_AT = 2000;
const DIGIT_TWO_AT = DIGIT_THREE_AT + DIGIT_TIMING.duration + DIGIT_INTER_ITEM_GAP;
const DIGIT_ONE_AT = DIGIT_TWO_AT + DIGIT_TIMING.duration + DIGIT_INTER_ITEM_GAP;
const YOU_AT = DIGIT_ONE_AT + DIGIT_TIMING.duration + DIGIT_TO_WORD_GAP;
const ARE_AT = YOU_AT + WORD_TIMING.duration + WORD_INTER_ITEM_GAP;
const MY_AT = ARE_AT + WORD_TIMING.duration + WORD_INTER_ITEM_GAP;
const WIFE_AT = MY_AT + WORD_TIMING.duration + WORD_INTER_ITEM_GAP;
const STAGES = [
    { at: DIGIT_THREE_AT, text: '3', size: 500, ...DIGIT_TIMING },
    { at: DIGIT_TWO_AT, text: '2', size: 500, ...DIGIT_TIMING },
    { at: DIGIT_ONE_AT, text: '1', size: 500, ...DIGIT_TIMING },
    { at: YOU_AT, text: 'You', size: 344, ...WORD_TIMING },
    { at: ARE_AT, text: 'Are', size: 344, ...WORD_TIMING },
    { at: MY_AT, text: 'My', size: 344, ...WORD_TIMING },
    { at: WIFE_AT, text: 'Wife', size: 344, ...WORD_TIMING },
];
const BURST_AT = WIFE_AT + WORD_TIMING.duration + WIFE_TO_BURST_GAP;
const HEART_AT = BURST_AT + 2000;
const HEART_HOLD_READY_AT = 2200;
const HEART_HOLD_FALLBACK = 8000;
const HEART_EXIT_DURATION = 900;
const TITLE_CACHE_SCALE = 2;
const COUNTDOWN_COLORS = Object.freeze({
    background: '#050a18',
    backgroundGlow: 'rgba(20, 33, 66, .42)',
    backgroundGlowFade: 'rgba(5, 10, 24, 0)',
    rainCyan: '126, 200, 227',
    rainTeal: '94, 201, 142',
    openingLine: 'rgba(126, 200, 227, .38)',
    ambientIvory: '#f8e7ef',
    ambientCyan: '#7ec8e3',
    heartDark: '5, 10, 24',
    titleIvory: '#fff0f6',
    titleRose: '#ed72ad',
    titleGlow: 'rgba(255, 73, 170, .55)',
    titleShadow: 'rgba(5, 10, 24, .68)',
});

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const easeOut = value => 1 - ((1 - clamp(value, 0, 1)) ** 3);
const smooth = value => {
    const t = clamp(value, 0, 1);
    return t * t * (3 - 2 * t);
};
const hash = value => {
    const valueAt = Math.sin(value * 12.9898) * 43758.5453;
    return valueAt - Math.floor(valueAt);
};

function canvas(width, height, paint) {
    const surface = document.createElement('canvas');
    surface.width = width;
    surface.height = height;
    paint(surface.getContext('2d'), width, height);
    return surface;
}

function dotSprite(core, halo, size = 28) {
    return canvas(size, size, (ctx, width, height) => {
        const gradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width / 2);
        gradient.addColorStop(0, core);
        gradient.addColorStop(.16, core);
        gradient.addColorStop(.35, halo);
        gradient.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
    });
}

function heartPath(ctx) {
    ctx.beginPath();
    ctx.moveTo(15, 26);
    ctx.bezierCurveTo(12, 22, 4, 17, 4, 10.5);
    ctx.bezierCurveTo(4, 4.4, 11.2, 3, 15, 8.3);
    ctx.bezierCurveTo(18.8, 3, 26, 4.4, 26, 10.5);
    ctx.bezierCurveTo(26, 17, 18, 22, 15, 26);
}

function heartSprite(size) {
    return canvas(size, size, (ctx, width) => {
        const scale = width / 38;
        ctx.translate(4 * scale, 4 * scale);
        ctx.scale(scale, scale);
        ctx.save();
        ctx.fillStyle = 'rgba(255, 61, 181, .6)';
        ctx.shadowColor = 'rgba(255, 35, 173, .7)';
        ctx.shadowBlur = 4.5;
        heartPath(ctx);
        ctx.fill();
        ctx.restore();
        ctx.fillStyle = '#ff4fbd';
        heartPath(ctx);
        ctx.fill();
    });
}

function openingFieldSprite() {
    return canvas(MASTER_WIDTH, OPENING_FIELD_HEIGHT, (ctx, width, height) => {
        const marks = ['I', 'L', 'O', 'V', 'E', '♥', '·'];
        ctx.font = '11px Arial, Helvetica, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (let column = 0; column < width; column += 11) {
            const tail = 168 + hash(column + 71) * 148;
            const start = Math.max(4, height - tail);
            for (let y = start; y < height; y += 12) {
                const seed = column * .17 + y * 1.91;
                const mark = marks[Math.floor(hash(seed) * marks.length)];
                const alpha = .24 + hash(seed + 43) * .54;
                const color = hash(seed + 83) > .7 ? COUNTDOWN_COLORS.rainTeal : COUNTDOWN_COLORS.rainCyan;
                ctx.fillStyle = `rgba(${color}, ${alpha})`;
                ctx.fillText(mark, column + 5, y);
            }
        }
        ctx.fillStyle = COUNTDOWN_COLORS.openingLine;
        for (let x = 0; x < width; x += 34) {
            const y = height - 28 - hash(x + 220) * 90;
            ctx.fillRect(x, y, 18 + hash(x + 270) * 42, 1);
        }
    });
}

function decodeHeartMotion(encoded) {
    const binary = atob(encoded);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return new Float32Array(bytes.buffer);
}

function firstTrackAfter(data, fieldsPerTrack, time) {
    let low = 0;
    let high = data.length / fieldsPerTrack;
    while (low < high) {
        const middle = (low + high) >>> 1;
        if (data[middle * fieldsPerTrack] <= time) low = middle + 1;
        else high = middle;
    }
    return low;
}

function rainSprite(seed, depth) {
    const width = depth === 2 ? 25 : depth === 1 ? 20 : 16;
    const height = depth === 2 ? 340 : depth === 1 ? 280 : 230;
    return canvas(width, height, (ctx, spriteWidth, spriteHeight) => {
        const marks = ['I', 'L', 'O', 'V', 'E', 'U', '♥', '·'];
        const fontSize = depth === 2 ? 13 : depth === 1 ? 11 : 9;
        const gap = depth === 2 ? 16 : depth === 1 ? 14 : 12;
        ctx.font = `${fontSize}px Arial, Helvetica, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (let y = 8; y < spriteHeight; y += gap) {
            const n = Math.floor(hash(seed * 43 + y) * marks.length);
            const alpha = .13 + hash(seed + y * 2) * (.22 + depth * .16);
            const color = hash(seed + y) > .72 ? COUNTDOWN_COLORS.rainTeal : COUNTDOWN_COLORS.rainCyan;
            ctx.fillStyle = `rgba(${color}, ${alpha})`;
            ctx.fillText(marks[n], spriteWidth / 2, y);
        }
    });
}

function titleSprite() {
    return canvas(560 * TITLE_CACHE_SCALE, 180 * TITLE_CACHE_SCALE, (ctx, width) => {
        ctx.scale(TITLE_CACHE_SCALE, TITLE_CACHE_SCALE);
        const logicalWidth = width / TITLE_CACHE_SCALE;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '600 21px Georgia, "Times New Roman", serif';
        ctx.shadowColor = COUNTDOWN_COLORS.titleShadow;
        ctx.shadowBlur = 3;
        ctx.shadowOffsetY = 1;
        ctx.fillStyle = COUNTDOWN_COLORS.titleShadow;
        ctx.fillText('I  L O V E  Y O U', logicalWidth / 2, 57);
        ctx.shadowColor = 'transparent';
        ctx.fillStyle = COUNTDOWN_COLORS.titleIvory;
        ctx.fillText('I  L O V E  Y O U', logicalWidth / 2, 57);
        ctx.font = 'italic 55px Georgia, "Times New Roman", serif';
        ctx.shadowColor = COUNTDOWN_COLORS.titleShadow;
        ctx.shadowBlur = 4;
        ctx.shadowOffsetY = 2;
        ctx.fillStyle = COUNTDOWN_COLORS.titleShadow;
        ctx.fillText('Khushbu', logicalWidth / 2, 114);
        ctx.shadowColor = COUNTDOWN_COLORS.titleGlow;
        ctx.shadowBlur = 12;
        ctx.shadowOffsetY = 0;
        ctx.fillStyle = COUNTDOWN_COLORS.titleRose;
        ctx.fillText('Khushbu', logicalWidth / 2, 114);
    });
}

function precomputedTargets(text) {
    const data = PRECOMPUTED_GLYPH_TARGETS[text];
    const targets = [];
    for (let index = 0; index < data.length; index += 2) {
        targets.push({ x: data[index], y: data[index + 1] });
    }
    return targets;
}


export class ParticleCountdown {
    constructor() {
        this.layer = document.querySelector('#cinematic-countdown');
        this.canvas = this.layer?.querySelector('.cinematic-countdown-canvas');
        this.context = this.canvas?.getContext('2d', { alpha: false });
        this.running = false;
        this.run = 0;
        this.frame = 0;
        this.resolve = null;
        this.startedAt = 0;
        this.width = 0;
        this.height = 0;
        this.pixelRatio = 1;
        this.scale = 1;
        this.offsetX = 0;
        this.offsetY = 0;
        this.stageIndex = -1;
        this.mode = 'opening';
        this.particles = [];
        this.burst = [];
        this.glyphPresentation = null;
        this.heartMotion = null;
        this.backgroundGlowCache = null;
        this.heartDepthCache = null;
        this.dissolveAt = 0;
        this.heartStartedAt = 0;
        this.heartHoldActive = false;
        this.heartHoldStartedAt = 0;
        this.heartHoldTimer = 0;
        this.heartExiting = false;
        this.heartExitStartedAt = 0;
        this.heartMatureTrackStart = 0;
        this.heartMatureTrackEnd = 0;
        this.heartMatureTrackFirst = 0;
        this.heartMatureTrackLast = 0;
        this.targets = new Map();
        this.rain = [];
        this.sprites = null;
        this.reducedMotion = false;
        this.render = this.render.bind(this);
        this.resize = this.resize.bind(this);
        this.handleHeartHoldAdvance = this.handleHeartHoldAdvance.bind(this);
    }

    async play() {
        if (!this.layer || !this.canvas || !this.context) throw new Error('Countdown Canvas is unavailable.');
        if (this.running) throw new Error('Countdown was started while already running.');
        this.stop();
        const run = ++this.run;
        try {
            this.initialise();
            this.running = true;
            this.startedAt = performance.now();
            this.layer.hidden = false;
            this.layer.setAttribute('aria-hidden', 'false');
            this.layer.classList.add('is-running');
            window.addEventListener('resize', this.resize, { passive: true });
            window.visualViewport?.addEventListener('resize', this.resize, { passive: true });
            this.resize();
            return await new Promise(resolve => {
                this.resolve = resolve;
                this.frame = requestAnimationFrame(this.render);
            });
        } catch (error) {
            if (this.run === run) this.stop();
            throw error;
        }
    }

    initialise() {
        this.reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
        this.sprites = {
            warmGlow: dotSprite('#fff9ea', 'rgba(255, 211, 177, .30)', 22),
            warmCore: dotSprite('#fffdf8', 'rgba(255, 243, 226, .48)', 14),
            openingField: openingFieldSprite(),
            hearts: {
                small: heartSprite(128),
                medium: heartSprite(144),
                large: heartSprite(192),
            },
            title: titleSprite(),
            rain: [0, 1, 2].map(depth => Array.from({ length: 6 }, (_, index) => rainSprite(index + 1, depth))),
        };
        this.targets.clear();
        STAGES.forEach(stage => this.targets.set(stage.text, precomputedTargets(stage.text)));
        if (Array.from(this.targets.values()).some(points => !points.length)) throw new Error('Countdown glyph targets could not be created.');
        const count = this.reducedMotion ? 58 : 112;
        this.rain = Array.from({ length: count }, (_, index) => {
            const depth = index % 9 === 0 ? 2 : index % 3 === 0 ? 1 : 0;
            return {
                x: hash(index + 1),
                phase: hash(index + 47) * 420,
                speed: 95 + depth * 85 + hash(index + 94) * 125,
                alpha: .28 + depth * .16 + hash(index + 132) * .2,
                depth,
                sprite: this.sprites.rain[depth][index % 6],
            };
        });
        this.particles = [];
        this.burst = [];
        this.glyphPresentation = null;
        this.heartMotion = decodeHeartMotion(HEART_MOTION.encodedTracks);
        const lastTrackOffset = this.heartMotion.length - HEART_MOTION.fieldsPerTrack;
        this.heartMatureTrackEnd = this.heartMotion[lastTrackOffset];
        this.heartMatureTrackStart = this.heartMatureTrackEnd - HEART_MOTION.durationMs;
        this.heartMatureTrackFirst = firstTrackAfter(this.heartMotion, HEART_MOTION.fieldsPerTrack, this.heartMatureTrackStart);
        this.heartMatureTrackLast = firstTrackAfter(this.heartMotion, HEART_MOTION.fieldsPerTrack, this.heartMatureTrackEnd);
        this.stageIndex = -1;
        this.mode = 'opening';
        this.dissolveAt = 0;
        this.heartStartedAt = 0;
        this.heartHoldActive = false;
        this.heartHoldStartedAt = 0;
        this.heartExiting = false;
        this.heartExitStartedAt = 0;
    }

    getGlyphEnvelope(targets) {
        const cap = this.reducedMotion ? 620 : 1250;
        const count = Math.min(targets.length, cap);
        let left = Infinity;
        let right = -Infinity;
        let top = Infinity;
        let bottom = -Infinity;
        for (let index = 0; index < count; index += 1) {
            const target = targets[Math.floor(index * targets.length / count)];
            const resolvedSize = 11.5 * (.7 + hash(index + 92) * .35) * 1.08;
            left = Math.min(left, target.x - resolvedSize / 2);
            right = Math.max(right, target.x + resolvedSize / 2);
            top = Math.min(top, target.y - resolvedSize / 2);
            bottom = Math.max(bottom, target.y + resolvedSize / 2);
        }
        return { left, right, top, bottom, width: right - left, height: bottom - top };
    }

    getGlyphPresentation(targets) {
        if (this.height <= this.width || !targets?.length) return null;
        const envelope = this.getGlyphEnvelope(targets);
        const uniformScale = Math.min(
            1,
            this.width * PORTRAIT_GLYPH_SAFE_WIDTH / envelope.width,
            this.height * PORTRAIT_GLYPH_SAFE_HEIGHT / envelope.height,
        );
        return {
            centerX: (envelope.left + envelope.right) / 2,
            centerY: (envelope.top + envelope.bottom) / 2,
            fitScale: uniformScale,
            positionScale: uniformScale / this.scale,
        };
    }

    buildBackgroundCaches() {
        this.backgroundGlowCache = canvas(this.width, this.height, (ctx, width, height) => {
            const glow = ctx.createRadialGradient(width * .5, height * .48, 0, width * .5, height * .48, Math.max(width, height) * .6);
            glow.addColorStop(0, COUNTDOWN_COLORS.backgroundGlow);
            glow.addColorStop(1, COUNTDOWN_COLORS.backgroundGlowFade);
            ctx.fillStyle = glow;
            ctx.fillRect(0, 0, width, height);
        });
        this.heartDepthCache = canvas(this.width, this.height, (ctx, width, height) => {
            const depth = ctx.createRadialGradient(width * .5, height * .5, Math.min(width, height) * .08, width * .5, height * .5, Math.max(width, height) * .65);
            depth.addColorStop(0, `rgba(${COUNTDOWN_COLORS.heartDark}, .04)`);
            depth.addColorStop(.56, `rgba(${COUNTDOWN_COLORS.heartDark}, .14)`);
            depth.addColorStop(1, `rgba(${COUNTDOWN_COLORS.heartDark}, .34)`);
            ctx.fillStyle = depth;
            ctx.fillRect(0, 0, width, height);
        });
    }

    resize() {
        if (!this.canvas || !this.context) return;
        const viewport = window.visualViewport;
        const viewportWidth = viewport?.width || window.innerWidth;
        const viewportHeight = viewport?.height || window.innerHeight;
        const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
        const width = Math.max(1, Math.round(viewportWidth));
        const height = Math.max(1, Math.round(viewportHeight));
        const dimensionsChanged = this.width !== width || this.height !== height;
        this.width = width;
        this.height = height;
        this.layer.style.width = `${width}px`;
        this.layer.style.height = `${height}px`;
        this.canvas.style.width = `${width}px`;
        this.canvas.style.height = `${height}px`;
        const physicalWidth = Math.round(this.width * ratio);
        const physicalHeight = Math.round(this.height * ratio);
        if (this.canvas.width !== physicalWidth || this.canvas.height !== physicalHeight) {
            this.canvas.width = physicalWidth;
            this.canvas.height = physicalHeight;
        }
        this.pixelRatio = ratio;
        this.context.setTransform(ratio, 0, 0, ratio, 0, 0);
        this.context.imageSmoothingEnabled = true;
        this.context.imageSmoothingQuality = 'high';
        if (this.height > this.width) {
            this.scale = Math.min(this.width / 740, this.height / 740);
            this.offsetX = this.width * .5 - MASTER_WIDTH * this.scale * .5;
            this.offsetY = this.height * .47 - MASTER_HEIGHT * .49 * this.scale;
        } else {
            this.scale = Math.min(this.width / MASTER_WIDTH, this.height / MASTER_HEIGHT);
            this.offsetX = (this.width - MASTER_WIDTH * this.scale) / 2;
            this.offsetY = (this.height - MASTER_HEIGHT * this.scale) / 2;
        }
        if (this.stageIndex >= 0 && this.particles.length) {
            this.glyphPresentation = this.getGlyphPresentation(this.targets.get(STAGES[this.stageIndex].text));
        }
        if (dimensionsChanged || !this.backgroundGlowCache || !this.heartDepthCache) this.buildBackgroundCaches();
    }

    selectStage(elapsed) {
        let next = -1;
        for (let index = 0; index < STAGES.length; index += 1) {
            if (elapsed >= STAGES[index].at && elapsed < STAGES[index].at + STAGES[index].duration) next = index;
        }
        if (next !== this.stageIndex) {
            this.stageIndex = next;
            if (next >= 0) this.setGlyph(STAGES[next], elapsed);
            if (next < 0 && elapsed < BURST_AT) this.startDissolve(elapsed);
        }
        if (next < 0 && elapsed >= BURST_AT && elapsed < HEART_AT && this.mode !== 'burst') this.startBurst();
        if (elapsed >= HEART_AT && this.mode !== 'heart') this.setHeart(elapsed);
    }

    setGlyph(stage, elapsed) {
        this.mode = 'glyph';
        const targets = this.targets.get(stage.text);
        const cap = this.reducedMotion ? 620 : 1250;
        const count = Math.min(targets.length, cap);
        while (this.particles.length < count) {
            const index = this.particles.length;
            this.particles.push({
                x: MASTER_WIDTH / 2,
                y: MASTER_HEIGHT / 2,
                vx: 0, vy: 0, tx: 0, ty: 0,
                delay: 0, phase: hash(index + 80) * Math.PI * 2,
                size: .7 + hash(index + 92) * .35,
                heart: false,
            });
        }
        this.particles.length = count;
        for (let index = 0; index < count; index += 1) {
            const target = targets[Math.floor(index * targets.length / count)];
            const particle = this.particles[index];
            if (this.stageIndex === 0 && elapsed < 2350) {
                const direction = hash(index + 15) * Math.PI * 2;
                const distance = 160 + hash(index + 27) * 300;
                particle.x = target.x + Math.cos(direction) * distance;
                particle.y = target.y + Math.sin(direction) * distance;
                particle.vx = -Math.cos(direction) * (1 + hash(index + 44) * 4);
                particle.vy = -Math.sin(direction) * (1 + hash(index + 66) * 4);
            } else {
                const direction = hash(index + elapsed * .001) * Math.PI * 2;
                particle.vx += Math.cos(direction) * (2 + hash(index + 311) * 3);
                particle.vy += Math.sin(direction) * (2 + hash(index + 541) * 3);
            }
            particle.tx = target.x;
            particle.ty = target.y;
            particle.delay = hash(index + target.x * .03) * 390;
            particle.heart = false;
        }
        this.glyphPresentation = this.getGlyphPresentation(targets);
    }

    startBurst() {
        this.mode = 'burst';
        this.glyphPresentation = null;
        this.burst = this.particles.map((particle, index) => {
            const angle = hash(index + 810) * Math.PI * 2;
            const speed = 3 + hash(index + 914) * 7;
            return {
                x: particle.x, y: particle.y,
                vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                life: .95 + hash(index + 1020) * .55,
                size: .55 + hash(index + 1170) * .9,
            };
        });
        this.particles = [];
    }

    startDissolve(elapsed) {
        if (this.mode !== 'glyph') return;
        this.mode = 'dissolve';
        this.dissolveAt = elapsed;
        for (let index = 0; index < this.particles.length; index += 1) {
            const particle = this.particles[index];
            const angle = hash(index + elapsed * .001) * Math.PI * 2;
            const distance = 80 + hash(index + 1430) * 180;
            particle.tx = particle.x + Math.cos(angle) * distance;
            particle.ty = particle.y + Math.sin(angle) * distance;
            particle.vx += Math.cos(angle) * (1 + hash(index + 1510) * 3);
            particle.vy += Math.sin(angle) * (1 + hash(index + 1590) * 3);
        }
    }

    setHeart(elapsed) {
        this.mode = 'heart';
        this.glyphPresentation = null;
        this.heartStartedAt = elapsed;
        this.particles.length = 0;
        this.burst.length = 0;
    }

    updateParticles(elapsed) {
        for (let index = 0; index < this.particles.length; index += 1) {
            const particle = this.particles[index];
            particle.vx = (particle.vx + (particle.tx - particle.x) * .025) * .78;
            particle.vy = (particle.vy + (particle.ty - particle.y) * .025) * .78;
            particle.x += particle.vx;
            particle.y += particle.vy;
        }
        for (let index = this.burst.length - 1; index >= 0; index -= 1) {
            const particle = this.burst[index];
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vx *= .982;
            particle.vy *= .982;
            particle.life -= .012;
            if (particle.life <= 0) this.burst.splice(index, 1);
        }
    }

    drawBackground(ctx, elapsed) {
        const heartDimming = elapsed >= HEART_AT ? smooth((elapsed - HEART_AT) / 900) : 0;
        const openingScale = this.height > this.width
            ? Math.max(this.width / MASTER_WIDTH, this.height / OPENING_FIELD_HEIGHT)
            : this.width / MASTER_WIDTH;
        const fieldTop = OPENING_FIELD_START + elapsed * OPENING_FIELD_SPEED;
        const revealEdge = fieldTop * openingScale;
        const finalOpeningReveal = smooth((elapsed - 2100) / 450);
        ctx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
        ctx.fillStyle = COUNTDOWN_COLORS.background;
        ctx.fillRect(0, 0, this.width, this.height);
        ctx.globalAlpha = (.42 - heartDimming * .24) / .42;
        ctx.drawImage(this.backgroundGlowCache, 0, 0, this.width, this.height);
        ctx.globalAlpha = 1;
        for (let index = 0; index < this.rain.length; index += 1) {
            const rain = this.rain[index];
            const spriteHeight = rain.sprite.height;
            const y = ((elapsed * rain.speed * .001 + rain.phase) % (this.height + spriteHeight)) - spriteHeight;
            const edgeReveal = smooth((revealEdge - (y + spriteHeight * .45) + 34 * openingScale) / (92 * openingScale));
            const openingReveal = elapsed < 2550 ? Math.max(edgeReveal, finalOpeningReveal) : 1;
            ctx.globalAlpha = rain.alpha * openingReveal * (1 - heartDimming * .52);
            const x = rain.x * this.width - rain.sprite.width / 2;
            ctx.drawImage(rain.sprite, x, y);
            if (y < 0) ctx.drawImage(rain.sprite, x, y + this.height + spriteHeight);
        }
        ctx.globalAlpha = .58 * Math.max(finalOpeningReveal, elapsed >= 2550 ? 1 : 0) * (1 - heartDimming * .3);
        for (let index = 0; index < 68; index += 1) {
            const x = hash(index + 2250) * this.width;
            const y = (hash(index + 2370) * this.height + elapsed * (index % 2 ? .035 : -.024)) % this.height;
            const size = index % 9 === 0 ? 3 : 1.4;
            ctx.fillStyle = index % 5 === 0 ? COUNTDOWN_COLORS.ambientIvory : COUNTDOWN_COLORS.ambientCyan;
            ctx.fillRect(x, y, size, size);
        }
        if (heartDimming > 0) {
            ctx.fillStyle = `rgba(${COUNTDOWN_COLORS.heartDark}, ${heartDimming * .18})`;
            ctx.fillRect(0, 0, this.width, this.height);
            ctx.drawImage(this.heartDepthCache, 0, 0, this.width, this.height);
        }
        ctx.globalAlpha = 1;
    }

    drawOpening(ctx, elapsed) {
        if (elapsed >= 2550) return;
        const portrait = this.height > this.width;
        const scale = portrait
            ? Math.max(this.width / MASTER_WIDTH, this.height / OPENING_FIELD_HEIGHT)
            : this.width / MASTER_WIDTH;
        const width = MASTER_WIDTH * scale;
        const y = (OPENING_FIELD_START + elapsed * OPENING_FIELD_SPEED) * scale;
        const fade = elapsed < 2100 ? 1 : 1 - smooth((elapsed - 2100) / 450);
        ctx.save();
        ctx.globalAlpha = fade;
        const x = portrait ? (this.width - width) / 2 : 0;
        const height = OPENING_FIELD_HEIGHT * scale;
        ctx.drawImage(this.sprites.openingField, x, y, width, height);
        if (portrait && y > 0) ctx.drawImage(this.sprites.openingField, x, y - height, width, height);
        if (portrait && y + height < this.height) ctx.drawImage(this.sprites.openingField, x, y + height, width, height);
        ctx.restore();
        ctx.globalAlpha = 1;
    }

    drawTracedHeart(ctx, heartAge, opacity = 1) {
        if (heartAge <= 0 || !this.heartMotion) return;
        if (heartAge >= this.heartMatureTrackEnd) {
            this.drawMatureHeart(ctx, heartAge - this.heartMatureTrackEnd, opacity);
            return;
        }
        const fields = HEART_MOTION.fieldsPerTrack;
        const data = this.heartMotion;
        const end = firstTrackAfter(data, fields, heartAge);
        const activeSince = firstTrackAfter(data, fields, heartAge - HEART_MOTION.durationMs);
        const start = Math.max(activeSince, end - HEART_MOTION.visibleLimit);
        for (let index = start; index < end; index += 1) {
            const offset = index * fields;
            const age = heartAge - data[offset];
            if (age <= 0 || age >= HEART_MOTION.durationMs) continue;
            this.drawHeartTrack(ctx, offset, age, opacity);
        }
    }

    drawMatureHeart(ctx, matureAge, opacity) {
        const fields = HEART_MOTION.fieldsPerTrack;
        const data = this.heartMotion;
        const period = HEART_MOTION.durationMs;
        const start = Math.max(this.heartMatureTrackFirst, this.heartMatureTrackLast - HEART_MOTION.visibleLimit);
        for (let index = start; index < this.heartMatureTrackLast; index += 1) {
            const offset = index * fields;
            const trackAge = (matureAge - (data[offset] - this.heartMatureTrackStart)) % period;
            const age = trackAge < 0 ? trackAge + period : trackAge;
            if (age <= 0 || age >= period) continue;
            this.drawHeartTrack(ctx, offset, age, opacity);
        }
    }

    drawHeartTrack(ctx, offset, age, opacity) {
        const data = this.heartMotion;
        const stepSeconds = HEART_MOTION.sampleMs / 1000;
        const steps = Math.floor(age / HEART_MOTION.sampleMs);
        const remainder = age / 1000 - steps * stepSeconds;
        const vx = data[offset + 3] + data[offset + 5] * stepSeconds * steps;
        const vy = data[offset + 4] + data[offset + 6] * stepSeconds * steps;
        const x = data[offset + 1]
            + data[offset + 3] * stepSeconds * steps
            + data[offset + 5] * stepSeconds * stepSeconds * steps * (steps - 1) / 2
            + vx * remainder;
        const y = data[offset + 2]
            + data[offset + 4] * stepSeconds * steps
            + data[offset + 6] * stepSeconds * stepSeconds * steps * (steps - 1) / 2
            + vy * remainder;
        const life = age / HEART_MOTION.durationMs;
        const size = HEART_MOTION.spriteSize * (1 - (1 - life) ** 3);
        ctx.globalAlpha = (1 - life) * opacity;
        ctx.drawImage(this.sprites.hearts.small, x - size / 2, y - size / 2, size, size);
    }

    drawGlyphParticles(ctx, stageAge, stageExit, dissolve, presentation = null) {
        for (let index = 0; index < this.particles.length; index += 1) {
            const particle = this.particles[index];
            const arrival = smooth((stageAge - particle.delay) / 420);
            const exit = this.mode === 'glyph' ? 1 - stageExit * (.35 + hash(index + 2730) * .45) : dissolve;
            const alpha = arrival * exit;
            const x = presentation
                ? presentation.centerX + (particle.x - presentation.centerX) * presentation.positionScale
                : particle.x;
            const y = presentation
                ? presentation.centerY + (particle.y - presentation.centerY) * presentation.positionScale
                : particle.y;
            const desktopCoreSize = 11.5 * particle.size * (1 + arrival * .08);
            const coreSize = presentation
                ? Math.max(PORTRAIT_GLYPH_MIN_CORE, desktopCoreSize) / this.scale
                : desktopCoreSize;
            const glowSize = coreSize * (1.65 + arrival * .18);
            ctx.globalAlpha = alpha * .42;
            ctx.drawImage(this.sprites.warmGlow, x - glowSize / 2, y - glowSize / 2, glowSize, glowSize);
            ctx.globalAlpha = alpha * .93;
            ctx.drawImage(this.sprites.warmCore, x - coreSize / 2, y - coreSize / 2, coreSize, coreSize);
        }
    }

    drawScene(ctx, elapsed) {
        ctx.save();
        ctx.translate(this.offsetX, this.offsetY);
        ctx.scale(this.scale, this.scale);
        for (let index = 0; index < this.burst.length; index += 1) {
            const particle = this.burst[index];
            const size = 20 * particle.size;
            ctx.globalAlpha = clamp(particle.life, 0, 1);
            ctx.drawImage(this.sprites.warmGlow, particle.x - size, particle.y - size, size * 2, size * 2);
        }
        const heartAge = elapsed - this.heartStartedAt;
        const stage = this.stageIndex >= 0 ? STAGES[this.stageIndex] : null;
        const stageAge = stage ? elapsed - stage.at : 0;
        const stageExit = stage ? smooth((stageAge - stage.exitStart) / GLYPH_EXIT_DURATION) : 0;
        const dissolve = this.mode === 'dissolve' ? 1 - smooth((elapsed - this.dissolveAt) / 620) : 1;
        const presentation = this.glyphPresentation;
        this.drawGlyphParticles(ctx, stageAge, stageExit, dissolve, presentation);
        if (this.mode === 'heart') {
            const exitProgress = this.heartExiting
                ? smooth((elapsed - this.heartExitStartedAt) / HEART_EXIT_DURATION)
                : 0;
            const heartOpacity = 1 - exitProgress;
            this.drawTracedHeart(ctx, heartAge, heartOpacity);
            const titleIn = easeOut((heartAge - 1150) / 850);
            if (titleIn > 0) {
                const pulse = 1 + Math.sin(heartAge * .003) * .015;
                const width = 286 * pulse;
                const height = 92 * pulse;
                ctx.globalAlpha = titleIn * heartOpacity;
                ctx.drawImage(this.sprites.title, MASTER_WIDTH / 2 - width / 2, MASTER_HEIGHT * .51 - height / 2 + (1 - titleIn) * 11, width, height);
            }
        }
        ctx.restore();
        ctx.globalAlpha = 1;
    }

    render(now) {
        if (!this.running) return;
        const elapsed = now - this.startedAt;
        this.selectStage(elapsed);
        this.updateParticles(elapsed);
        this.drawBackground(this.context, elapsed);
        this.drawOpening(this.context, elapsed);
        this.drawScene(this.context, elapsed);
        if (this.heartExiting && elapsed - this.heartExitStartedAt >= HEART_EXIT_DURATION) {
            this.complete();
            return;
        }
        if (this.mode === 'heart' && !this.heartHoldActive && !this.heartExiting && elapsed - this.heartStartedAt >= HEART_HOLD_READY_AT) this.startHeartHold(elapsed);
        this.frame = requestAnimationFrame(this.render);
    }

    startHeartHold(elapsed) {
        if (this.heartHoldActive || this.heartExiting || !this.running) return;
        this.heartHoldActive = true;
        this.heartHoldStartedAt = elapsed;
        this.layer.addEventListener('pointerup', this.handleHeartHoldAdvance);
        this.layer.addEventListener('click', this.handleHeartHoldAdvance);
        this.heartHoldTimer = window.setTimeout(() => this.beginHeartExit(performance.now() - this.startedAt), HEART_HOLD_FALLBACK);
    }

    handleHeartHoldAdvance(event) {
        const target = event.target;
        if (target instanceof Element && target.closest('#music-toggle, .music-toggle')) return;
        if (this.heartHoldActive) this.beginHeartExit(performance.now() - this.startedAt);
    }

    beginHeartExit(elapsed) {
        if (this.heartExiting || !this.running) return;
        this.clearHeartHold();
        this.heartExiting = true;
        this.heartExitStartedAt = elapsed;
    }

    complete() {
        const resolve = this.resolve;
        this.resolve = null;
        this.running = false;
        this.frame = 0;
        this.removeListeners();
        this.hide();
        resolve?.();
    }

    removeListeners() {
        window.removeEventListener('resize', this.resize);
        window.visualViewport?.removeEventListener('resize', this.resize);
        this.clearHeartHold();
        this.heartExiting = false;
        this.heartExitStartedAt = 0;
    }

    clearHeartHold() {
        this.layer?.removeEventListener('pointerup', this.handleHeartHoldAdvance);
        this.layer?.removeEventListener('click', this.handleHeartHoldAdvance);
        if (this.heartHoldTimer) window.clearTimeout(this.heartHoldTimer);
        this.heartHoldTimer = 0;
        this.heartHoldActive = false;
        this.heartHoldStartedAt = 0;
    }

    stop() {
        this.run += 1;
        if (this.frame) cancelAnimationFrame(this.frame);
        this.frame = 0;
        this.running = false;
        this.removeListeners();
        const resolve = this.resolve;
        this.resolve = null;
        this.hide();
        resolve?.();
    }

    hide() {
        if (!this.layer) return;
        this.layer.classList.remove('is-running');
        this.layer.setAttribute('aria-hidden', 'true');
        this.layer.hidden = true;
    }

    destroy() {
        this.stop();
        this.targets.clear();
        this.particles = [];
        this.burst = [];
        this.rain = [];
        this.heartMotion = null;
        this.backgroundGlowCache = null;
        this.heartDepthCache = null;
        this.sprites = null;
    }
}
