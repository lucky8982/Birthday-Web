const ITEM_COUNT = 100;
const MASTER_SIZE = 450;
const STAGGER_MS = -300;
const EXIT_DURATION = 700;

/** CSS-only flowing text heart: nested X/Y motions fill one shared master space. */
export class BirthdayHeart {
    constructor(wrapper, { reduced = false } = {}) {
        this.wrapper = wrapper || null; this.reduced = reduced; this.master = null; this.center = null; this.active = false; this.destroyed = false;
        this.exitPromise = null; this.resolveExit = null; this.exitTimer = null; this.resizeObserver = null;
    }
    init() {
        if (!this.wrapper || this.destroyed) return this;
        this._build();
        if (!this.resizeObserver && typeof ResizeObserver !== 'undefined') { this.resizeObserver = new ResizeObserver(() => this._scaleMaster()); this.resizeObserver.observe(this.wrapper); }
        this._scaleMaster(); return this;
    }
    async start() {
        if (!this.wrapper || this.destroyed) return;
        this._build(); try { await document.fonts?.ready; } catch {} if (this.destroyed) return;
        this._scaleMaster(); this.active = true; clearTimeout(this.exitTimer); this.exitTimer = null; this.wrapper.classList.remove('is-exiting'); this.master?.classList.remove('is-paused'); this.master?.classList.add('is-active');
    }
    revealCenter({ immediate = false } = {}) {
        if (!this.wrapper || this.destroyed) return;
        this.wrapper.classList.add('is-center-revealed');
        this.wrapper.classList.toggle('is-center-immediate', immediate);
        this.wrapper.classList.toggle('is-center-resolved', immediate);
    }
    resolveCenter() { this.wrapper?.classList.add('is-center-resolved'); }
    hideCenter() {
        this.wrapper?.classList.remove('is-center-revealed', 'is-center-immediate', 'is-center-resolved');
    }
    exit() {
        if (!this.active || this.destroyed) return Promise.resolve(); if (this.exitPromise) return this.exitPromise;
        this.active = false; this.wrapper?.classList.add('is-exiting'); this.master?.classList.remove('is-active');
        this.exitPromise = new Promise((resolve) => { this.resolveExit = resolve; }); this.exitTimer = setTimeout(() => this._finishExit(), this.reduced ? 240 : EXIT_DURATION); return this.exitPromise;
    }
    stop() { this.active = false; clearTimeout(this.exitTimer); this.exitTimer = null; this.hideCenter(); this.wrapper?.classList.remove('is-exiting'); this.master?.classList.remove('is-active'); this.master?.classList.add('is-paused'); this._resolveExit(); }
    destroy() { if (this.destroyed) return; this.stop(); this.destroyed = true; this.resizeObserver?.disconnect(); this.resizeObserver = null; this.master?.remove(); this.center?.remove(); this.master = null; this.center = null; this.wrapper = null; }
    _build() {
        if (this.master || !this.wrapper || this.destroyed) return;
        const master = document.createElement('div'); master.className = 'birthday-heart-master'; master.setAttribute('aria-hidden', 'true'); master.classList.toggle('is-reduced', this.reduced);
        const fragment = document.createDocumentFragment();
        for (let index = 0; index < ITEM_COUNT; index += 1) {
            const item = document.createElement('span'); const horizontal = document.createElement('span'); const vertical = document.createElement('span'); const text = document.createElement('span');
            item.className = 'birthday-heart-item'; horizontal.className = 'birthday-heart-horizontal'; vertical.className = 'birthday-heart-vertical'; text.className = 'birthday-heart-text';
            item.style.setProperty('--heart-index', index); item.style.setProperty('--heart-delay', `${index * STAGGER_MS}ms`); item.style.setProperty('--heart-opacity', (0.72 + (index % 5) * 0.055).toFixed(3)); text.textContent = 'Happy Birthday Biwi';
            vertical.append(text); horizontal.append(vertical); item.append(horizontal); fragment.append(item);
        }
        const center = document.createElement('span'); center.className = 'birthday-heart-center'; center.setAttribute('aria-hidden', 'true');
        const motion = [
            [-18, -13, -13, 5], [19, 4, 11, 1], [-14, 16, -9, 7], [15, -17, 14, 3],
            [-20, 12, -12, 2], [18, -14, 10, 8], [-11, -18, 14, 0], [22, 9, -10, 6],
            [-17, 17, 12, 4], [12, -12, -14, 9],
        ];
        let motionIndex = 0;
        const letters = (word) => [...word].map((letter) => {
            const [x, y, rotate, order] = motion[motionIndex++];
            return `<i class="birthday-heart-center-letter" style="--letter-x:${x}px;--letter-y:${y}px;--letter-rotate:${rotate}deg;--letter-delay:${order * 78}ms">${letter}</i>`;
        }).join('');
        center.innerHTML = `<span class="birthday-heart-center-spark"></span><span class="birthday-heart-center-stroke"></span><span class="birthday-heart-center-meri" aria-label="Meri">${letters('Meri')}</span><span class="birthday-heart-center-malkin" aria-label="Malkin">${letters('Malkin')}</span><svg class="birthday-heart-center-trace" viewBox="0 0 140 28" aria-hidden="true" focusable="false"><path class="birthday-heart-signature-path" pathLength="1" d="M5 12c20 12 34-9 51 1 14 8 22 5 33-2 10-7 18 10 46 1"/><circle class="birthday-heart-signature-spark" cx="135" cy="12" r="2"/></svg>`;
        master.append(fragment); this.wrapper.replaceChildren(master, center); this.master = master; this.center = center;
    }
    _scaleMaster() { if (!this.wrapper || !this.master) return; const box = this.wrapper.getBoundingClientRect(); const scale = Math.max(.1, Math.min(box.width / MASTER_SIZE, box.height / MASTER_SIZE) * .88); this.master.style.setProperty('--heart-scale', scale.toFixed(4)); }
    _finishExit() { this.exitTimer = null; this.wrapper?.classList.remove('is-exiting'); this.master?.classList.add('is-paused'); this._resolveExit(); }
    _resolveExit() { const resolve = this.resolveExit; this.resolveExit = null; this.exitPromise = null; resolve?.(); }
}
