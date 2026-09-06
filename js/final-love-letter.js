/* Full-screen, scrollable final letter. One IntersectionObserver reveals
   chapters as they become readable; it is disconnected whenever hidden. */
const FINAL_LETTER_PROGRESS_KEY = 'hbm.finalLetterProgress';
const FINAL_LETTER_PROGRESS_VERSION = 1;

function loadFinalLetterProgress() {
    try {
        const raw = window.localStorage.getItem(FINAL_LETTER_PROGRESS_KEY);
        if (!raw) return null;
        const data = JSON.parse(raw);
        if (data?.version !== FINAL_LETTER_PROGRESS_VERSION ||
            !Number.isInteger(data.revealedCount) || data.revealedCount < 0 || data.revealedCount > 64 ||
            typeof data.closingReady !== 'boolean') return null;
        return data;
    } catch {
        return null;
    }
}

export class FinalLoveLetter {
    constructor(selector = '#final-love-letter') {
        this.root = document.querySelector(selector);
        this.scroll = this.root?.querySelector('#final-love-letter-scroll');
        this.chapters = [...(this.root?.querySelectorAll('[data-letter-paragraph]') || [])];
        this.closing = this.root?.querySelector('#final-love-letter-closing');
        this.button = this.root?.querySelector('#final-love-letter-garden');
        this.loveMixCallback = this.root?.querySelector('[data-letter-callback="love-mix"]');
        this.observer = null;
        this.timer = 0;
        this.openingTimer = 0;
        this.openingFrame = 0;
        this.run = 0;
        this.ctaPending = false;
        this.revealedCount = 0;
        this.closingReady = false;
        this.initialized = false;
        this.reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
        this.onGarden = null;
        this._onGarden = this.leaveToGarden.bind(this);
        this._onScroll = this.handleScroll.bind(this);
    }

    init() {
        if (!this.root || !this.scroll || !this.button) return this;
        if (!this.initialized) {
            this.button.addEventListener('click', this._onGarden);
            this.scroll.addEventListener('scroll', this._onScroll, { passive: true });
            this.initialized = true;
        }
        return this;
    }

    start({ restore = false, ending = false, callbackData = null } = {}) {
        if (!this.initialized) this.init();
        if (!this.initialized) return;
        this.renderCallbacks(callbackData);
        const run = ++this.run;
        clearTimeout(this.timer);
        clearTimeout(this.openingTimer);
        cancelAnimationFrame(this.openingFrame);
        this.root.hidden = false;
        this.root.classList.remove('is-leaving', 'is-opening', 'is-open', 'is-stable');
        this.root.classList.add('is-visible');
        this.button.hidden = true;
        this.button.classList.remove('is-visible');
        this.ctaPending = false;
        this.chapters.forEach((chapter) => chapter.classList.remove('is-revealed'));
        this.scroll.scrollTop = 0;

        if (ending) {
            // Returning from the garden is intentionally a settled letter,
            // never a replay of the opening ceremony.
            this.root.classList.add('is-open', 'is-stable');
            this.observe();
            this.revealedCount = this.chapters.length;
            this.closingReady = true;
            this.saveProgress();
            requestAnimationFrame(() => {
                if (run !== this.run) return;
                this.scroll.scrollTop = this.scroll.scrollHeight;
                this.chapters.forEach((chapter) => chapter.classList.add('is-revealed'));
                this.revealGardenCTA(run);
            });
        } else if (restore) {
            // A refresh restores a readable, already-open letter rather than
            // leaving a time-based envelope animation half-way through.
            this.root.classList.add('is-open', 'is-stable');
            const saved = loadFinalLetterProgress();
            // Existing route-only saves predate this key. Preserve their
            // established readable fallback while new records are exact.
            this.revealedCount = Math.min(saved?.revealedCount ?? 2, this.chapters.length);
            this.closingReady = saved?.closingReady === true;
            if (this.closingReady) this.revealedCount = this.chapters.length;
            this.chapters.slice(0, this.revealedCount).forEach((chapter) => chapter.classList.add('is-revealed'));
            this.observe();
            if (this.closingReady) {
                requestAnimationFrame(() => {
                    if (run !== this.run) return;
                    this.scroll.scrollTop = this.scroll.scrollHeight;
                    this.revealGardenCTA(run);
                });
            } else if (this.revealedCount) {
                // Restore to the latest logical chapter, not a stale pixel
                // offset that may be wrong after a responsive relayout.
                requestAnimationFrame(() => {
                    if (run !== this.run) return;
                    const anchor = this.chapters[this.revealedCount - 1];
                    if (anchor) this.scroll.scrollTop = Math.max(0, anchor.offsetTop - this.scroll.clientHeight * 0.18);
                });
            }
        } else {
            // Fresh reward handoff: keep the copy hidden while the envelope
            // opens, then begin the existing chapter-reveal sequence.
            this.clearProgress();
            this.revealedCount = 0;
            this.closingReady = false;
            this.openingFrame = requestAnimationFrame(() => {
                if (run === this.run && this.root?.classList.contains('is-visible')) {
                    this.root.classList.add('is-opening');
                }
            });
            this.openingTimer = window.setTimeout(() => {
                if (run !== this.run || !this.root?.classList.contains('is-visible')) return;
                this.root.classList.remove('is-opening');
                this.root.classList.add('is-open');
                this.markChapterRevealed(this.chapters[0]);
                this.observe();
            }, this.reduced ? 0 : 1240);
        }
    }

