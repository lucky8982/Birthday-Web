const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const ease = (value) => 1 - Math.pow(1 - clamp(value, 0, 1), 3);

const FLOWERS = [
    { name: 'jasmine', weight: 25, petals: '#fff9e9', edge: '#fffdf6', center: '#efd17b' },
    { name: 'coral', weight: 25, petals: '#e99b91', edge: '#f4c1b5', center: '#e6b56e' },
    { name: 'rose', weight: 12, petals: '#df9aae', edge: '#f1bdca', center: '#d6859f' },
    { name: 'tulip', weight: 10, petals: '#c99bd0', edge: '#e3c4e5', center: '#e9bc92' },
    { name: 'daisy', weight: 9, petals: '#fffaf1', edge: '#ffffff', center: '#e4b959' },
    { name: 'lavender', weight: 7, petals: '#b9a2d6', edge: '#d7c9eb', center: '#9675bb' },
    { name: 'lily', weight: 5, petals: '#f0c5d7', edge: '#ffe9f0', center: '#d7a75e' },
    { name: 'wild', weight: 7, petals: '#e4b8d8', edge: '#f1d7e9', center: '#f0c775' },
];

const GARDEN_PROGRESS_KEY = 'hbm.infiniteGardenProgress';
const GARDEN_PROGRESS_VERSION = 1;
const MAX_SAVED_FLOWERS = 80;
const FLOWER_BY_NAME = new Map(FLOWERS.map((flower) => [flower.name, flower]));
const INITIAL_INSTRUCTION = 'Jahan dil kare, wahan tap karo... aur hamari kahani me ek aur phool khilne do. ❤️';
const FIRST_JASMINE_MESSAGE = 'Sabse pehla phool Jasmine... tumhari pasand ka, aur meri taraf se sirf tumhare liye. ❤️';
const LATER_INSTRUCTION = 'Jahan dil kare tap karo... yeh gulshan hamare saath ke saath badhta rahega.';
const BIRTHDAY_MILESTONE_TOUCH = 23;

function inRange(value, min, max) {
    return Number.isFinite(value) && value >= min && value <= max;
}

function serializeFlower(flower) {
    return {
        species: flower.species.name,
        bx: flower.bx, ex: flower.ex, ey: flower.ey, c1: flower.c1, c2: flower.c2,
        side: flower.side, rotation: flower.rotation, scale: flower.scale,
        petalCount: flower.petalCount, leaves: flower.leaves, cluster: flower.cluster,
    };
}

function deserializeFlower(data) {
    const species = FLOWER_BY_NAME.get(data?.species);
    if (!species ||
        !inRange(data.bx, 0, 1) || !inRange(data.ex, 0, 1) || !inRange(data.ey, 0, 1) ||
        !inRange(data.c1, -0.12, 0.12) || !inRange(data.c2, -0.22, 0.22) ||
        (data.side !== -1 && data.side !== 1) || !inRange(data.rotation, -0.55, 0.55) ||
        !inRange(data.scale, 0.7, 1.08) || !Number.isInteger(data.petalCount) || data.petalCount < 5 || data.petalCount > 8 ||
        !Number.isInteger(data.leaves) || data.leaves < 2 || data.leaves > 3 ||
        !Number.isInteger(data.cluster) || data.cluster < 1 || data.cluster > 3) return null;
    return { ...data, species };
}

function pickFlower() {
    const roll = Math.random() * FLOWERS.reduce((total, item) => total + item.weight, 0);
    let cursor = 0;
    return FLOWERS.find((item) => (cursor += item.weight) >= roll) || FLOWERS[0];
}

/* Completed flowers live on a static canvas; only new growth uses RAF. */
export class InfiniteGarden {
    constructor(selector = '#infinite-garden') {
        this.root = document.querySelector(selector);
        this.staticCanvas = this.root?.querySelector('.infinite-garden-static-canvas');
        this.activeCanvas = this.root?.querySelector('.infinite-garden-active-canvas');
        this.staticCtx = this.staticCanvas?.getContext('2d');
        this.activeCtx = this.activeCanvas?.getContext('2d');
        this.instruction = this.root?.querySelector('.infinite-garden-instruction');
        this.flowers = [];
        this.active = [];
        this.firstBloomPending = null;
        this.milestoneFlowerPending = null;
        this.acceptedTouches = 0;
        this.birthdayMilestone = { triggered: false, settled: false };
        this.messageTimer = 0;
        this.milestoneTimer = 0;
        this.milestoneDismissTimer = 0;
        this.milestoneExitTimer = 0;
        this.raf = 0;
        this.entryFrame = 0;
        this.run = 0;
        this.running = false;
        this.initialized = false;
        this.width = 0;
        this.height = 0;
        this.dpr = 1;
        this.reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
        this.milestone = this.root?.querySelector('.infinite-garden-milestone');
        this._pointer = this.handlePointer.bind(this);
        this._resize = this.resize.bind(this);
        this._tick = this.tick.bind(this);
    }

