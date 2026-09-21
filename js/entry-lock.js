/* ============================================================
   Happy Birthday My Love 💙 - Entry Lock Intro
   ------------------------------------------------------------
   File:    js/entry-lock.js
   Purpose: A cinematic entry lock intro that plays after
            loading completes, BEFORE the existing Opening
            cinematic. A premium entry sequence with elegant
            typography and cinematic dissolves.
   ============================================================ */

import { $, prefersReducedMotion } from './utils.js';
import { QuestionLockScreen } from './question-lock.js';

/* Animation durations (ms) - mirror CSS transition/animation
   durations. Reduced motion runs at 0 (CSS transitions/animations
   are disabled via media query). */
const DURATIONS = {
    scene1In: 1200,     // Scene 1 text entrance
    scene1Hold: 2500,   // Hold Scene 1 before dissolving
    scene1Out: 1000,    // Scene 1 dissolve
    scene2In: 1400,     // Scene 2 line-by-line entrance
    scene2Hold: 2000,   // Hold Scene 2 before dissolving
    scene2Out: 1000,    // Scene 2 dissolve
    finalFade: 800,     // Final fade to handover
};

const STARS = 60;       // subtle starfield
const PARTICLES = 8;    // subtle floating particles

/* ============================================================
   Class: EntryLockIntro
   ------------------------------------------------------------
   Usage (from main.js):
     const entryLock = new EntryLockIntro();
     entryLock.init();       // after the loading screen exists
     entryLock.onHandover = callback; // called when the intro ends
     entryLock.start();      // after loading.complete()
   ============================================================ */
export class EntryLockIntro {
    constructor() {
        // Cached elements (found at init time)
        this.overlay = null;
        this.stage = null;
        this.scene1 = null;
        this.scene2 = null;
        this.textGroup1 = null;
        this.textGroup2 = null;
        this.title1 = null;
        this.title2 = null;
        this.title3 = null;
        this.sub1 = null;
        this.sub2 = null;
        this.sub3 = null;
        this.starsEl = null;
        this.particlesEl = null;

        this.reduced = prefersReducedMotion();
        this.started = false;
        this.finished = false;
        this.busy = false;
        this.currentScene = 0; // 0 = idle, 1 = scene1, 2 = scene2, 3 = done
        this.timers = [];
        this._boundOnKey = this._onKey.bind(this);
        this._boundOnTap = this._onTap.bind(this);

        // Wired by main.js: called when the intro is complete so
        // the loading screen can hand over to the opening cinematic.
        this.onHandover = null;
    }

    /* ---- Lifecycle ---- */

    /** Find and cache the entry lock elements from the page */
    init() {
        this.overlay = $('#entry-lock');
        if (!this.overlay) return;

        this.stage = $('#entry-stage');
        this.scene1 = $('#entry-scene-1');
        this.scene2 = $('#entry-scene-2');
        this.textGroup1 = $('#entry-text-group');
        this.textGroup2 = $('#entry-text-group-2');
        this.title1 = $('#entry-title-1');
        this.title2 = $('#entry-title-2');
        this.title3 = $('#entry-title-3');
        this.sub1 = $('#entry-sub-1');
        this.sub2 = $('#entry-sub-2');
        this.sub3 = $('#entry-sub-3');
        this.starsEl = $('#entry-stars');
        this.particlesEl = $('#entry-particles');

        // Keyboard users can advance with Enter/Space
        this.overlay.addEventListener('keydown', this._boundOnKey);

        // The whole scene is a tap target
        this.overlay.addEventListener('click', this._boundOnTap);
    }

    /**
     * Reveal the entry lock scene.
     * Called after loading.complete() in main.js.
     */
    start() {
        if (this.started || !this.overlay) return;
        this.started = true;

        this.overlay.hidden = false;
        void this.overlay.offsetWidth;
        this.overlay.classList.add('is-visible');

        // The intro owns the shared loading host now.
        $('#loading-screen')?.classList.add('is-lettering');

        this.spawnStars();
        this.spawnParticles();

        // Keyboard users can advance with Enter/Space
        this.overlay.focus({ preventScroll: true });

        // Start Scene 1
        this.playScene1();
    }

    /* ---- Scene 1: Main Title ---- */