    renderCallbacks(callbackData) {
        const memory = typeof callbackData?.loveMixMemory === 'string'
            ? callbackData.loveMixMemory.trim()
            : '';
        if (!this.loveMixCallback) return;
        if (!memory) {
            this.loveMixCallback.textContent = '';
            this.loveMixCallback.hidden = true;
            return;
        }
        this.loveMixCallback.textContent = `Aaj “${memory}” phir yaad aa gayi... aur mujhe laga, hamari kahani sirf bade palon se nahi, in chhoti-chhoti yaadon se bani hai.`;
        this.loveMixCallback.hidden = false;
    }

    observe() {
        this.disconnectObserver();
        if (this.reduced || !('IntersectionObserver' in window)) {
            this.chapters.forEach((chapter) => chapter.classList.add('is-revealed'));
            this.revealGardenCTA();
            return;
        }
        const observer = new IntersectionObserver((entries) => {
            if (observer !== this.observer || !this.root?.classList.contains('is-visible')) return;
            for (const entry of entries) {
                if (!entry.isIntersecting) continue;
                this.markChapterRevealed(entry.target);
                if (entry.target === this.closing) this.revealGardenCTA();
                observer.unobserve(entry.target);
            }
        }, { root: this.scroll, threshold: 0.22, rootMargin: '0px 0px -8% 0px' });
        this.observer = observer;
        this.chapters.forEach((chapter) => this.observer.observe(chapter));
    }

    revealGardenCTA(run = this.run) {
        if (run !== this.run || !this.root?.classList.contains('is-visible') || this.ctaPending || this.button.classList.contains('is-visible')) return;
        this.ctaPending = true;
        clearTimeout(this.timer);
        this.timer = window.setTimeout(() => {
            if (run !== this.run || !this.root?.classList.contains('is-visible')) {
                this.ctaPending = false;
                return;
            }
            this.button.hidden = false;
            void this.button.offsetWidth;
            this.button.classList.add('is-visible');
            this.closingReady = true;
            this.saveProgress();
        }, this.reduced ? 0 : 760);
    }

    // iOS can occasionally delay an IntersectionObserver callback inside a
    // momentum-scrolling container. The final CTA must never depend on it.
    handleScroll() {
        if (!this.scroll || !this.root?.classList.contains('is-visible') || this.button.classList.contains('is-visible')) return;
        const remaining = this.scroll.scrollHeight - this.scroll.scrollTop - this.scroll.clientHeight;
        if (remaining <= Math.max(48, this.scroll.clientHeight * 0.08)) {
            this.markChapterRevealed(this.closing);
            this.revealGardenCTA();
        }
    }

    markChapterRevealed(chapter) {
        if (!chapter) return;
        chapter.classList.add('is-revealed');
        const index = this.chapters.indexOf(chapter);
        if (index >= 0 && index + 1 > this.revealedCount) {
            this.revealedCount = index + 1;
            this.saveProgress();
        }
    }

    saveProgress() {
        try {
            window.localStorage.setItem(FINAL_LETTER_PROGRESS_KEY, JSON.stringify({
                version: FINAL_LETTER_PROGRESS_VERSION,
                revealedCount: Math.min(this.revealedCount, this.chapters.length),
                closingReady: this.closingReady,
            }));
        } catch {
            /* Storage is best-effort; the in-memory letter remains usable. */
        }
    }

    clearProgress() {
        try { window.localStorage.removeItem(FINAL_LETTER_PROGRESS_KEY); } catch { /* ignore */ }
    }

    leaveToGarden() {
        if (!this.root || this.root.classList.contains('is-leaving')) return;
        const run = ++this.run;
        clearTimeout(this.openingTimer);
        cancelAnimationFrame(this.openingFrame);
        this.disconnectObserver();
        this.root.classList.add('is-leaving');
        this.timer = window.setTimeout(() => {
            if (run !== this.run) return;
            this.root.classList.remove('is-visible', 'is-leaving');
            this.root.hidden = true;
            this.onGarden?.();
        }, this.reduced ? 0 : 1300);
    }

    stop() {
        this.run += 1;
        this.ctaPending = false;
        clearTimeout(this.timer);
        clearTimeout(this.openingTimer);
        cancelAnimationFrame(this.openingFrame);
        this.disconnectObserver();
        this.root?.classList.remove('is-visible', 'is-leaving', 'is-opening', 'is-open', 'is-stable');
        if (this.root) this.root.hidden = true;
    }

    disconnectObserver() {
        this.observer?.disconnect();
        this.observer = null;
    }

    destroy() {
        this.stop();
        this.button?.removeEventListener('click', this._onGarden);
        this.scroll?.removeEventListener('scroll', this._onScroll);
        this.initialized = false;
        this.onGarden = null;
    }
}