    init() { this.initialized = !!(this.root && this.staticCtx && this.activeCtx); return this; }

    start() {
        if (!this.initialized) this.init();
        if (!this.initialized) return;
        const run = ++this.run;
        if (this.entryFrame) cancelAnimationFrame(this.entryFrame);
        this.running = true;
        this.root.hidden = false;
        this.root.classList.remove('is-visible', 'is-active', 'is-entered');
        this.resize();
        const restoreMilestone = this.restorePersistedFlowers();
        this.root.removeEventListener('pointerdown', this._pointer);
        this.root.addEventListener('pointerdown', this._pointer);
        window.removeEventListener('resize', this._resize);
        window.addEventListener('resize', this._resize, { passive: true });
        void this.root.offsetWidth;
        this.root.classList.add('is-visible', 'is-active');
        if (restoreMilestone) this.showBirthdayMilestone({ restored: true });
        this.entryFrame = requestAnimationFrame(() => {
            this.entryFrame = 0;
            if (this.running && run === this.run) this.root?.classList.add('is-entered');
        });
    }

    stop() {
        this.run += 1;
        this.running = false;
        this.root?.removeEventListener('pointerdown', this._pointer);
        window.removeEventListener('resize', this._resize);
        if (this.raf) cancelAnimationFrame(this.raf);
        this.raf = 0;
        if (this.entryFrame) cancelAnimationFrame(this.entryFrame);
        this.entryFrame = 0;
        this.clearMessageTimer();
        this.hideBirthdayMilestone();
        this.active.length = 0;
        this.root?.classList.remove('is-visible', 'is-active', 'is-entered');
        if (this.root) this.root.hidden = true;
    }

    reset() {
        if (this.raf) cancelAnimationFrame(this.raf);
        this.raf = 0;
        this.flowers.length = 0;
        this.active.length = 0;
        this.firstBloomPending = null;
        this.milestoneFlowerPending = null;
        this.acceptedTouches = 0;
        this.birthdayMilestone = { triggered: false, settled: false };
        this.clearMessageTimer();
        this.hideBirthdayMilestone();
        this.clearPersistedFlowers();
        this.setInstruction(INITIAL_INSTRUCTION, 0);
        this.renderStatic();
        this.clearActive();
    }

    destroy() { this.stop(); this.flowers.length = 0; this.initialized = false; }

    resize() {
        if (!this.root || !this.staticCanvas || !this.activeCanvas) return;
        const rect = this.root.getBoundingClientRect();
        this.width = Math.max(1, rect.width);
        this.height = Math.max(1, rect.height);
        this.dpr = Math.min(window.devicePixelRatio || 1, 2);
        for (const canvas of [this.staticCanvas, this.activeCanvas]) {
            canvas.width = Math.round(this.width * this.dpr);
            canvas.height = Math.round(this.height * this.dpr);
            canvas.style.width = `${this.width}px`;
            canvas.style.height = `${this.height}px`;
        }
        this.staticCtx?.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        this.activeCtx?.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        this.renderStatic();
        if (this.active.length) this.requestFrame();
    }

    grassHeight() { return clamp(this.height * 0.19, 82, 168); }

    handlePointer(event) {
        if (!this.running || this.isBirthdayMilestoneOpen() || this.milestoneExitTimer || event.defaultPrevented || event.isPrimary === false || (event.button !== undefined && event.button !== 0)) return;
        if (event.target.closest('button, a, input, textarea, select, [data-garden-control], .music-toggle, .experience-back-btn')) return;
        const rect = this.root.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        if (x < 0 || x > this.width || y < 0 || y > this.height) return;
        this.plant(x, y);
    }

