/* Full-screen, scrollable final letter. One IntersectionObserver reveals
   chapters as they become readable; it is disconnected whenever hidden. */
export class FinalLoveLetter {
    constructor(selector = '#final-love-letter') {
        this.root = document.querySelector(selector);
        this.scroll = this.root?.querySelector('#final-love-letter-scroll');
        this.chapters = [...(this.root?.querySelectorAll('[data-letter-paragraph]') || [])];
        this.closing = this.root?.querySelector('#final-love-letter-closing');
        this.button = this.root?.querySelector('#final-love-letter-garden');
        this.observer = null;
        this.timer = 0;
        this.openingTimer = 0;
        this.openingFrame = 0;
        this.run = 0;
        this.ctaPending = false;
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

    start({ restore = false, ending = false } = {}) {
        if (!this.initialized) this.init();
        if (!this.initialized) return;
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
            this.observe();
            this.chapters.slice(0, 2).forEach((chapter) => chapter.classList.add('is-revealed'));
        } else {
            // Fresh reward handoff: keep the copy hidden while the envelope
            // opens, then begin the existing chapter-reveal sequence.
            this.openingFrame = requestAnimationFrame(() => {
                if (run === this.run && this.root?.classList.contains('is-visible')) {
                    this.root.classList.add('is-opening');
                }
            });
            this.openingTimer = window.setTimeout(() => {
                if (run !== this.run || !this.root?.classList.contains('is-visible')) return;
                this.root.classList.remove('is-opening');
                this.root.classList.add('is-open');
                this.chapters[0]?.classList.add('is-revealed');
                this.observe();
            }, this.reduced ? 0 : 1240);
        }
    }

    observe() {
        this.disconnectObserver();
        if (this.reduced || !('IntersectionObserver' in window)) {
            this.chapters.forEach((chapter) => chapter.classList.add('is-revealed'));
            this.revealGardenCTA();
            return;
        }
        this.observer = new IntersectionObserver((entries) => {
            for (const entry of entries) {
                if (!entry.isIntersecting) continue;
                entry.target.classList.add('is-revealed');
                if (entry.target === this.closing) this.revealGardenCTA();
                this.observer?.unobserve(entry.target);
            }
        }, { root: this.scroll, threshold: 0.22, rootMargin: '0px 0px -8% 0px' });
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
        }, this.reduced ? 0 : 760);
    }

    // iOS can occasionally delay an IntersectionObserver callback inside a
    // momentum-scrolling container. The final CTA must never depend on it.
    handleScroll() {
        if (!this.scroll || this.button.classList.contains('is-visible')) return;
        const remaining = this.scroll.scrollHeight - this.scroll.scrollTop - this.scroll.clientHeight;
        if (remaining <= Math.max(48, this.scroll.clientHeight * 0.08)) {
            this.closing?.classList.add('is-revealed');
            this.revealGardenCTA();
        }
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
