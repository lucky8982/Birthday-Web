/* Reusable Canvas-only renderer for the hero-balloon rupture.  Sprites are
 * built once; every entry gets a new particle simulation and run token. */
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const lerp = (from, to, amount) => from + (to - from) * amount;
const easeOut = amount => 1 - Math.pow(1 - clamp(amount, 0, 1), 3);

function makeCanvas(size) {
    if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(size, size);
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    return canvas;
}

function sprite(type) {
    const canvas = makeCanvas(72);
    const ctx = canvas.getContext('2d');
    const cx = 36;
    const petal = (x, y, rx, ry, color) => {
        ctx.save(); ctx.translate(x, y); ctx.scale(rx, ry); ctx.beginPath(); ctx.arc(0, 0, 1, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill(); ctx.restore();
    };
    if (!ctx) return canvas;
    ctx.translate(cx, cx);
    switch (type) {
        case 'rose-cluster':
            [[0, -10], [10, -3], [6, 10], [-6, 10], [-10, -3]].forEach(([x, y], index) => petal(x, y, 13, 10, ['#ffd7e0', '#e998b0', '#f7b6c6'][index % 3]));
            ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fillStyle = '#fff5df'; ctx.fill(); break;
        case 'jasmine': case 'flower':
            for (let index = 0; index < 5; index += 1) { ctx.save(); ctx.rotate(index * Math.PI * .4); petal(0, -11, 10, 15, index % 2 ? '#fff9ed' : '#f8c7d4'); ctx.restore(); }
            ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fillStyle = '#f3b664'; ctx.fill(); break;
        case 'chocolate':
            ctx.fillStyle = '#3c1e20'; ctx.fillRect(-20, -17, 40, 34); ctx.fillStyle = '#785042'; ctx.fillRect(-16, -13, 32, 7); break;
        case 'gift':
            ctx.fillStyle = '#d996aa'; ctx.fillRect(-18, -17, 36, 34); ctx.fillStyle = '#fff0c9'; ctx.fillRect(-3, -17, 6, 34); ctx.fillRect(-18, -3, 36, 6); break;
        case 'party-horn':
            ctx.beginPath(); ctx.moveTo(-25, -14); ctx.lineTo(25, 0); ctx.lineTo(-25, 14); ctx.closePath(); ctx.fillStyle = '#f8bbca'; ctx.fill(); break;
        case 'lollipop':
            ctx.strokeStyle = '#d6bfa7'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(8, 14); ctx.lineTo(14, 32); ctx.stroke();
            ctx.beginPath(); ctx.arc(0, 0, 19, 0, Math.PI * 2); ctx.fillStyle = '#f9c2d1'; ctx.fill(); ctx.strokeStyle = '#fff1d6'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 0, 12, .2, Math.PI * 1.6); ctx.stroke(); break;
        case 'wrapped-candy':
            ctx.fillStyle = '#e883a6'; ctx.fillRect(-19, -11, 38, 22); ctx.fillStyle = '#fff0d8'; ctx.fillRect(-5, -11, 8, 22); ctx.fillStyle = '#73d4d7'; ctx.fillRect(10, -11, 7, 22);
            ctx.fillStyle = '#e883a6'; ctx.beginPath(); ctx.moveTo(-19, -8); ctx.lineTo(-30, 0); ctx.lineTo(-19, 8); ctx.fill(); ctx.beginPath(); ctx.moveTo(19, -8); ctx.lineTo(30, 0); ctx.lineTo(19, 8); ctx.fill(); break;
        case 'heart':
            ctx.fillStyle = '#f29ab7'; ctx.beginPath(); ctx.moveTo(0, 21); ctx.bezierCurveTo(-30, 1, -20, -20, -7, -17); ctx.bezierCurveTo(0, -15, 0, -8, 0, -7); ctx.bezierCurveTo(0, -8, 0, -15, 7, -17); ctx.bezierCurveTo(20, -20, 30, 1, 0, 21); ctx.fill(); break;
        case 'ribbon':
            ctx.fillStyle = '#f2a4bf'; ctx.fillRect(-5, -24, 10, 48); ctx.fillStyle = '#9adbe1'; ctx.fillRect(-5, -2, 10, 9); break;
        case 'bow':
            ctx.fillStyle = '#f7b2c6'; ctx.beginPath(); ctx.ellipse(-12, 0, 17, 11, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#85d9dd'; ctx.beginPath(); ctx.ellipse(12, 0, 17, 11, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#fff3d7'; ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.fill(); break;
        case 'pearl':
            ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.fillStyle = '#fff0d8'; ctx.fill(); ctx.beginPath(); ctx.arc(-5, -5, 4, 0, Math.PI * 2); ctx.fillStyle = '#fffdf4'; ctx.fill(); break;
        case 'petal':
            ctx.fillStyle = '#ed9fb8'; ctx.beginPath(); ctx.ellipse(0, 0, 10, 17, Math.PI / 4, 0, Math.PI * 2); ctx.fill(); break;
        case 'streak':
            ctx.fillStyle = '#baf9f4'; ctx.fillRect(-25, -2, 50, 4); break;
        default: // spark, star, dust
            ctx.fillStyle = type === 'spark' ? '#d9ffff' : '#fff3c5'; ctx.beginPath();
            for (let index = 0; index < 8; index += 1) { const radius = index % 2 ? 7 : 23; const angle = -Math.PI / 2 + index * Math.PI / 4; const x = Math.cos(angle) * radius; const y = Math.sin(angle) * radius; index ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
            ctx.closePath(); ctx.fill();
    }
    return canvas;
}

function greetingSprite(fontFamily) {
    const canvas = makeCanvas(1);
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `700 66px ${fontFamily || 'Georgia, serif'}`;
    const firstWidth = ctx.measureText('Happy Birthday').width;
    ctx.font = `italic 600 40px ${fontFamily || 'Georgia, serif'}`;
    const secondWidth = ctx.measureText('Meri pyari biwi').width;
    canvas.width = Math.ceil(Math.max(firstWidth, secondWidth) + 112);
    canvas.height = 224;
    const draw = canvas.getContext('2d');
    const x = canvas.width / 2;
    draw.textAlign = 'center'; draw.textBaseline = 'middle';
    draw.font = `700 66px ${fontFamily || 'Georgia, serif'}`;
    draw.lineWidth = 2; draw.strokeStyle = '#4a2630'; draw.strokeText('Happy Birthday', x, 78);
    draw.fillStyle = '#f7d99a'; draw.fillText('Happy Birthday', x, 78);
    draw.font = `italic 600 40px ${fontFamily || 'Georgia, serif'}`;
    draw.lineWidth = 1.5; draw.strokeStyle = '#4a2630'; draw.strokeText('Meri pyari biwi', x, 154);
    draw.fillStyle = '#fff1d8'; draw.fillText('Meri pyari biwi', x, 154);
    return canvas;
}

export class BirthdayBurst {
    constructor(canvas, { reduced = false } = {}) {
        this.canvas = canvas;
        this.ctx = canvas?.getContext('2d');
        this.reduced = reduced;
        this.sprites = new Map();
        this.particles = [];
        this.frame = 0;
        this.runId = 0;
        this.active = false;
        this.simulationTimeMs = 0;
        this.lastFrameTime = 0;
        this.width = 0;
        this.height = 0;
        this.dpr = 1;
        this.waiters = new Map();
        this.reached = new Set();
        this.greeting = null;
        this.shines = [];
        this.convergence = { x: 0, y: 0 };
        this._frame = time => this.render(time);
        this._visibility = () => this.handleVisibility();
        ['rose-cluster', 'jasmine', 'chocolate', 'heart', 'ribbon', 'bow', 'pearl', 'spark', 'star', 'gift', 'lollipop', 'wrapped-candy', 'party-horn', 'flower', 'petal', 'streak', 'dust'].forEach(type => this.sprites.set(type, sprite(type)));
        document.addEventListener('visibilitychange', this._visibility);
    }

    prepare(runId, geometry, objects, tracks, { fontFamily = '' } = {}) {
        if (!this.canvas || !this.ctx || this.reduced) return;
        this.stopRun();
        this.runId = runId;
        this.resize(geometry.width, geometry.height);
        this.convergence.x = this.width * .5;
        this.convergence.y = this.height * .46;
        this.greeting = greetingSprite(fontFamily);
        this.greetingScale = Math.min(1, Math.max(.1, Math.min(this.width - 40, this.width * .86) / this.greeting.width));
        this.shines = [
            [-.28, -.17, .88], [0, -.25, 1], [.29, -.14, .84], [-.37, .07, .7], [.37, .06, .7], [-.18, .22, .62], [.2, .22, .62],
        ].map(([x, y, weight], index) => ({ x: this.convergence.x + x * this.width, y: this.convergence.y + y * this.height, weight, phase: index * .91 }));
        const count = geometry.mobile ? 68 : Math.min(84, objects.length);
        this.particles.length = 0;
        for (let index = 0; index < count; index += 1) {
            const object = objects[index];
            const [, midX, midY, apexX, apexY, endX, endY, duration, delay, depth] = tracks[object.track];
            const offsetX = object.offsetX || 0;
            const offsetY = object.offsetY || 0;
            const rawX = geometry.originX + (endX + offsetX) * this.width * .72;
            const rawY = geometry.originY + (endY + offsetY) * this.height * .56;
            const margin = Math.max(28, object.size * .65);
            const targetX = clamp(rawX, margin, this.width - margin);
            const targetY = clamp(rawY, margin, this.height - margin);
            const layer = depth === 'rear' ? 0 : depth === 'main' ? 1 : 2;
            const primary = index < Math.min(52, count);
            this.particles.push({
                type: object.type, size: object.size, layer, rotate: index * 31 - 70,
                originX: geometry.originX, originY: geometry.originY, targetX, targetY,
                clusterX: ((index % 8) - 3.5) * 3.1,
                clusterY: ((Math.floor(index / 8) % 8) - 3.5) * 2.7,
                curveX: ((index % 5) - 2) * 10,
                curveY: ((index % 7) - 3) * 7,
                driftX: ((index % 5) - 2) * 2.4, driftY: ((index % 7) - 3) * 1.6,
                phase: index * .47,
                alpha: primary ? (layer === 0 ? .90 : layer === 1 ? .96 : 1) : (layer === 0 ? .68 : .78),
            });
        }
        this.particles.sort((a, b) => a.layer - b.layer);
        this.warmUp();
        this.canvas.hidden = true;
    }

    warmUp() {
        if (!this.ctx || !this.greeting) return;
        const ctx = this.ctx;
        ['rose-cluster', 'jasmine', 'ribbon', 'chocolate', 'gift', 'spark'].forEach((type, index) => ctx.drawImage(this.sprites.get(type), index * 3, 0, 2, 2));
        ctx.drawImage(this.greeting, 0, 0, 2, 1);
        ctx.clearRect(0, 0, this.width, this.height);
    }

    resize(width, height) {
        if (!this.canvas || !this.ctx) return;
        this.width = Math.max(1, Math.round(width)); this.height = Math.max(1, Math.round(height));
        this.dpr = Math.min(window.devicePixelRatio || 1, window.matchMedia?.('(max-width: 540px)').matches ? 1.5 : 2);
        this.canvas.width = Math.round(this.width * this.dpr); this.canvas.height = Math.round(this.height * this.dpr);
        this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }

    start(runId) {
        if (this.reduced || runId !== this.runId || !this.particles.length) return;
        this.active = true; this.simulationTimeMs = 0; this.lastFrameTime = 0; this.reached.clear(); this.canvas.hidden = false;
        this.frame = requestAnimationFrame(this._frame);
    }

    waitFor(runId, milestone) {
        if (runId !== this.runId || !this.active) return Promise.resolve(false);
        if (this.reached.has(milestone)) return Promise.resolve(true);
        return new Promise(resolve => this.waiters.set(milestone, resolve));
    }

    reach(name) {
        if (this.reached.has(name)) return;
        this.reached.add(name); const resolve = this.waiters.get(name); this.waiters.delete(name); resolve?.(true);
    }

    render(now) {
        if (!this.active) return;
        if (document.hidden) { this.frame = 0; return; }
        if (!this.lastFrameTime) { this.lastFrameTime = now; this.draw(); this.frame = requestAnimationFrame(this._frame); return; }
        const delta = Math.min(30, Math.max(0, now - this.lastFrameTime));
        this.lastFrameTime = now; this.simulationTimeMs += delta;
        this.draw();
        if (this.simulationTimeMs >= 220) this.reach('shell');
        if (this.simulationTimeMs >= 1550) this.reach('rain');
        if (this.simulationTimeMs >= 3270) this.reach('greeting');
        if (this.simulationTimeMs >= 7650) { this.reach('handoff'); this.stopRun(this.runId); return; }
        this.frame = requestAnimationFrame(this._frame);
    }

    draw() {
        const ctx = this.ctx; const time = this.simulationTimeMs;
        ctx.clearRect(0, 0, this.width, this.height);
        if (time < 260) this.drawShock(time);
        for (const particle of this.particles) {
            // A normalized exponential gives the reference-like dense exit at
            // 0.5s, then a visibly slower full spread through 2.8s.
            const expansion = clamp((1 - Math.exp(-time / 980)) / (1 - Math.exp(-2800 / 980)), 0, 1);
            const curve = Math.sin(expansion * Math.PI);
            let x = lerp(particle.originX + particle.clusterX, particle.targetX, expansion) + particle.curveX * curve;
            let y = lerp(particle.originY + particle.clusterY, particle.targetY, expansion) + particle.curveY * curve;
            let scale = lerp(.34, 1, expansion);
            let alpha = particle.alpha;
            if (time >= 1400) { x += Math.sin(time * .0011 + particle.phase) * particle.driftX; y += Math.cos(time * .0009 + particle.phase) * particle.driftY; }
            if (time >= 6400) { const collapse = easeOut((time - 6400) / 1100); x = lerp(x, this.convergence.x, collapse); y = lerp(y, this.convergence.y, collapse); scale *= lerp(1, .15, collapse); alpha *= collapse > .7 ? 1 - (collapse - .7) / .3 : 1; }
            const image = this.sprites.get(particle.type) || this.sprites.get('spark');
            const drawnSize = particle.size * scale;
            ctx.save(); ctx.translate(x, y); ctx.rotate((particle.rotate + time * .018) * Math.PI / 180); ctx.globalAlpha = alpha; ctx.drawImage(image, -drawnSize / 2, -drawnSize / 2, drawnSize, drawnSize); ctx.restore();
        }
        this.drawGreeting(time);
        this.drawShines(time);
    }

    drawGreeting(time) {
        if (!this.greeting || time < 3270) return;
        const ctx = this.ctx; const formation = easeOut((time - 3270) / 860); let scale = this.greetingScale * lerp(.11, 1, formation); let alpha = lerp(.15, 1, formation); let y = this.convergence.y;
        if (time >= 6400) { const collapse = easeOut((time - 6400) / 1100); scale *= lerp(1, .15, collapse); y = lerp(y, this.convergence.y - 4, collapse); alpha *= collapse > .7 ? 1 - (collapse - .7) / .3 : 1; }
        ctx.save(); ctx.translate(this.convergence.x, y); ctx.scale(scale, scale); ctx.globalAlpha = alpha; ctx.drawImage(this.greeting, -this.greeting.width / 2, -this.greeting.height / 2); ctx.restore();
    }

    drawShines(time) {
        if (time < 3270) return;
        const ctx = this.ctx; const formation = easeOut((time - 3270) / 860); const collapse = time >= 6400 ? easeOut((time - 6400) / 1100) : 0;
        for (const shine of this.shines) { const x = lerp(shine.x, this.convergence.x, collapse); const y = lerp(shine.y, this.convergence.y, collapse); const alpha = formation * shine.weight * (collapse > .72 ? 1 - (collapse - .72) / .28 : 1) * (.78 + Math.sin(time * .003 + shine.phase) * .16); const size = (8 + shine.weight * 10) * (1 - collapse * .7); ctx.save(); ctx.translate(x, y); ctx.globalAlpha = alpha; ctx.drawImage(this.sprites.get('spark'), -size, -size, size * 2, size * 2); ctx.restore(); }
    }

    drawShock(time) {
        const progress = time / 260; const radius = lerp(4, 74, progress); const alpha = (1 - progress) * .9;
        const origin = this.particles[0]; if (!origin) return;
        const ctx = this.ctx; ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = '#ffd9de'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(origin.originX, origin.originY, radius, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = '#fffdf2'; ctx.beginPath(); ctx.arc(origin.originX, origin.originY, lerp(8, 2, progress), 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }

    handleVisibility() { if (!this.active || !this.canvas) return; if (document.hidden) { if (this.frame) cancelAnimationFrame(this.frame); this.frame = 0; } else { this.lastFrameTime = performance.now(); if (!this.frame) this.frame = requestAnimationFrame(this._frame); } }

    stopRun(runId = this.runId) {
        if (runId !== this.runId && this.runId) return;
        if (this.frame) cancelAnimationFrame(this.frame); this.frame = 0; this.active = false; this.lastFrameTime = 0; this.simulationTimeMs = 0;
        for (const resolve of this.waiters.values()) resolve(false); this.waiters.clear(); this.reached.clear(); this.particles.length = 0;
        this.ctx?.clearRect(0, 0, this.width, this.height); if (this.canvas) this.canvas.hidden = true;
    }

    destroy() { this.stopRun(); document.removeEventListener('visibilitychange', this._visibility); this.sprites.clear(); }
}