    plant(x, y) {
        const ground = this.height - this.grassHeight() * 0.47;
        const rootSpread = clamp(this.width * 0.04, 13, 48);
        const isFirstBloom = !this.firstBloomPending && this.flowers.length === 0 && this.active.length === 0;
        const species = isFirstBloom ? FLOWER_BY_NAME.get('jasmine') : pickFlower();
        const safeX = clamp(x, 22, this.width - 22);
        const safeY = clamp(y, Math.max(148, this.height * 0.29), ground - 34);
        const rootX = this.width * 0.5 + (Math.random() - 0.5) * rootSpread * 2;
        const curve = safeX - rootX;
        const flower = {
            bx: rootX / this.width,
            ex: safeX / this.width,
            ey: safeY / this.height,
            c1: clamp(curve * 0.11 + (Math.random() - 0.5) * 10, -this.width * 0.12, this.width * 0.12) / this.width,
            c2: clamp(-curve * 0.24 + (Math.random() - 0.5) * 14, -this.width * 0.22, this.width * 0.22) / this.width,
            side: Math.random() > 0.5 ? 1 : -1,
            rotation: (Math.random() - 0.5) * 0.55,
            scale: 0.7 + Math.random() * 0.38,
            petalCount: species.name === 'jasmine' ? 5 + Math.floor(Math.random() * 4) : 5 + Math.floor(Math.random() * 3),
            leaves: 2 + Math.floor(Math.random() * 2),
            cluster: species.name === 'jasmine' && Math.random() > 0.5 ? 2 + Math.floor(Math.random() * 2) : 1,
            species,
            started: performance.now(),
            duration: this.reduced ? 380 : 1500 + Math.random() * 700,
        };
        const nextTouch = this.acceptedTouches + 1;
        const isBirthdayMilestoneTouch = nextTouch === BIRTHDAY_MILESTONE_TOUCH && !this.birthdayMilestone.triggered;
        this.acceptedTouches = nextTouch;
        if (isFirstBloom) this.firstBloomPending = flower;
        if (isBirthdayMilestoneTouch) {
            this.milestoneFlowerPending = flower;
            this.birthdayMilestone = { triggered: true, settled: false };
        }
        this.savePersistedFlowers();
        this.active.push(flower);
        this.setInstruction(LATER_INSTRUCTION, this.flowers.length + this.active.length);
        this.requestFrame();
    }

    restorePersistedFlowers() {
        this.active.length = 0;
        let flowers = [];
        let firstBloom = null;
        let milestoneFlower = null;
        let acceptedTouches = 0;
        let birthdayMilestone = { triggered: false, settled: false };
        try {
            const raw = window.localStorage.getItem(GARDEN_PROGRESS_KEY);
            const data = raw ? JSON.parse(raw) : null;
            if (data?.version === GARDEN_PROGRESS_VERSION && Array.isArray(data.flowers) && data.flowers.length <= MAX_SAVED_FLOWERS) {
                const restoredFlowers = data.flowers.map(deserializeFlower);
                if (!restoredFlowers.some((flower) => !flower)) {
                    flowers = restoredFlowers;
                    firstBloom = data.firstBloom ? deserializeFlower(data.firstBloom) : null;
                    milestoneFlower = data.milestoneFlower ? deserializeFlower(data.milestoneFlower) : null;
                    const legacyCount = flowers.length + (firstBloom ? 1 : 0) + (milestoneFlower ? 1 : 0);
                    const hasAcceptedTouches = Number.isSafeInteger(data.acceptedTouches) && data.acceptedTouches >= 0;
                    acceptedTouches = hasAcceptedTouches ? data.acceptedTouches : legacyCount;
                    const savedMilestone = data.birthdayMilestone;
                    if (savedMilestone?.triggered === true && acceptedTouches >= BIRTHDAY_MILESTONE_TOUCH) {
                        birthdayMilestone = { triggered: true, settled: savedMilestone.settled === true };
                    } else if (!hasAcceptedTouches && acceptedTouches >= BIRTHDAY_MILESTONE_TOUCH) {
                        birthdayMilestone = { triggered: true, settled: true };
                    }
                }
            }
        } catch {
            flowers = [];
        }
        if (firstBloom?.species.name === 'jasmine') {
            flowers = [firstBloom, ...flowers].slice(0, MAX_SAVED_FLOWERS);
        }
        if (milestoneFlower && birthdayMilestone.triggered && !birthdayMilestone.settled) {
            flowers = [milestoneFlower, ...flowers].slice(0, MAX_SAVED_FLOWERS);
        }
        this.flowers = flowers;
        this.firstBloomPending = null;
        this.milestoneFlowerPending = null;
        this.acceptedTouches = acceptedTouches;
        this.birthdayMilestone = birthdayMilestone;
        this.clearMessageTimer();
        this.hideBirthdayMilestone();
        this.setInstruction(flowers.length ? LATER_INSTRUCTION : INITIAL_INSTRUCTION, flowers.length);
        this.renderStatic();
        if (firstBloom || milestoneFlower) this.savePersistedFlowers();
        return birthdayMilestone.triggered && !birthdayMilestone.settled;
    }

