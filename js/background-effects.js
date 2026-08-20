/* ============================================================
   Happy Birthday My Love 💙 - Background Effects
   ------------------------------------------------------------
   File:    js/background-effects.js
   Purpose: Cinematic canvas backgrounds - twinkling star
            fields and softly floating glow particles.
   Colors:  Light blue primary, green secondary. No pink/red.
   Engine:  Canvas 2D + requestAnimationFrame. No libraries.
   ============================================================ */

import { random, randomInt, clamp, prefersReducedMotion, getDevice } from './utils.js';


/* ------------------------------------------------------------
   Small internal helpers (not exported)
   ------------------------------------------------------------ */

/** Linear interpolation between two values */
function lerp(a, b, t) {
    return a + (b - a) * t;
}

/* Cache of pre-rendered glow sprites, one per color */
const glowCache = new Map();

/**
 * Build (once) a soft radial glow sprite for a color.
 * Drawing cached sprites is far faster than gradients per frame.
 *
 * @param {string} color - CSS color for the glow
 * @returns {HTMLCanvasElement} 64x64 glow sprite
 */
function getGlowSprite(color) {
    if (glowCache.has(color)) return glowCache.get(color);

    const size = 64;
    const sprite = document.createElement('canvas');
    sprite.width = size;
    sprite.height = size;

    const ctx = sprite.getContext('2d');
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    glowCache.set(color, sprite);
    return sprite;
}

/* Shared theme colors for glow particles (blue primary, green secondary) */
const PARTICLE_COLORS = ['#7ec8e3', '#a8d0e6', '#5ec98e', '#8fddb1'];


/* ============================================================
   Class: StarField
   ------------------------------------------------------------
   A field of softly twinkling stars on a canvas.
   Usage:
     const stars = new StarField(document.querySelector('#stars-canvas'));
     stars.start();
   ============================================================ */
export class StarField {
    /**
     * @param {HTMLCanvasElement} canvas - Canvas to draw on
     * @param {Object} [options] - Configuration
     * @param {number} [options.density=1] - Multiplier for star count
     * @param {number} [options.parallax=14] - Max parallax shift in px
     */
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        // Options with sensible defaults
        this.density = options.density ?? 1;
        this.parallaxStrength = options.parallax ?? 14;

        // Smooth parallax offset (CSS px)
        this.offsetX = 0;
        this.offsetY = 0;
        this.targetX = 0;
        this.targetY = 0;

        this.rafId = null;
        this.lastTime = 0;
        this.isRunning = false;
        this.destroyed = false;

        // Star palette: white-blues dominate, a few soft greens
        this.colors = ['#eaf6ff', '#c9e6f7', '#a8d0e6', '#7ec8e3', '#8fddb1'];

        // Device-aware setup
        this.device = getDevice();
        this.dpr = Math.min(window.devicePixelRatio || 1, this.device.isMobile ? 1.5 : 2);
        this.reducedMotion = prefersReducedMotion();

        this.resize();
        this.buildStars();

        // Wire up listeners (also used for parallax)
        this._onResize = () => this.resize();
        this._onPointerMove = (event) => this.handlePointer(event);
        this._onVisibility = () => this.handleVisibility();
        window.addEventListener('resize', this._onResize);
        document.addEventListener('visibilitychange', this._onVisibility);
        window.addEventListener('pointermove', this._onPointerMove, { passive: true });

