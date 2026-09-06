import { prefersReducedMotion } from './utils.js';

/* One continuous canvas scene: the field begins with the falling light,
   then the same moving particles are retargeted for every later shape. */
export class ParticleCountdown {
    constructor() {
        this.layer = document.querySelector('#cinematic-countdown');
        this.canvas = this.layer?.querySelector('canvas');
        this.ctx = this.canvas?.getContext('2d');
        this.reduced = prefersReducedMotion();
        this.particles = [];
        this.field = [];
        this.frame = this.frame.bind(this);
        this.resize = this.resize.bind(this);
    }

    wait(ms) {
        return new Promise(resolve => {
            const id = window.setTimeout(() => { this.timers.delete(id); resolve(); }, ms);
            this.timers.add(id);
        });
    }

    resize() {
        if (!this.canvas || !this.ctx) return;
        const box = this.canvas.getBoundingClientRect();
        const oldWidth = this.width || box.width;
        const oldHeight = this.height || box.height;
        this.width = Math.max(1, box.width);
        this.height = Math.max(1, box.height);
        const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        this.canvas.width = Math.round(this.width * dpr);
        this.canvas.height = Math.round(this.height * dpr);
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        if (this.particles.length) {
            const scaleX = this.width / oldWidth;
            const scaleY = this.height / oldHeight;
            this.particles.forEach(particle => {
                particle.x *= scaleX; particle.y *= scaleY;
                particle.px *= scaleX; particle.py *= scaleY;
            });
            this.setStage(this.stage, this.stageValue, true);
        }
        this.createField();
    }

    createField() {
        const count = this.reduced ? 28 : Math.round(Math.max(42, Math.min(92, this.width / 9)));
        this.field = Array.from({ length: count }, (_, index) => ({
            x: Math.random() * this.width, y: Math.random() * this.height,
            speed: 16 + Math.random() * 40, drift: (Math.random() - .5) * 18,
            length: 12 + Math.random() * 68, size: .35 + Math.random() * 1.35,
            alpha: .035 + Math.random() * .14, phase: Math.random() * Math.PI * 2,
            hue: index % 5 === 0 ? 208 : 192,
        }));
    }

    createGlyphTargets(lines) {
        const source = document.createElement('canvas');
        const sourceCtx = source.getContext('2d', { willReadFrequently: true });
        source.width = 1000;
        source.height = lines.length > 1 ? 420 : 620;
        const isDigit = lines.length === 1 && /^\d$/.test(lines[0]);
        const fontSize = isDigit ? 510 : (lines.length > 1 ? 150 : 128);
        const lineHeight = fontSize * 1.05;
        sourceCtx.fillStyle = '#fff';
        sourceCtx.textAlign = 'center';
        sourceCtx.textBaseline = 'middle';
        sourceCtx.font = `600 ${fontSize}px Georgia, serif`;
        const firstY = source.height / 2 - ((lines.length - 1) * lineHeight) / 2;
        lines.forEach((line, index) => sourceCtx.fillText(line, source.width / 2, firstY + index * lineHeight));

        const image = sourceCtx.getImageData(0, 0, source.width, source.height).data;
        const sample = isDigit ? 5 : 4;
        const points = [];
        const fieldWidth = isDigit ? this.width * .52 : this.width * .82;
        const fieldHeight = isDigit ? this.height * .58 : this.height * .25;
        const scale = Math.min(fieldWidth / source.width, fieldHeight / source.height);
        for (let y = 0; y < source.height; y += sample) {
            for (let x = 0; x < source.width; x += sample) {
                if (image[(y * source.width + x) * 4 + 3] < 150) continue;
                points.push({ x: this.width / 2 + (x - source.width / 2) * scale, y: this.height / 2 + (y - source.height / 2) * scale });
            }
        }
        return points;
    }

    createHeartTargets() {
        const points = [];
        const samples = this.reduced ? 230 : 720;
        const scale = Math.min(this.width / 42, this.height / 41);
        const centerX = this.width / 2;
        const centerY = this.height * .49;
        for (let index = 0; index < samples; index += 1) {
            const t = index / samples * Math.PI * 2;
            const shell = .9 + (index % 4) * .035;
            const x = 16 * Math.sin(t) ** 3;
            const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
            points.push({ x: centerX + x * scale * shell, y: centerY + y * scale * shell });
        }
        return points;
    }