    savePersistedFlowers() {
        try {
            window.localStorage.setItem(GARDEN_PROGRESS_KEY, JSON.stringify({
                version: GARDEN_PROGRESS_VERSION,
                flowers: this.flowers.slice(0, MAX_SAVED_FLOWERS).map(serializeFlower),
                acceptedTouches: this.acceptedTouches,
                birthdayMilestone: this.birthdayMilestone,
                ...(this.firstBloomPending ? { firstBloom: serializeFlower(this.firstBloomPending) } : {}),
                ...(this.milestoneFlowerPending ? { milestoneFlower: serializeFlower(this.milestoneFlowerPending) } : {}),
            }));
        } catch {
            /* Storage is best-effort; the current garden remains usable. */
        }
    }

    clearPersistedFlowers() {
        try { window.localStorage.removeItem(GARDEN_PROGRESS_KEY); } catch { /* ignore */ }
    }

    requestFrame() { if (!this.raf && this.running) this.raf = requestAnimationFrame(this._tick); }

    clearMessageTimer() {
        if (this.messageTimer) window.clearTimeout(this.messageTimer);
        this.messageTimer = 0;
    }

    clearMilestoneTimers() {
        if (this.milestoneTimer) window.clearTimeout(this.milestoneTimer);
        if (this.milestoneDismissTimer) window.clearTimeout(this.milestoneDismissTimer);
        if (this.milestoneExitTimer) window.clearTimeout(this.milestoneExitTimer);
        this.milestoneTimer = 0;
        this.milestoneDismissTimer = 0;
        this.milestoneExitTimer = 0;
    }

    isBirthdayMilestoneOpen() {
        return this.birthdayMilestone.triggered && !this.birthdayMilestone.settled;
    }

    showBirthdayMilestone({ restored = false } = {}) {
        if (!this.isBirthdayMilestoneOpen() || !this.milestone) return;
        this.clearMilestoneTimers();
        const run = this.run;
        this.root?.classList.add('is-birthday-milestone');
        this.milestone.hidden = false;
        this.milestone.removeAttribute('aria-hidden');
        this.milestone.classList.remove('is-leaving', 'is-settled', 'is-restored');
        if (restored) this.milestone.classList.add('is-restored');
        void this.milestone.offsetWidth;
        this.milestone.classList.add('is-visible');
        const beginReadableHold = () => {
            if (!this.running || run !== this.run || !this.isBirthdayMilestoneOpen()) return;
            this.milestone.classList.add('is-settled');
            this.milestoneDismissTimer = window.setTimeout(() => {
                this.milestoneDismissTimer = 0;
                if (!this.running || run !== this.run || !this.isBirthdayMilestoneOpen()) return;
                this.settleBirthdayMilestone(run);
            }, 4600);
        };
        if (restored || this.reduced) {
            beginReadableHold();
            return;
        }
        this.milestoneTimer = window.setTimeout(() => {
            this.milestoneTimer = 0;
            beginReadableHold();
        }, 1100);
    }

    hideBirthdayMilestone() {
        this.clearMilestoneTimers();
        this.root?.classList.remove('is-birthday-milestone');
        if (!this.milestone) return;
        this.milestone.classList.remove('is-visible', 'is-leaving', 'is-settled', 'is-restored');
        this.milestone.setAttribute('aria-hidden', 'true');
        this.milestone.hidden = true;
    }