        // Reduced motion: draw one calm static frame, no loop
        if (this.reducedMotion) this.draw(0, true);
    }

    /* ---- Setup helpers ---- */

    /** Decide how many stars to draw for the current device */
    buildStars() {
        const baseCounts = { mobile: 70, tablet: 130, desktop: 200 };
        const base = baseCounts[this.device.isMobile ? 'mobile' : (this.device.isTablet ? 'tablet' : 'desktop')];

        // Scale by screen area so huge screens get more, tiny screens less
        const areaScale = clamp((this.width * this.height) / (1280 * 800), 0.5, 1.5);

        // Low-power devices (few CPU cores) get fewer stars
        const powerScale = (navigator.hardwareConcurrency || 8) <= 4 ? 0.7 : 1;

        const count = Math.round(base * this.density * areaScale * powerScale);
        this.stars = Array.from({ length: count }, () => this.createStar());
    }

    /** Create one star with normalized position */
    createStar() {
        return {
            x: random(0, 1),          // 0..1 relative to canvas width
            y: random(0, 1),          // 0..1 relative to canvas height
            size: random(0.6, 1.9),   // radius in CSS px
            speed: random(0.4, 1.6),  // twinkle speed
            phase: random(0, Math.PI * 2), // twinkle offset
            color: this.colors[randomInt(0, this.colors.length - 1)],
        };
    }

    /** Fit the canvas to its container, scaled for sharpness (DPR) */
    resize() {
        const cssWidth = this.canvas.clientWidth || this.canvas.parentElement?.clientWidth || 1;
        const cssHeight = this.canvas.clientHeight || this.canvas.parentElement?.clientHeight || 1;

        this.width = cssWidth;
        this.height = cssHeight;
        this.canvas.width = Math.round(cssWidth * this.dpr);
        this.canvas.height = Math.round(cssHeight * this.dpr);
        this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }

    /**
     * Re-measure the canvas if its CSS size changed. Needed when a
     * canvas was sized while its container was hidden (display:none
     * reports 0x0), e.g. a canvas behind a full-screen overlay.
     */
    checkSize() {
        if (this.canvas.clientWidth !== this.width || this.canvas.clientHeight !== this.height) {
            this.resize();
        }
    }

    /* ---- Parallax & visibility ---- */

    /**
     * React to the pointer. Desktop mouse gives a gentle parallax
     * shift; touch drags cause a very subtle drift too.
     */
    handlePointer(event) {
        const maxShift = this.device.isTouch ? 6 : this.parallaxStrength;
        // Map pointer position to a small shift around the center
        this.targetX = ((event.clientX / window.innerWidth) - 0.5) * maxShift * 2;
        this.targetY = ((event.clientY / window.innerHeight) - 0.5) * maxShift * 2;
    }

    /** Pause the loop while the tab is hidden, resume when visible */
    handleVisibility() {
        if (document.hidden) {
            this.stop();
        } else {
            this.start();
        }
    }

    /* ---- Lifecycle ---- */

    /** Begin the animation loop */
    start() {
        if (this.isRunning || this.reducedMotion || this.destroyed) return;
        this.isRunning = true;
        this.lastTime = performance.now();
        this.rafId = requestAnimationFrame((time) => this.loop(time));
    }

    /** Pause the animation loop */
    stop() {
        this.isRunning = false;
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
    }

    /* ---- Drawing ---- */

    /**
     * One animation frame: update parallax and twinkle.
     *
     * @param {number} time - Timestamp from requestAnimationFrame
     * @param {boolean} [staticFrame=false] - Draw once, no motion
     */
    loop(time) {
        if (!this.isRunning) return;
        const delta = Math.min(time - this.lastTime, 50); // clamp after tab switches
        this.lastTime = time;

        this.checkSize(); // heal canvases sized while hidden
        this.draw(delta, false);
        this.rafId = requestAnimationFrame((t) => this.loop(t));
    }

    /**
     * Draw all stars (or one static frame for reduced motion).
     *
     * @param {number} delta - Milliseconds since last frame
     * @param {boolean} staticFrame - True to freeze twinkle
     */
    draw(delta, staticFrame) {
        const ctx = this.ctx;
        const time = performance.now() / 1000;

        // Smoothly chase the pointer target
        this.offsetX = lerp(this.offsetX, this.targetX, 0.04);
        this.offsetY = lerp(this.offsetY, this.targetY, 0.04);

        ctx.clearRect(0, 0, this.width, this.height);

        // Parallax: shift the whole field slightly
        ctx.save();
        ctx.translate(this.offsetX, this.offsetY);

        for (const star of this.stars) {
            // Gentle sine-wave twinkle between 0.3 and 1.0 opacity
            const wave = 0.5 + 0.5 * Math.sin(time * star.speed + star.phase);
            const alpha = staticFrame ? 0.7 : 0.3 + wave * 0.7;

            ctx.globalAlpha = alpha;
            ctx.fillStyle = star.color;
            ctx.beginPath();
            ctx.arc(star.x * this.width, star.y * this.height, star.size, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
        ctx.globalAlpha = 1;
    }

    /** Remove every listener and stop the loop permanently */
    destroy() {
        this.destroyed = true;
        this.stop();
        window.removeEventListener('resize', this._onResize);
        document.removeEventListener('visibilitychange', this._onVisibility);
        window.removeEventListener('pointermove', this._onPointerMove);
    }
}


/* ============================================================
   Class: FloatingParticles
   ------------------------------------------------------------
   Soft glowing light motes that drift slowly upward with a
   gentle sway. Uses pre-rendered glow sprites for speed.
   Usage:
     const particles = new FloatingParticles(document.querySelector('#particles-canvas'));
     particles.start();
   ============================================================ */
export class FloatingParticles {
    /**
     * @param {HTMLCanvasElement} canvas - Canvas to draw on
     * @param {Object} [options] - Configuration
     * @param {number} [options.density=1] - Multiplier for particle count
     * @param {number} [options.parallax=10] - Max parallax shift in px
     */
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        this.density = options.density ?? 1;
        this.parallaxStrength = options.parallax ?? 10;

        this.offsetX = 0;
        this.offsetY = 0;
        this.targetX = 0;
        this.targetY = 0;

        this.rafId = null;
        this.lastTime = 0;
        this.isRunning = false;
        this.destroyed = false;

        this.device = getDevice();
        this.dpr = Math.min(window.devicePixelRatio || 1, this.device.isMobile ? 1.5 : 2);
        this.reducedMotion = prefersReducedMotion();

        this.resize();
        this.buildParticles();

        this._onResize = () => this.resize();
        this._onPointerMove = (event) => this.handlePointer(event);
        this._onVisibility = () => this.handleVisibility();
        window.addEventListener('resize', this._onResize);
        document.addEventListener('visibilitychange', this._onVisibility);
        window.addEventListener('pointermove', this._onPointerMove, { passive: true });

        if (this.reducedMotion) this.draw(0, true);
    }

    /* ---- Setup helpers ---- */

    /** Decide how many particles to draw for the current device */
    buildParticles() {
        const baseCounts = { mobile: 16, tablet: 26, desktop: 38 };
        const base = baseCounts[this.device.isMobile ? 'mobile' : (this.device.isTablet ? 'tablet' : 'desktop')];
        const areaScale = clamp((this.width * this.height) / (1280 * 800), 0.5, 1.5);
        const powerScale = (navigator.hardwareConcurrency || 8) <= 4 ? 0.7 : 1;

        const count = Math.round(base * this.density * areaScale * powerScale);
        this.particles = Array.from({ length: count }, () => this.createParticle(true));
    }

    /** Create one particle; random color from blue + green palette */
    createParticle(randomizeY) {
        return {
            x: random(0, 1),                 // horizontal position (0..1)
            y: randomizeY ? random(0, 1) : 1,// vertical position (0..1)
            size: random(8, 26),             // glow diameter in CSS px
            speed: random(0.008, 0.025),     // upward speed (fraction/s)
            swayAmp: random(6, 24),          // horizontal sway in px
            swayFreq: random(0.3, 0.9),      // sway speed
            phase: random(0, Math.PI * 2),   // sway offset
            alpha: random(0.25, 0.6),        // glow strength
            color: PARTICLE_COLORS[randomInt(0, PARTICLE_COLORS.length - 1)],
        };
    }

    /** Fit the canvas to its container, scaled for sharpness (DPR) */
    resize() {
        const cssWidth = this.canvas.clientWidth || this.canvas.parentElement?.clientWidth || 1;
        const cssHeight = this.canvas.clientHeight || this.canvas.parentElement?.clientHeight || 1;

        this.width = cssWidth;
        this.height = cssHeight;
        this.canvas.width = Math.round(cssWidth * this.dpr);
        this.canvas.height = Math.round(cssHeight * this.dpr);
        this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }

    /**
     * Re-measure the canvas if its CSS size changed. Needed when a
     * canvas was sized while its container was hidden (display:none
     * reports 0x0), e.g. a canvas behind a full-screen overlay.
     */
    checkSize() {
        if (this.canvas.clientWidth !== this.width || this.canvas.clientHeight !== this.height) {
            this.resize();
        }
    }

    /* ---- Parallax & visibility ---- */

    /** Soft parallax: mouse on desktop, gentle drift on touch */
    handlePointer(event) {
        const maxShift = this.device.isTouch ? 5 : this.parallaxStrength;
        this.targetX = ((event.clientX / window.innerWidth) - 0.5) * maxShift * 2;
        this.targetY = ((event.clientY / window.innerHeight) - 0.5) * maxShift * 2;
    }

    /** Pause the loop while the tab is hidden, resume when visible */
    handleVisibility() {
        if (document.hidden) {
            this.stop();
        } else {
            this.start();
        }
    }

    /* ---- Lifecycle ---- */

    /** Begin the animation loop */
    start() {
        if (this.isRunning || this.reducedMotion || this.destroyed) return;
        this.isRunning = true;
        this.lastTime = performance.now();
        this.rafId = requestAnimationFrame((time) => this.loop(time));
    }

    /** Pause the animation loop */
    stop() {
        this.isRunning = false;
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
    }

    /* ---- Drawing ---- */

    /**
     * One animation frame: drift particles upward with a sway.
     *
     * @param {number} time - Timestamp from requestAnimationFrame
     * @param {boolean} [staticFrame=false] - Draw once, no motion
     */
    loop(time) {
        if (!this.isRunning) return;
        const delta = Math.min(time - this.lastTime, 50);
        this.lastTime = time;

        this.checkSize(); // heal canvases sized while hidden
        this.draw(delta, false);
        this.rafId = requestAnimationFrame((t) => this.loop(t));
    }

    /**
     * Draw all particles (or one static frame for reduced motion).
     *
     * @param {number} delta - Milliseconds since last frame
     * @param {boolean} staticFrame - True to freeze motion
     */
    draw(delta, staticFrame) {
        const ctx = this.ctx;
        const time = performance.now() / 1000;

        this.offsetX = lerp(this.offsetX, this.targetX, 0.04);
        this.offsetY = lerp(this.offsetY, this.targetY, 0.04);

        ctx.clearRect(0, 0, this.width, this.height);

        ctx.save();
        ctx.translate(this.offsetX, this.offsetY);

        for (const particle of this.particles) {
            if (!staticFrame) {
                // Rise slowly; wrap around to the bottom when gone
                particle.y -= particle.speed * (delta / 16.7);
                if (particle.y < -0.1) {
                    particle.y = 1.05;
                    particle.x = random(0, 1);
                }
            }

            // Gentle horizontal sway around the particle's base position
            const swayX = Math.sin(time * particle.swayFreq + particle.phase) * particle.swayAmp;
            const x = particle.x * this.width + swayX;
            const y = particle.y * this.height;

            ctx.globalAlpha = particle.alpha;
            ctx.drawImage(getGlowSprite(particle.color), x - particle.size / 2, y - particle.size / 2, particle.size, particle.size);
        }

        ctx.restore();
        ctx.globalAlpha = 1;
    }

    /** Remove every listener and stop the loop permanently */
    destroy() {
        this.destroyed = true;
        this.stop();
        window.removeEventListener('resize', this._onResize);
        document.removeEventListener('visibilitychange', this._onVisibility);
        window.removeEventListener('pointermove', this._onPointerMove);
    }
}


/* ============================================================
   Convenience: initBackgroundEffects()
   ------------------------------------------------------------
   Wire up the canvases that exist in index.html:
     #stars-canvas    (loading screen star field)
     #particles-canvas(loading screen glow particles)
   Called later by main.js - nothing runs on import.
   ============================================================ */

/**
 * Create background effects for every canvas found on the page.
 *
 * @returns {Object} Instances keyed by role, for later cleanup:
 *   { loadingStars, loadingParticles }
 */
export function initBackgroundEffects() {
    const loadingStars = new StarField(document.querySelector('#stars-canvas'));
    const loadingParticles = new FloatingParticles(document.querySelector('#particles-canvas'));

    return { loadingStars, loadingParticles };
}