/* Birthday-only Canvas rain.  It is intentionally independent of the locked
 * countdown renderer and has exactly one requestAnimationFrame loop. */
const PHRASE = [...'HAPPYBIRTHDAYBIWI'];
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const hash = value => {
    const n = Math.sin(value * 12.9898) * 43758.5453;
    return n - Math.floor(n);
};

export class BirthdayRain {
    constructor(layer, { reduced = false } = {}) {
        this.layer = layer;
        this.canvas = layer?.querySelector('#birthday-rain');
        this.ctx = this.canvas?.getContext('2d');
        this.reduced = reduced;
        this.frame = 0;
        this.last = 0;
        this.paused = false;
        this.intensity = 1;
        this.intensityFrom = 1;
        this.intensityTo = 1;
        this.intensityStart = 0;
        this.intensityDuration = 0;
        this.pauseTimer = null;
        this.streams = [];
        this.width = 0;
        this.height = 0;
        this.dpr = 1;
        this._render = time => this.render(time);
        this._resize = () => this.resize();
    }

    start() {
        if (!this.canvas || !this.ctx || this.frame || this.paused) return;
        this.resize();
        this.layer?.classList.add('has-birthday-rain');
        window.addEventListener('resize', this._resize, { passive: true });
        window.visualViewport?.addEventListener('resize', this._resize, { passive: true });
        if (this.reduced) return this.draw(0);
        this.frame = requestAnimationFrame(this._render);
    }

    stop() {
        clearTimeout(this.pauseTimer);
        this.pauseTimer = null;
        this.paused = false;
        this.intensity = 1;
        this.intensityFrom = 1;
        this.intensityTo = 1;
        this.intensityDuration = 0;
        if (this.frame) cancelAnimationFrame(this.frame);
        this.frame = 0;
        this.last = 0;
        window.removeEventListener('resize', this._resize);
        window.visualViewport?.removeEventListener('resize', this._resize);
        this.layer?.classList.remove('has-birthday-rain');
        this.ctx?.clearRect(0, 0, this.width, this.height);
    }

    pause(duration = null) {
        if (!this.canvas || !this.ctx || this.reduced) return;
        if (this.frame) cancelAnimationFrame(this.frame);
        this.frame = 0;
        this.paused = true;
        clearTimeout(this.pauseTimer);
        this.pauseTimer = Number.isFinite(duration) ? setTimeout(() => this.resume(), duration) : null;
    }

    resume() {
        clearTimeout(this.pauseTimer);
        this.pauseTimer = null;
        if (!this.paused) return;
        this.paused = false;
        this.last = performance.now();
        if (this.canvas && this.ctx && !this.reduced && !this.frame) this.frame = requestAnimationFrame(this._render);
    }

    transitionIntensity(target = 1, duration = 0) {
        this.intensityFrom = this.intensity;
        this.intensityTo = clamp(target, 0, 1);
        this.intensityStart = performance.now();
        this.intensityDuration = Math.max(0, duration);
        if (!this.intensityDuration) this.intensity = this.intensityTo;
    }

    resize() {
        if (!this.canvas || !this.ctx) return;
        const rect = this.canvas.getBoundingClientRect();
        this.dpr = clamp(window.devicePixelRatio || 1, 1, 2);
        this.width = Math.max(1, Math.round(rect.width));
        this.height = Math.max(1, Math.round(rect.height));
        this.canvas.width = Math.round(this.width * this.dpr);
        this.canvas.height = Math.round(this.height * this.dpr);
        this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        const count = Math.round(clamp(this.width / 18, 19, 38));
        this.streams = Array.from({ length: count }, (_, index) => {
            const depth = index % 3;
            return {
                depth, x: (index + .5) / count * this.width + (hash(index + 4) - .5) * 8,
                y: -hash(index + 21) * (this.height + 330),
                speed: [18, 29, 42][depth], gap: [12, 14, 16][depth],
                font: [9, 11, 13][depth], alpha: [.13, .22, .34][depth], seed: index * 11,
            };
        });
    }

    render(time) {
        if (this.paused) return;
        const elapsed = this.last ? Math.min(64, time - this.last) : 16;
        this.last = time;
        for (const stream of this.streams) {
            stream.y += stream.speed * elapsed / 1000;
            const length = PHRASE.length * stream.gap + 80;
            if (stream.y > this.height + length) stream.y = -length;
        }
        this.draw(time);
        this.frame = requestAnimationFrame(this._render);
    }

    draw(time) {
        if (!this.ctx) return;
        if (this.intensityDuration) {
            const progress = clamp((time - this.intensityStart) / this.intensityDuration, 0, 1);
            this.intensity = this.intensityFrom + (this.intensityTo - this.intensityFrom) * progress;
            if (progress === 1) this.intensityDuration = 0;
        }
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        for (const stream of this.streams) {
            this.ctx.font = `600 ${stream.font}px Arial, Helvetica, sans-serif`;
            this.ctx.shadowColor = 'rgba(117, 231, 238, .42)';
            this.ctx.shadowBlur = stream.depth + 3;
            for (let y = stream.y, index = 0; y < this.height + stream.gap; y += stream.gap, index += 1) {
                if (y < -stream.gap) continue;
                const flicker = .78 + hash(stream.seed + index * 4 + time * .0006) * .22;
                const cyan = (stream.seed + index) % 5 !== 0;
                this.ctx.fillStyle = cyan
                    ? `rgba(103, 206, 216, ${stream.alpha * flicker * this.intensity})`
                    : `rgba(233, 224, 200, ${stream.alpha * .72 * flicker * this.intensity})`;
                this.ctx.fillText(PHRASE[(index + stream.seed) % PHRASE.length], stream.x, y);
            }
        }
        this.ctx.shadowBlur = 0;
    }

    destroy() { this.stop(); }
}