    setStage(stage, value = null, preserve = false) {
        this.stage = stage;
        this.stageValue = value;
        if (!preserve) this.stageStarted = performance.now();
        if (stage === 'intro') return;
        const targets = stage === 'heart' ? this.createHeartTargets() : this.createGlyphTargets(stage === 'text' ? ['Happy Birthday', 'My Wife'] : [value]);
        const maxParticles = this.reduced ? 210 : Math.min(680, Math.max(360, Math.round(this.width * 1.05)));
        const count = Math.min(maxParticles, targets.length);
        const selected = [];
        const step = targets.length / count;
        for (let index = 0; index < count; index += 1) selected.push(targets[Math.floor(index * step)]);

        if (!preserve || this.particles.length !== count) {
            this.particles = selected.map((target, index) => {
                const startAtLine = stage === 'digit' && value === '5';
                return {
                    x: startAtLine ? this.width / 2 + (Math.random() - .5) * 32 : Math.random() * this.width,
                    y: startAtLine ? this.height * 1.08 + Math.random() * 70 : Math.random() * this.height,
                    px: 0, py: 0, vx: 0, vy: 0, seed: index * 1.618 + Math.random() * 9,
                    size: .7 + Math.random() * 1.35, alpha: .38 + Math.random() * .62,
                    tx: target.x, ty: target.y, baseX: target.x, baseY: target.y,
                };
            });
        } else {
            this.particles.forEach((particle, index) => {
                const target = selected[index];
                particle.tx = target.x; particle.ty = target.y;
                particle.baseX = target.x; particle.baseY = target.y;
            });
        }
    }

    updateParticles(now) {
        if (this.stage === 'intro') return;
        const elapsed = (now - this.stageStarted) / 1000;
        const pulse = this.stage === 'heart' ? 1 + Math.sin(elapsed * 4.1) * .035 : 1;
        const centerX = this.width / 2;
        const centerY = this.height * .49;
        const force = this.stage === 'text' ? .026 : .034;
        const damping = this.reduced ? .74 : .79;
        this.particles.forEach(particle => {
            let targetX = particle.tx;
            let targetY = particle.ty;
            if (this.stage === 'heart') {
                targetX = centerX + (particle.baseX - centerX) * pulse;
                targetY = centerY + (particle.baseY - centerY) * pulse;
            }
            const shimmer = Math.sin(now * .0014 + particle.seed) * (this.reduced ? .14 : .46);
            particle.vx += (targetX + shimmer - particle.x) * force;
            particle.vy += (targetY + Math.cos(now * .0011 + particle.seed) * .35 - particle.y) * force;
            particle.vx *= damping; particle.vy *= damping;
            particle.px = particle.x; particle.py = particle.y;
            particle.x += particle.vx; particle.y += particle.vy;
        });
    }

    drawBackground(now) {
        const ctx = this.ctx;
        const t = (now - this.startedAt) / 1000;
        const base = ctx.createRadialGradient(this.width * (.3 + Math.sin(t * .08) * .13), this.height * .26, 0, this.width * .5, this.height * .5, Math.max(this.width, this.height));
        base.addColorStop(0, 'rgba(24, 45, 72, .26)');
        base.addColorStop(.48, 'rgba(8, 18, 34, .23)');
        base.addColorStop(1, 'rgba(2, 5, 12, .38)');
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = base;
        ctx.fillRect(0, 0, this.width, this.height);
        ctx.globalCompositeOperation = 'lighter';
        this.field.forEach(streak => {
            const sway = Math.sin(t * .55 + streak.phase) * streak.drift;
            const y = (streak.y + t * streak.speed) % (this.height + streak.length) - streak.length;
            const x = (streak.x + sway + this.width) % this.width;
            const gradient = ctx.createLinearGradient(x, y - streak.length, x + sway * .08, y);
            gradient.addColorStop(0, `hsla(${streak.hue}, 76%, 74%, 0)`);
            gradient.addColorStop(.76, `hsla(${streak.hue}, 82%, 78%, ${streak.alpha * .24})`);
            gradient.addColorStop(1, `hsla(${streak.hue}, 94%, 88%, ${streak.alpha})`);
            ctx.strokeStyle = gradient;
            ctx.lineWidth = streak.size;
            ctx.beginPath(); ctx.moveTo(x - sway * .12, y - streak.length); ctx.lineTo(x, y); ctx.stroke();
            if (streak.alpha > .12) {
                ctx.fillStyle = `hsla(${streak.hue}, 95%, 90%, ${streak.alpha * .6})`;
                ctx.beginPath(); ctx.arc(x, y, streak.size * 1.35, 0, Math.PI * 2); ctx.fill();
            }
        });
    }