    settleBirthdayMilestone(run = this.run) {
        if (!this.isBirthdayMilestoneOpen()) return;
        this.birthdayMilestone = { triggered: true, settled: true };
        this.savePersistedFlowers();
        this.clearMilestoneTimers();
        if (!this.milestone) return;
        this.milestone.classList.add('is-leaving');
        this.milestoneExitTimer = window.setTimeout(() => {
            this.milestoneExitTimer = 0;
            if (!this.running || run !== this.run) return;
            this.root?.classList.remove('is-birthday-milestone');
            this.milestone?.classList.remove('is-visible', 'is-leaving', 'is-settled', 'is-restored');
            this.milestone?.setAttribute('aria-hidden', 'true');
            if (this.milestone) this.milestone.hidden = true;
            this.setInstruction(LATER_INSTRUCTION, this.flowers.length + this.active.length);
        }, this.reduced ? 0 : 720);
    }

    setInstruction(message, count) {
        if (!this.instruction) return;
        this.instruction.textContent = message;
        this.instruction.classList.toggle('is-softened', count >= 1);
        this.instruction.classList.toggle('is-hidden', count >= 3);
    }

    showFirstJasmineMessage() {
        this.clearMessageTimer();
        this.setInstruction(FIRST_JASMINE_MESSAGE, 0);
        this.messageTimer = window.setTimeout(() => {
            this.messageTimer = 0;
            if (!this.running) return;
            this.setInstruction(LATER_INSTRUCTION, this.flowers.length + this.active.length);
        }, 4200);
    }

    tick(now) {
        this.raf = 0;
        if (!this.running) return;
        this.clearActive();
        const growing = [];
        let committed = false;
        for (const flower of this.active) {
            const progress = clamp((now - flower.started) / flower.duration, 0, 1);
            this.drawPlant(this.activeCtx, flower, progress, true);
            if (progress >= 1) {
                this.flowers.push(flower);
                if (flower === this.firstBloomPending) {
                    this.firstBloomPending = null;
                    this.showFirstJasmineMessage();
                }
                if (flower === this.milestoneFlowerPending) {
                    this.milestoneFlowerPending = null;
                    this.showBirthdayMilestone();
                }
                committed = true;
            } else growing.push(flower);
        }
        if (committed) {
            this.renderStatic();
            this.savePersistedFlowers();
        }
        this.active = growing;
        if (this.active.length) this.requestFrame();
    }

    clearActive() { this.activeCtx?.clearRect(0, 0, this.width, this.height); }

    renderStatic() {
        const ctx = this.staticCtx;
        if (!ctx) return;
        ctx.clearRect(0, 0, this.width, this.height);
        this.drawGardenBase(ctx);
        this.flowers.forEach((flower) => this.drawPlant(ctx, flower, 1, false));
        this.drawForeground(ctx);
    }

    drawGardenBase(ctx) {
        const h = this.grassHeight(), top = this.height - h;
        const fill = ctx.createLinearGradient(0, top, 0, this.height);
        fill.addColorStop(0, 'rgba(50, 99, 70, 0.04)'); fill.addColorStop(0.2, 'rgba(36, 88, 60, 0.36)'); fill.addColorStop(0.56, 'rgba(20, 65, 46, 0.78)'); fill.addColorStop(1, 'rgba(6, 27, 24, 0.99)');
        ctx.fillStyle = fill; ctx.fillRect(0, top, this.width, h);
        this.drawDistantGrass(ctx, top, h);
        this.drawSideFoliage(ctx, 'left');
        this.drawSideFoliage(ctx, 'right');
        const center = this.width * 0.5, base = this.height - h * 0.43;
        const glow = ctx.createRadialGradient(center, base, 0, center, base, clamp(this.width * 0.13, 45, 110));
        glow.addColorStop(0, 'rgba(237, 202, 123, 0.18)'); glow.addColorStop(0.45, 'rgba(100, 158, 103, 0.13)'); glow.addColorStop(1, 'rgba(45, 88, 61, 0)');
        ctx.fillStyle = glow; ctx.beginPath(); ctx.ellipse(center, base, clamp(this.width * 0.15, 54, 125), h * 0.34, 0, 0, Math.PI * 2); ctx.fill();
        ctx.lineCap = 'round';
        for (let row = 0; row < 3; row += 1) {
            const blades = Math.ceil(this.width / (8 + row * 6));
            ctx.strokeStyle = row === 0 ? 'rgba(122, 173, 116, 0.2)' : row === 1 ? 'rgba(52, 112, 72, 0.5)' : 'rgba(28, 83, 56, 0.7)'; ctx.lineWidth = row === 0 ? 0.65 : row === 1 ? 0.9 : 1.15;
            for (let i = 0; i <= blades; i += 1) this.blade(ctx, (i / blades) * this.width, this.height - row * 8, 13 + ((i * 11 + row * 17) % 21), Math.sin(i * 2.4 + row) * 6);
        }
        this.drawCentralBed(ctx, center, base, h);
    }