    playScene1() {
        if (this.finished || !this.scene1) return;

        this.currentScene = 1;
        this.busy = true;

        this.scene1.setAttribute('aria-hidden', 'false');
        this.scene1.classList.add('is-visible');

        // Animate titles in sequence
        const titles = [this.title1, this.title2, this.title3];
        const delays = [200, 500, 800];

        titles.forEach((el, i) => {
            if (!el) return;
            el.style.opacity = '0';
            el.style.transform = 'translateY(30px) scale(0.95)';
            el.style.filter = 'blur(8px)';
            el.style.transition = `opacity 0.8s var(--ease-out), transform 0.8s var(--ease-out), filter 0.8s var(--ease-out)`;

            this.later(this.reduced ? 0 : delays[i], () => {
                el.style.opacity = '1';
                el.style.transform = 'translateY(0) scale(1)';
                el.style.filter = 'blur(0)';
            });
        });

        // After Scene 1 holds, dissolve and play Scene 2
        // ISSUE FIX: the first page ("Hamari Kahani / Yahin Se /
        // Shuru Hoti Hai...") must STAY on screen - it never
        // advances by itself. The scene tap target (or Enter/Space)
        // is the only way to continue; the timer below only releases
        // `busy` once the title entrance has settled so the tap is
        // accepted. Scene 2 keeps its existing behavior.
        const entranceMs = this.reduced ? 0 : (Math.max(...delays) + DURATIONS.scene1In);
        this.later(this.reduced ? 0 : entranceMs, () => {
            this.busy = false;
        });
    }

    dissolveScene1() {
        if (!this.scene1) return;
        this.busy = true;

        this.scene1.style.transition = 'opacity 1s var(--ease-soft), transform 1s var(--ease-soft), filter 1s var(--ease-soft)';
        this.scene1.style.opacity = '0';
        this.scene1.style.transform = 'translateY(-30px) scale(0.95)';
        this.scene1.style.filter = 'blur(10px)';

        this.later(this.reduced ? 0 : DURATIONS.scene1Out, () => {
            this.scene1.setAttribute('aria-hidden', 'true');
            this.scene1.classList.remove('is-visible');
            this.scene1.style.opacity = '';
            this.scene1.style.transform = '';
            this.scene1.style.filter = '';
            this.scene1.style.transition = '';

            // Start Scene 2
            this.playScene2();
        });
    }

    /* ---- Scene 2: Second Message ---- */

    playScene2() {
        if (this.finished || !this.scene2) return;

        this.currentScene = 2;
        this.busy = true;

        this.scene2.setAttribute('aria-hidden', 'false');
        this.scene2.classList.add('is-visible');

        // Animate sub-lines in sequence
        const subs = [this.sub1, this.sub2, this.sub3];
        const delays = [200, 500, 800];

        subs.forEach((el, i) => {
            if (!el) return;
            el.style.opacity = '0';
            el.style.transform = 'translateY(20px)';
            el.style.filter = 'blur(6px)';
            el.style.transition = 'opacity 0.7s var(--ease-out), transform 0.7s var(--ease-out), filter 0.7s var(--ease-out)';

            this.later(this.reduced ? 0 : delays[i], () => {
                el.style.opacity = '1';
                el.style.transform = 'translateY(0)';
                el.style.filter = 'blur(0)';
            });
        });

        // After Scene 2 holds, dissolve and finish
        const totalDelay = this.reduced ? 0 : (Math.max(...delays) + DURATIONS.scene2Hold);
        this.later(this.reduced ? 0 : totalDelay, () => {
            this.dissolveScene2();
        });
    }

    dissolveScene2() {
        if (!this.scene2) return;
        this.busy = true;

        this.scene2.style.transition = 'opacity 1s var(--ease-soft), transform 1s var(--ease-soft), filter 1s var(--ease-soft)';
        this.scene2.style.opacity = '0';
        this.scene2.style.transform = 'translateY(-30px) scale(0.95)';
        this.scene2.style.filter = 'blur(10px)';

        this.later(this.reduced ? 0 : DURATIONS.scene2Out, () => {
            this.scene2.setAttribute('aria-hidden', 'true');
            this.scene2.classList.remove('is-visible');
            this.scene2.style.opacity = '';
            this.scene2.style.transform = '';
            this.scene2.style.filter = '';
            this.scene2.style.transition = '';

            this.finish();
        });
    }

    /* ---- Handover ---- */

    finish() {
        if (this.finished || !this.overlay) return;
        this.finished = true;
        this.busy = false;

        // Immediately hide Entry Lock and clean up to allow Question Lock to show
        this.overlay.hidden = true;
        this.overlay.classList.remove('is-visible', 'is-leaving');
        this.cleanup();
        
        // Handover to Question Lock Screen (Phase 2)
        if (this.onHandover) {
            this.onHandover();
        }
    }

    /* ---- Interaction ---- */