    drawIntroLine(now) {
        if (this.stage !== 'intro') return;
        const ctx = this.ctx;
        const progress = Math.min(1, (now - this.stageStarted) / (this.reduced ? 420 : 2200));
        const eased = progress * progress * (3 - 2 * progress);
        const x = this.width * .5;
        const headY = -this.height * .12 + eased * this.height * 1.25;
        const tail = Math.min(this.height * .42, 260);
        ctx.globalCompositeOperation = 'lighter';
        const trail = ctx.createLinearGradient(x, headY - tail, x, headY + 12);
        trail.addColorStop(0, 'rgba(121, 195, 255, 0)');
        trail.addColorStop(.55, 'rgba(126, 201, 255, .12)');
        trail.addColorStop(.9, 'rgba(214, 239, 255, .82)');
        trail.addColorStop(1, 'rgba(255, 255, 255, 1)');
        ctx.strokeStyle = trail;
        ctx.lineWidth = Math.max(1.1, this.width * .0035);
        ctx.shadowColor = 'rgba(133, 206, 255, .9)'; ctx.shadowBlur = 19;
        ctx.beginPath(); ctx.moveTo(x, headY - tail); ctx.lineTo(x, headY); ctx.stroke();
        ctx.shadowBlur = 28; ctx.fillStyle = 'rgba(245, 252, 255, .98)';
        ctx.beginPath(); ctx.arc(x, headY, Math.max(2.3, this.width * .008), 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
    }

    drawParticles(now) {
        const ctx = this.ctx;
        const elapsed = (now - this.stageStarted) / 1000;
        ctx.globalCompositeOperation = 'lighter';
        this.particles.forEach(particle => {
            const velocity = Math.hypot(particle.x - particle.px, particle.y - particle.py);
            const trailAlpha = Math.min(.38, .07 + velocity * .055) * particle.alpha;
            ctx.strokeStyle = `rgba(173, 226, 255, ${trailAlpha})`;
            ctx.lineWidth = Math.max(.45, particle.size * .7);
            ctx.beginPath(); ctx.moveTo(particle.px, particle.py); ctx.lineTo(particle.x, particle.y); ctx.stroke();
            const flicker = .74 + Math.sin(elapsed * 4.5 + particle.seed) * .2;
            ctx.fillStyle = `rgba(230, 247, 255, ${particle.alpha * flicker})`;
            ctx.beginPath(); ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2); ctx.fill();
        });
    }

    drawHeartEnergy(now) {
        if (this.stage !== 'heart') return;
        const ctx = this.ctx;
        const elapsed = (now - this.stageStarted) / 1000;
        const scale = Math.min(this.width / 42, this.height / 41) * (1 + Math.sin(elapsed * 4.1) * .035);
        const centerX = this.width / 2;
        const centerY = this.height * .49;
        ctx.globalCompositeOperation = 'lighter';
        for (let index = 0; index < 8; index += 1) {
            const t = (elapsed * .62 + index / 8) * Math.PI * 2;
            const x = centerX + 16 * Math.sin(t) ** 3 * scale;
            const y = centerY - (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * scale;
            ctx.fillStyle = 'rgba(255, 249, 252, .94)';
            ctx.shadowColor = 'rgba(143, 210, 255, .92)'; ctx.shadowBlur = 16;
            ctx.beginPath(); ctx.arc(x, y, 1.5 + (index % 2) * .6, 0, Math.PI * 2); ctx.fill();
        }
        ctx.shadowBlur = 0;
    }

    frame(now) {
        if (!this.running) return;
        if (!document.hidden) {
            this.drawBackground(now);
            this.drawIntroLine(now);
            this.updateParticles(now);
            this.drawParticles(now);
            this.drawHeartEnergy(now);
        }
        this.raf = requestAnimationFrame(this.frame);
    }

    async play() {
        if (!this.layer) throw new Error('Countdown layer #cinematic-countdown is unavailable.');
        if (!this.canvas || !this.ctx) throw new Error('Countdown canvas could not initialize.');
        if (this.running) throw new Error('Countdown was started while already running.');
        this.stop();
        this.running = true; this.timers = new Set(); this.startedAt = performance.now();
        this.layer.hidden = false; this.layer.removeAttribute('aria-hidden');
        this.layer.className = 'is-running';
        this.resize();
        window.addEventListener('resize', this.resize, { passive: true });
        window.visualViewport?.addEventListener('resize', this.resize, { passive: true });
        this.setStage('intro');
        this.raf = requestAnimationFrame(this.frame);

        await this.wait(this.reduced ? 420 : 2200);
        for (const digit of ['5', '4', '3', '2', '1']) {
            if (!this.running) return;
            this.setStage('digit', digit, this.particles.length > 0);
            await this.wait(this.reduced ? 320 : (digit === '1' ? 1900 : 1700));
        }
        if (!this.running) return;
        this.setStage('text');
        await this.wait(this.reduced ? 440 : 2800);
        if (!this.running) return;
        this.setStage('heart');
        await this.wait(this.reduced ? 550 : 3200);
        this.stop();
    }

    stop() {
        if (!this.running && !this.layer) return;
        this.running = false;
        cancelAnimationFrame(this.raf);
        window.removeEventListener('resize', this.resize);
        window.visualViewport?.removeEventListener('resize', this.resize);
        for (const id of this.timers || []) clearTimeout(id);
        this.timers?.clear();
        this.particles = []; this.field = [];
        if (this.layer) { this.layer.className = ''; this.layer.setAttribute('aria-hidden', 'true'); this.layer.hidden = true; }
    }

    destroy() { this.stop(); }
}