    drawDistantGrass(ctx, top, h) {
        ctx.fillStyle = 'rgba(26, 72, 52, 0.42)';
        ctx.beginPath();
        ctx.moveTo(0, this.height);
        for (let x = 0; x <= this.width + 12; x += 12) {
            const y = top + h * (0.36 + Math.sin(x * 0.075) * 0.035 + ((x / 12) % 4) * 0.012);
            ctx.quadraticCurveTo(x + 6, y - h * 0.06, x + 12, y);
        }
        ctx.lineTo(this.width, this.height); ctx.closePath(); ctx.fill();
    }

    drawForeground(ctx) {
        ctx.strokeStyle = 'rgba(17, 62, 41, 0.88)'; ctx.lineWidth = 1.35;
        const blades = Math.ceil(this.width / 12);
        for (let i = 0; i <= blades; i += 1) this.blade(ctx, (i / blades) * this.width, this.height + 1, 16 + ((i * 7) % 18), Math.sin(i * 3.1) * 8);
        const center = this.width * 0.5, y = this.height - this.grassHeight() * 0.36;
        ctx.fillStyle = 'rgba(73, 129, 76, 0.8)';
        for (let i = -3; i <= 3; i += 1) this.leafShape(ctx, center + i * 9, y + Math.abs(i) * 2, i < 0 ? -1 : 1, 8);
        this.drawStoneCluster(ctx, 'left');
        this.drawStoneCluster(ctx, 'right');
    }