    _onTap() {
        // Allow tap to skip current animation
        if (this.busy) return;
        if (this.currentScene === 1) {
            this.dissolveScene1();
        } else if (this.currentScene === 2) {
            this.dissolveScene2();
        }
    }

    _onKey(e) {
        if (e.target !== this.overlay) return;
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this._onTap();
        }
    }

    /* ---- Decoration ---- */

    spawnStars() {
        if (!this.starsEl || this.reduced) return;

        for (let i = 0; i < STARS; i++) {
            const s = document.createElement('span');
            s.className = 'entry-star';

            const size = 1 + Math.random() * 2;
            s.style.width = size + 'px';
            s.style.height = size + 'px';
            s.style.left = Math.random() * 100 + '%';
            s.style.top = Math.random() * 100 + '%';
            s.style.setProperty('--dur', (2.5 + Math.random() * 3.5) + 's');
            s.style.setProperty('--delay', (-Math.random() * 4) + 's');
            s.style.setProperty('--o', (0.1 + Math.random() * 0.25).toFixed(2));

            this.starsEl.appendChild(s);
        }
    }

    spawnParticles() {
        if (!this.particlesEl || this.reduced) return;

        for (let i = 0; i < PARTICLES; i++) {
            const p = document.createElement('span');
            p.className = 'entry-particle';

            const w = 6 + Math.random() * 8;
            p.style.width = w + 'px';
            p.style.height = (w * (1.3 + Math.random() * 0.3)) + 'px';
            p.style.left = Math.random() * 100 + '%';
            p.style.setProperty('--dur', (8 + Math.random() * 6) + 's');
            p.style.setProperty('--delay', (-Math.random() * 10) + 's');
            p.style.setProperty('--sway', (Math.random() * 80 - 40) + 'px');
            p.style.setProperty('--rot', (60 + Math.random() * 180) + 'deg');
            p.style.setProperty('--o', (0.3 + Math.random() * 0.3).toFixed(2));

            this.particlesEl.appendChild(p);
        }
    }

    /* ---- Helpers / cleanup ---- */

    later(ms, fn) {
        const id = setTimeout(fn, ms);
        this.timers.push(id);
        return id;
    }

    cleanup() {
        for (const id of this.timers) {
            clearTimeout(id);
        }
        this.timers = [];

        if (this.starsEl) this.starsEl.innerHTML = '';
        if (this.particlesEl) this.particlesEl.innerHTML = '';

        // Reset scenes
        if (this.scene1) {
            this.scene1.classList.remove('is-visible');
            this.scene1.setAttribute('aria-hidden', 'true');
            this.scene1.style.opacity = '';
            this.scene1.style.transform = '';
            this.scene1.style.filter = '';
            this.scene1.style.transition = '';
        }
        if (this.scene2) {
            this.scene2.classList.remove('is-visible');
            this.scene2.setAttribute('aria-hidden', 'true');
            this.scene2.style.opacity = '';
            this.scene2.style.transform = '';
            this.scene2.style.filter = '';
            this.scene2.style.transition = '';
        }
        if (this.title1) { this.title1.style.opacity = ''; this.title1.style.transform = ''; this.title1.style.filter = ''; this.title1.style.transition = ''; }
        if (this.title2) { this.title2.style.opacity = ''; this.title2.style.transform = ''; this.title2.style.filter = ''; this.title2.style.transition = ''; }
        if (this.title3) { this.title3.style.opacity = ''; this.title3.style.transform = ''; this.title3.style.filter = ''; this.title3.style.transition = ''; }
        if (this.sub1) { this.sub1.style.opacity = ''; this.sub1.style.transform = ''; this.sub1.style.filter = ''; this.sub1.style.transition = ''; }
        if (this.sub2) { this.sub2.style.opacity = ''; this.sub2.style.transform = ''; this.sub2.style.filter = ''; this.sub2.style.transition = ''; }
        if (this.sub3) { this.sub3.style.opacity = ''; this.sub3.style.transform = ''; this.sub3.style.filter = ''; this.sub3.style.transition = ''; }
    }

    destroy() {
        this.cleanup();
        this.overlay?.removeEventListener('click', this._boundOnTap);
        this.overlay?.removeEventListener('keydown', this._boundOnKey);
        this.overlay = null;
        this.stage = null;
        this.scene1 = null;
        this.scene2 = null;
        this.textGroup1 = null;
        this.textGroup2 = null;
        this.title1 = null;
        this.title2 = null;
        this.title3 = null;
        this.sub1 = null;
        this.sub2 = null;
        this.sub3 = null;
        this.starsEl = null;
        this.particlesEl = null;
    }
}