    blade(ctx, x, y, length, lean) { ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + lean * 0.16, y - length * 0.55, x + lean, y - length); ctx.stroke(); }

    drawSideFoliage(ctx, sideName) {
        const side = sideName === 'left' ? 1 : -1, x0 = sideName === 'left' ? 0 : this.width, h = this.grassHeight(), y = this.height - h * 0.22;
        ctx.fillStyle = 'rgba(11, 51, 39, 0.88)';
        ctx.beginPath(); ctx.moveTo(x0, this.height); ctx.quadraticCurveTo(x0 + side * this.width * 0.1, y - h * 0.75, x0 + side * this.width * 0.27, this.height); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(49, 105, 70, 0.72)';
        for (let i = 0; i < 13; i += 1) {
            const x = x0 + side * (12 + i * 13), leafY = y + (i % 3) * 11;
            this.leafShape(ctx, x, leafY, side, 9 + (i % 4) * 3);
        }
        ctx.strokeStyle = 'rgba(83, 135, 85, 0.58)'; ctx.lineWidth = 1;
        for (let fern = 0; fern < 3; fern += 1) this.drawFern(ctx, x0 + side * (22 + fern * 27), this.height - h * 0.14, side, 20 + fern * 4);
    }

    drawCentralBed(ctx, center, base, h) {
        ctx.fillStyle = 'rgba(67, 122, 76, 0.45)';
        for (let i = -6; i <= 6; i += 1) this.leafShape(ctx, center + i * 7, base + Math.abs(i) * 1.7, i < 0 ? -1 : 1, 7 + (Math.abs(i) % 3));
        ctx.strokeStyle = 'rgba(144, 185, 106, 0.25)'; ctx.lineWidth = 0.8;
        for (let i = -4; i <= 4; i += 1) this.blade(ctx, center + i * 10, base + h * 0.27, 17 + (Math.abs(i) % 3) * 4, i * 1.5);
    }

    drawFern(ctx, x, y, side, size) {
        ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + side * size * 0.2, y - size * 0.6, x + side * size * 0.38, y - size); ctx.stroke();
        for (let i = 1; i < 5; i += 1) {
            const stemX = x + side * size * (i * 0.075), stemY = y - size * (i * 0.19);
            ctx.beginPath(); ctx.moveTo(stemX, stemY); ctx.quadraticCurveTo(stemX + side * size * 0.24, stemY - size * 0.08, stemX + side * size * 0.32, stemY - size * 0.2); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(stemX, stemY); ctx.quadraticCurveTo(stemX - side * size * 0.15, stemY - size * 0.04, stemX - side * size * 0.21, stemY - size * 0.14); ctx.stroke();
        }
    }

    drawStoneCluster(ctx, sideName) {
        const side = sideName === 'left' ? 1 : -1, x0 = sideName === 'left' ? 0 : this.width;
        const stones = [[22, 0, 10, 5], [42, 7, 15, 7], [67, 1, 8, 4]];
        for (const [offset, lift, rx, ry] of stones) {
            const x = x0 + side * offset, y = this.height - 7 - lift;
            const shade = ctx.createLinearGradient(x - rx, y - ry, x + rx, y + ry);
            shade.addColorStop(0, 'rgba(132, 142, 137, 0.6)'); shade.addColorStop(0.58, 'rgba(72, 87, 83, 0.78)'); shade.addColorStop(1, 'rgba(33, 48, 48, 0.82)');
            ctx.fillStyle = shade; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, side * 0.12, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = 'rgba(192, 201, 187, 0.11)'; ctx.lineWidth = 0.7; ctx.stroke();
        }
    }

    leafShape(ctx, x, y, side, size) { ctx.save(); ctx.translate(x, y); ctx.rotate(side * 0.55); ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(side * size * 0.95, -size * 1.05, side * size * 1.5, -size * 0.15); ctx.quadraticCurveTo(side * size * 0.66, size * 0.35, 0, 0); ctx.fill(); ctx.restore(); }

    geometry(f) {
        const base = { x: f.bx * this.width, y: this.height - this.grassHeight() * 0.42 }, end = { x: f.ex * this.width, y: f.ey * this.height }, span = base.y - end.y;
        return { base, end, c1: { x: base.x + f.c1 * this.width, y: base.y - span * 0.38 }, c2: { x: end.x + f.c2 * this.width, y: end.y + span * 0.41 } };
    }

    point(g, t) { const i = 1 - t; return { x: i ** 3 * g.base.x + 3 * i ** 2 * t * g.c1.x + 3 * i * t ** 2 * g.c2.x + t ** 3 * g.end.x, y: i ** 3 * g.base.y + 3 * i ** 2 * t * g.c1.y + 3 * i * t ** 2 * g.c2.y + t ** 3 * g.end.y }; }

    drawPlant(ctx, f, progress, animated) {
        const g = this.geometry(f), seed = ease(progress / 0.16), stem = ease((progress - 0.1) / 0.48), leaves = ease((progress - 0.43) / 0.25), bud = ease((progress - 0.66) / 0.17), bloom = ease((progress - 0.77) / 0.23);
        if (seed && animated) { const radius = 9 + seed * 24, glow = ctx.createRadialGradient(g.base.x, g.base.y, 0, g.base.x, g.base.y, radius); glow.addColorStop(0, `rgba(245, 201, 109, ${0.46 * (1 - seed * 0.3)})`); glow.addColorStop(1, 'rgba(245, 201, 109, 0)'); ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(g.base.x, g.base.y, radius, 0, Math.PI * 2); ctx.fill(); }
        if (stem) { ctx.strokeStyle = '#537e61'; ctx.lineWidth = 1.4 + f.scale * 1.35; ctx.lineCap = 'round'; ctx.beginPath(); for (let i = 0; i <= 28; i += 1) { const p = this.point(g, i / 28 * stem); if (i) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); } ctx.stroke(); }
        if (leaves) for (let i = 0; i < f.leaves; i += 1) this.drawLeaf(ctx, f, g, 0.37 + i * 0.19, i % 2 ? -f.side : f.side, leaves * (1 - i * 0.08));
        if (bud) { const end = this.point(g, Math.max(stem, 0.92)); ctx.save(); ctx.translate(end.x, end.y); ctx.rotate(f.rotation); ctx.fillStyle = f.species.edge; ctx.globalAlpha = bloom ? 1 - bloom * 0.75 : bud; ctx.beginPath(); ctx.ellipse(0, -4 * f.scale, 4.2 * f.scale * bud, 7 * f.scale * bud, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
        if (bloom) this.drawFlower(ctx, f, g.end, bloom);
        if (animated && bloom > 0.85 && progress < 1) this.sparkles(ctx, g.end, bloom);
    }

    drawLeaf(ctx, f, g, t, side, progress) { const p = this.point(g, t), size = (8 + f.scale * 6) * progress; ctx.fillStyle = 'rgba(92, 145, 90, 0.94)'; this.leafShape(ctx, p.x, p.y, side, size); }

    drawFlower(ctx, f, end, bloom) {
        const size = (10 + f.scale * 9) * bloom;
        ctx.save(); ctx.translate(end.x, end.y); ctx.rotate(f.rotation); ctx.shadowColor = f.species.edge; ctx.shadowBlur = 9 * bloom;
        if (f.species.name === 'jasmine') this.jasmine(ctx, f, size);
        else if (f.species.name === 'coral') this.coral(ctx, f, size);
        else if (f.species.name === 'rose') this.rose(ctx, f, size);
        else if (f.species.name === 'tulip') this.tulip(ctx, f, size);
        else if (f.species.name === 'lavender') this.lavender(ctx, f, size);
        else this.petalled(ctx, f, size, f.species.name === 'daisy' ? 9 : f.species.name === 'lily' ? 6 : f.petalCount, f.species.name === 'daisy' ? 0.24 : 0.42, f.species.name === 'lily' ? 1.2 : 0.9);
        ctx.restore();
    }

    petalled(ctx, f, size, count, width, height) { for (let i = 0; i < count; i += 1) { ctx.save(); ctx.rotate(Math.PI * 2 * i / count); ctx.fillStyle = f.species.petals; ctx.beginPath(); ctx.ellipse(0, -size * 0.56, size * width, size * height, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); } ctx.shadowBlur = 0; ctx.fillStyle = f.species.center; ctx.beginPath(); ctx.arc(0, 0, Math.max(2.5, size * 0.24), 0, Math.PI * 2); ctx.fill(); }

    jasmine(ctx, f, size) { for (let c = 0; c < f.cluster; c += 1) { const angle = c * 2.2, radius = c ? size * 0.63 : 0; ctx.save(); ctx.translate(Math.cos(angle) * radius, Math.sin(angle) * radius); this.petalled(ctx, f, size * (c ? 0.58 : 0.78), f.petalCount, 0.24, 0.63); ctx.restore(); } }
    coral(ctx, f, size) { this.petalled(ctx, f, size * 0.78, 7, 0.42, 0.72); ctx.rotate(0.29); this.petalled(ctx, f, size * 0.49, 6, 0.34, 0.52); }
    rose(ctx, f, size) { for (let ring = 0; ring < 3; ring += 1) { ctx.save(); ctx.rotate(ring * 0.35); this.petalled(ctx, f, size * (1 - ring * 0.23), 6 - ring, 0.38, 0.62); ctx.restore(); } }
    tulip(ctx, f, size) { ctx.fillStyle = f.species.petals; ctx.beginPath(); ctx.moveTo(-size * 0.72, size * 0.35); ctx.quadraticCurveTo(-size * 0.92, -size * 0.65, -size * 0.28, -size * 0.82); ctx.quadraticCurveTo(0, -size * 0.38, size * 0.28, -size * 0.82); ctx.quadraticCurveTo(size * 0.92, -size * 0.65, size * 0.72, size * 0.35); ctx.quadraticCurveTo(0, size * 0.82, -size * 0.72, size * 0.35); ctx.fill(); ctx.fillStyle = f.species.center; ctx.beginPath(); ctx.arc(0, size * 0.18, size * 0.16, 0, Math.PI * 2); ctx.fill(); }
    lavender(ctx, f, size) { ctx.shadowBlur = 3; for (let i = 0; i < 7; i += 1) { ctx.fillStyle = i % 2 ? f.species.edge : f.species.petals; ctx.beginPath(); ctx.ellipse((i % 2 ? 1 : -1) * size * 0.15, -i * size * 0.27, size * 0.23, size * 0.34, 0, 0, Math.PI * 2); ctx.fill(); } }
    sparkles(ctx, end, bloom) { ctx.fillStyle = `rgba(255, 237, 194, ${(1 - bloom) * 2.2})`; for (let i = 0; i < 3; i += 1) { ctx.beginPath(); ctx.arc(end.x + Math.cos(i * 2.1) * (15 + i * 5), end.y + Math.sin(i * 2.1) * (15 + i * 5), 1.2, 0, Math.PI * 2); ctx.fill(); } }
}
