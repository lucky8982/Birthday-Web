/* ============================================================
   Happy Birthday My Love 💙 - Memory Lane (Scene 2)
   ------------------------------------------------------------
   File:    js/memory-lane.js
   Purpose: An interactive romantic memory book. Every memory
            opens like a cinematic chapter:

              TITLE  appears with its own unique animation
                -> title glides to its final position
              PHOTO  reveals itself with its own unique animation
                -> photo settles into the composition
              LOVE MESSAGE appears with its own unique animation

            Everything STAYS VISIBLE. Nothing auto-advances.
            The user decides when to open the next chapter.

   HOW TO ADD YOUR REAL PHOTOS & WORDS:
     Only edit the `memories` array below - the architecture
     never needs touching. Each entry uses:
       title            the romantic chapter title
       image            photo path  assets/images/memories/...
       message          the love message
       animation fields are already assigned.
   ============================================================ */

import { $, prefersReducedMotion } from './utils.js';


/* ------------------------------------------------------------
   THE MEMORIES - edit titles, images and messages freely.
   Keep the structure. Animation fields are pre-assigned.
   ------------------------------------------------------------ */
export const memories = [
    {
        id: 1,
        title: 'A Beautiful Beginning',
        image: 'assets/images/memories/dummy-photo-01.JPG',
        message: 'The day our story found its first word.',
        titleAnimation: 'title-memory-01',
        photoAnimation: 'photo-memory-01',
        messageAnimation: 'message-memory-01',
        composition: 'compose-a',
        photoSettle: 'photo-settle-glow',
        exitAnimation: 'chapter-exit-fade',
        titleMs: 900, settleMs: 620, photoMs: 1200, messageMs: 950,
    },
    {
        id: 2,
        title: 'The First Hello',
        image: 'assets/images/memories/dummy-photo-02.JPG',
        message: 'A single hello, and the whole world quietly changed.',
        titleAnimation: 'title-memory-02',
        photoAnimation: 'photo-memory-02',
        messageAnimation: 'message-memory-02',
        composition: 'compose-b',
        photoSettle: 'photo-settle-tilt',
        exitAnimation: 'chapter-exit-left',
        titleMs: 1000, settleMs: 580, photoMs: 1300, messageMs: 1000,
    },
    {
        id: 3,
        title: 'Two Hearts, One Beat',
        image: 'assets/images/memories/dummy-photo-03.JPG',
        message: 'Some rhythms you recognize instantly - ours was one of them.',
        titleAnimation: 'title-memory-03',
        photoAnimation: 'photo-memory-03',
        messageAnimation: 'message-memory-03',
        composition: 'compose-c',
        photoSettle: 'photo-settle-float',
        exitAnimation: 'chapter-exit-zoom',
        titleMs: 950, settleMs: 640, photoMs: 1250, messageMs: 1050,
    },
    {
        id: 4,
        title: 'Golden Evenings',
        image: 'assets/images/memories/dummy-photo-04.JPG',
        message: 'Every sunset seemed to save its best colors for us.',
        titleAnimation: 'title-memory-04',
        photoAnimation: 'photo-memory-04',
        messageAnimation: 'message-memory-04',
        composition: 'compose-d',
        photoSettle: 'photo-settle-shine',
        exitAnimation: 'chapter-exit-up',
        titleMs: 1150, settleMs: 560, photoMs: 1400, messageMs: 1100,
    },
    {
        id: 5,
        title: 'Sweet Laughter',
        image: 'assets/images/memories/dummy-photo-05.JPG',
        message: 'Your laugh is still my favorite song.',
        titleAnimation: 'title-memory-05',
        photoAnimation: 'photo-memory-05',
        messageAnimation: 'message-memory-05',
        composition: 'compose-e',
        photoSettle: 'photo-settle-breathe',
        exitAnimation: 'chapter-exit-blur',
        titleMs: 1000, settleMs: 600, photoMs: 1200, messageMs: 900,
    },
    {
        id: 6,
        title: 'Gentle Hands',
        image: 'assets/images/memories/dummy-photo-06.JPG',
        message: 'Holding your hand always felt like coming home.',
        titleAnimation: 'title-memory-06',
        photoAnimation: 'photo-memory-06',
        messageAnimation: 'message-memory-06',
        composition: 'compose-f',
        photoSettle: 'photo-settle-lift',
        exitAnimation: 'chapter-exit-fade',
        titleMs: 900, settleMs: 650, photoMs: 1300, messageMs: 1000,
    },
    {
        id: 7,
        title: 'Rainy Days Together',
        image: 'assets/images/memories/dummy-photo-07.JPG',
        message: 'We made even the rain feel like sunshine.',
        titleAnimation: 'title-memory-07',
        photoAnimation: 'photo-memory-07',
        messageAnimation: 'message-memory-07',
        composition: 'compose-g',
        photoSettle: 'photo-settle-vignette',
        exitAnimation: 'chapter-exit-left',
        titleMs: 1050, settleMs: 600, photoMs: 1250, messageMs: 950,
    },
    {
        id: 8,
        title: 'The Brightest Light',
        image: 'assets/images/memories/dummy-photo-08.JPG',
        message: 'You walked into my life and lit it all up.',
        titleAnimation: 'title-memory-08',
        photoAnimation: 'photo-memory-08',
        messageAnimation: 'message-memory-08',
        composition: 'compose-h',
        photoSettle: 'photo-settle-glow',
        exitAnimation: 'chapter-exit-zoom',
        titleMs: 950, settleMs: 620, photoMs: 1350, messageMs: 1000,
    },
    {
        id: 9,
        title: 'Night Conversations',
        image: 'assets/images/memories/dummy-photo-09.JPG',
        message: 'Words that traveled softly into the night.',
        titleAnimation: 'title-memory-09',
        photoAnimation: 'photo-memory-09',
        messageAnimation: 'message-memory-09',
        composition: 'compose-a',
        photoSettle: 'photo-settle-tilt',
        exitAnimation: 'chapter-exit-up',
        titleMs: 1000, settleMs: 580, photoMs: 1200, messageMs: 900,
    },
    {
        id: 10,
        title: 'Our Melody',
        image: 'assets/images/memories/dummy-photo-10.JPG',
        message: 'Every song sounds better when it reminds me of you.',
        titleAnimation: 'title-memory-10',
        photoAnimation: 'photo-memory-10',
        messageAnimation: 'message-memory-10',
        composition: 'compose-c',
        photoSettle: 'photo-settle-float',
        exitAnimation: 'chapter-exit-fade',
        titleMs: 1050, settleMs: 620, photoMs: 1400, messageMs: 1100,
    },
    {
        id: 11,
        title: 'Little Wonders',
        image: 'assets/images/memories/dummy-photo-11.JPG',
        message: 'The smallest moments with you became the biggest treasures.',
        titleAnimation: 'title-memory-11',
        photoAnimation: 'photo-memory-11',
        messageAnimation: 'message-memory-11',
        composition: 'compose-b',
        photoSettle: 'photo-settle-shine',
        exitAnimation: 'chapter-exit-left',
        titleMs: 1100, settleMs: 600, photoMs: 1300, messageMs: 1000,
    },
    {
        id: 12,
        title: 'Where the Heart Is',
        image: 'assets/images/memories/dummy-photo-12.JPG',
        message: 'Home was never a place - it was always you.',
        titleAnimation: 'title-memory-12',
        photoAnimation: 'photo-memory-12',
        messageAnimation: 'message-memory-12',
        composition: 'compose-d',
        photoSettle: 'photo-settle-breathe',
        exitAnimation: 'chapter-exit-zoom',
        titleMs: 1200, settleMs: 580, photoMs: 1250, messageMs: 950,
    },
    {
        id: 13,
        title: 'Dreams We Share',
        image: 'assets/images/memories/dummy-photo-13.JPG',
        message: 'Our dreams look more beautiful when we dream them together.',
        titleAnimation: 'title-memory-13',
        photoAnimation: 'photo-memory-13',
        messageAnimation: 'message-memory-13',
        composition: 'compose-e',
        photoSettle: 'photo-settle-lift',
        exitAnimation: 'chapter-exit-blur',
        titleMs: 950, settleMs: 640, photoMs: 1350, messageMs: 1050,
    },
    {
        id: 14,
        title: 'Peaceful Moments',
        image: 'assets/images/memories/dummy-photo-14.JPG',
        message: 'Quiet times with you speak louder than words.',
        titleAnimation: 'title-memory-14',
        photoAnimation: 'photo-memory-14',
        messageAnimation: 'message-memory-14',
        composition: 'compose-f',
        photoSettle: 'photo-settle-vignette',
        exitAnimation: 'chapter-exit-fade',
        titleMs: 1000, settleMs: 600, photoMs: 1200, messageMs: 900,
    },
    {
        id: 15,
        title: 'Growing Side by Side',
        image: 'assets/images/memories/dummy-photo-15.JPG',
        message: 'Every day beside you makes me a better person.',
        titleAnimation: 'title-memory-15',
        photoAnimation: 'photo-memory-15',
        messageAnimation: 'message-memory-15',
        composition: 'compose-g',
        photoSettle: 'photo-settle-glow',
        exitAnimation: 'chapter-exit-up',
        titleMs: 1050, settleMs: 620, photoMs: 1300, messageMs: 1000,
    },
    {
        id: 16,
        title: 'Our Secret Dances',
        image: 'assets/images/memories/dummy-photo-16.JPG',
        message: 'We danced like no one was watching - and meant it.',
        titleAnimation: 'title-memory-16',
        photoAnimation: 'photo-memory-16',
        messageAnimation: 'message-memory-16',
        composition: 'compose-h',
        photoSettle: 'photo-settle-tilt',
        exitAnimation: 'chapter-exit-left',
        titleMs: 1000, settleMs: 580, photoMs: 1400, messageMs: 1100,
    },
    {
        id: 17,
        title: 'Under the Same Sky',
        image: 'assets/images/memories/dummy-photo-17.JPG',
        message: 'The stars shine a little brighter when I think of you.',
        titleAnimation: 'title-memory-17',
        photoAnimation: 'photo-memory-17',
        messageAnimation: 'message-memory-17',
        composition: 'compose-a',
        photoSettle: 'photo-settle-float',
        exitAnimation: 'chapter-exit-zoom',
        titleMs: 1100, settleMs: 640, photoMs: 1250, messageMs: 950,
    },
    {
        id: 18,
        title: 'A Promise Kept',
        image: 'assets/images/memories/dummy-photo-18.JPG',
        message: 'Some promises are written in the heart forever.',
        titleAnimation: 'title-memory-18',
        photoAnimation: 'photo-memory-18',
        messageAnimation: 'message-memory-18',
        composition: 'compose-b',
        photoSettle: 'photo-settle-shine',
        exitAnimation: 'chapter-exit-fade',
        titleMs: 950, settleMs: 600, photoMs: 1350, messageMs: 1000,
    },
    {
        id: 19,
        title: 'You and Me',
        image: 'assets/images/memories/dummy-photo-19.JPG',
        message: 'Against everything, it has always been us.',
        titleAnimation: 'title-memory-19',
        photoAnimation: 'photo-memory-19',
        messageAnimation: 'message-memory-19',
        composition: 'compose-c',
        photoSettle: 'photo-settle-breathe',
        exitAnimation: 'chapter-exit-blur',
        titleMs: 1000, settleMs: 620, photoMs: 1200, messageMs: 900,
    },
    {
        id: 20,
        title: 'Forever Begins Now',
        image: 'assets/images/memories/dummy-photo-20.JPG',
        message: 'The best chapters of our story are still ahead.',
        titleAnimation: 'title-memory-20',
        photoAnimation: 'photo-memory-20',
        messageAnimation: 'message-memory-20',
        composition: 'compose-e',
        photoSettle: 'photo-settle-lift',
        exitAnimation: 'chapter-exit-up',
        titleMs: 1050, settleMs: 600, photoMs: 1300, messageMs: 1000,
    },
    {
        id: 21,
        title: 'The Little Map',
        image: 'assets/images/memories/dummy-photo-21.JPG',
        message: 'Every road, every turn - they all led to you.',
        titleAnimation: 'title-memory-21',
        photoAnimation: 'photo-memory-21',
        messageAnimation: 'message-memory-21',
        composition: 'compose-d',
        photoSettle: 'photo-settle-glow',
        exitAnimation: 'chapter-exit-fade',
        titleMs: 950, settleMs: 640, photoMs: 1250, messageMs: 950,
    },
    {
        id: 22,
        title: 'Mornings Like These',
        image: 'assets/images/memories/dummy-photo-22.JPG',
        message: 'Waking up to you is my favorite kind of sunrise.',
        titleAnimation: 'title-memory-22',
        photoAnimation: 'photo-memory-22',
        messageAnimation: 'message-memory-22',
        composition: 'compose-f',
        photoSettle: 'photo-settle-vignette',
        exitAnimation: 'chapter-exit-left',
        titleMs: 1100, settleMs: 600, photoMs: 1350, messageMs: 1050,
    },
    {
        id: 23,
        title: 'Coffee & Conversations',
        image: 'assets/images/memories/dummy-photo-23.JPG',
        message: 'We solved the world over two cups that never emptied.',
        titleAnimation: 'title-memory-23',
        photoAnimation: 'photo-memory-23',
        messageAnimation: 'message-memory-23',
        composition: 'compose-g',
        photoSettle: 'photo-settle-tilt',
        exitAnimation: 'chapter-exit-zoom',
        titleMs: 1000, settleMs: 580, photoMs: 1300, messageMs: 1000,
    },
    {
        id: 24,
        title: 'The Longest Walk',
        image: 'assets/images/memories/dummy-photo-24.JPG',
        message: 'We took the long way home - every single time.',
        titleAnimation: 'title-memory-24',
        photoAnimation: 'photo-memory-24',
        messageAnimation: 'message-memory-24',
        composition: 'compose-h',
        photoSettle: 'photo-settle-float',
        exitAnimation: 'chapter-exit-up',
        titleMs: 1150, settleMs: 620, photoMs: 1200, messageMs: 950,
    },
    {
        id: 25,
        title: 'Moments of Quiet',
        image: 'assets/images/memories/dummy-photo-25.JPG',
        message: 'Sometimes the silence between us said everything.',
        titleAnimation: 'title-memory-25',
        photoAnimation: 'photo-memory-25',
        messageAnimation: 'message-memory-25',
        composition: 'compose-a',
        photoSettle: 'photo-settle-shine',
        exitAnimation: 'chapter-exit-blur',
        titleMs: 1350, settleMs: 600, photoMs: 1250, messageMs: 1000,
    },
    {
        id: 26,
        title: 'City Lights',
        image: 'assets/images/memories/dummy-photo-26.JPG',
        message: 'The city sparkled that night, but you outshone it all.',
        titleAnimation: 'title-memory-26',
        photoAnimation: 'photo-memory-26',
        messageAnimation: 'message-memory-26',
        composition: 'compose-c',
        photoSettle: 'photo-settle-breathe',
        exitAnimation: 'chapter-exit-fade',
        titleMs: 1050, settleMs: 640, photoMs: 1400, messageMs: 1100,
    },
    {
        id: 27,
        title: 'Weathering Storms',
        image: 'assets/images/memories/dummy-photo-27.JPG',
        message: 'Every storm we faced only made us stronger.',
        titleAnimation: 'title-memory-27',
        photoAnimation: 'photo-memory-27',
        messageAnimation: 'message-memory-27',
        composition: 'compose-b',
        photoSettle: 'photo-settle-lift',
        exitAnimation: 'chapter-exit-left',
        titleMs: 1250, settleMs: 580, photoMs: 1300, messageMs: 1000,
    },
    {
        id: 28,
        title: 'The Journey Ahead',
        image: 'assets/images/memories/dummy-photo-28.JPG',
        message: 'The map of us keeps growing more beautiful.',
        titleAnimation: 'title-memory-28',
        photoAnimation: 'photo-memory-28',
        messageAnimation: 'message-memory-28',
        composition: 'compose-e',
        photoSettle: 'photo-settle-glow',
        exitAnimation: 'chapter-exit-zoom',
        titleMs: 1100, settleMs: 620, photoMs: 1250, messageMs: 950,
    },
    {
        id: 29,
        title: 'Always by Your Side',
        image: 'assets/images/memories/dummy-photo-29.JPG',
        message: 'No matter what comes, I will always be right here.',
        titleAnimation: 'title-memory-29',
        photoAnimation: 'photo-memory-29',
        messageAnimation: 'message-memory-29',
        composition: 'compose-d',
        photoSettle: 'photo-settle-vignette',
        exitAnimation: 'chapter-exit-up',
        titleMs: 1000, settleMs: 600, photoMs: 1350, messageMs: 1100,
    },
    {
        id: 30,
        title: 'Our Forever',
        image: 'assets/images/memories/dummy-photo-30.JPG',
        message: 'The final chapter is only the first page of forever.',
        titleAnimation: 'title-memory-30',
        photoAnimation: 'photo-memory-30',
        messageAnimation: 'message-memory-30',
        composition: 'compose-h',
        photoSettle: 'photo-settle-rest',
        exitAnimation: 'chapter-exit-fade',
        titleMs: 1400, settleMs: 660, photoMs: 1500, messageMs: 1300,
    },
];


/* Timings - must match animation.css */
const EXIT_MS = 520;
const INTRO_EXIT_MS = 380;
const FINAL_DELAY_MS = 700;
const NEXT_IN_MS = 450;


/*
 * Progress persistence (per-device).
 *
 * The user's progress is remembered inside the browser's
 * localStorage only. No server, no cookies, no URL - just a
 * small JSON payload keyed per device/browser profile.
 */
const PROGRESS_KEY = 'hbm.memoryProgress';
const CONTINUE_THRESHOLD = 8;

/**
 * Safe localStorage access - some privacy modes throw.
 *
 * @returns {Storage|null} localStorage, or null when unavailable
 */
function getProgressStorage() {
    try {
        return window.localStorage;
    } catch {
        return null;
    }
}


/* Tiny graceful fallback if a photo file is missing */
const FALLBACK_IMAGE =
    'data:image/svg+xml;charset=utf-8,' +
    encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000">' +
        '<rect width="800" height="1000" fill="#0d1830"/>' +
        '<circle cx="400" cy="400" r="180" fill="rgba(126,200,227,0.25)"/>' +
        '<text x="400" y="430" font-size="90" fill="#a8d0e6" text-anchor="middle">&#128153;</text>' +
        '<text x="400" y="640" font-size="34" fill="#8fddb1" text-anchor="middle" letter-spacing="6">MEMORY</text>' +
        '</svg>'
    );


/* ============================================================
   Class: MemoryLane
   ============================================================ */
export class MemoryLane {
    constructor() {
        // Cached elements
        this.section = null;
        this.intro = null;
        this.chapter = null;
        this.titleBlock = null;
        this.titleText = null;
        this.photoBlock = null;
        this.frame = null;
        this.photo = null;
        this.messageBlock = null;
        this.message = null;
        this.nextBtn = null;
        this.prevBtn = null;
        this.revealBtn = null;
        this.continueBtn = null;
        this.continueLabel = null;
        this.final = null;
        this.finalBtn = null;

        this.initialized = false;
        this.state = 'intro';
        this.stage = 'title';
        this.current = 0;
        this.queued = 0;
        this.reduced = prefersReducedMotion();
        this.timers = [];

        // Optional stage hook - lets main.js follow the lane's
        // internal stage ('intro' | 'exiting' | 'playing' |
        // 'settled' | 'final') for the global Back button.
        this.onState = null;

        // Animation classes
        this._titleAnim = '';
        this._photoAnim = '';
        this._messageAnim = '';

        /*
         * IMPORTANT:
         * Every time a new photo starts loading, this number increases.
         * If an older image finishes loading later, its onload handler
         * will be ignored.
         *
         * This prevents:
         * Memory 1 -> Memory 2
         * old Memory 1 image appearing after Memory 2 has started.
         */
        this._photoLoadToken = 0;

        // Bound handlers
        this._onReveal = () => this.beginReveal();
        this._onNext = () => this.next();
        this._onPrev = () => this.prev();
        this._onContinue = () => this.continueFromSavedProgress();
        this._onFinal = () => this.reset();
        this._onKey = (event) => this.handleKey(event);
    }

    /** @returns {number} Total number of memories */
    get total() {
        return memories.length;
    }

    /** Scale a memory duration for reduced motion */
    scale(ms) {
        return this.reduced ? Math.max(40, Math.round(ms * 0.14)) : ms;
    }

    /* Notify main.js which stage is on screen. Never throws - a
       broken hook must not take the lane down. */
    _fireState(stage) {
        if (typeof this.onState !== 'function') return;
        try {
            this.onState(stage);
        } catch (error) {
            console.warn('Memory Lane stage hook failed.', error);
        }
    }


    /* ============================================================
       Lifecycle
       ============================================================ */

    enter() {
        if (!this.initialized) {
            this.initialized = true;

            this.section = $('#scene-2');
            this.intro = $('#memory-intro');
            this.chapter = $('#memory-chapter');
            this.titleBlock = $('#memory-title');
            this.titleText = $('#memory-title-text');
            this.photoBlock = $('#memory-photo-block');
            this.frame = $('#memory-frame');
            this.photo = $('#memory-photo');
            this.messageBlock = $('#memory-message-block');
            this.message = $('#memory-message');
            this.nextBtn = $('#memory-next');
            this.prevBtn = $('#memory-prev');
            this.revealBtn = $('#memory-reveal');
            this.continueBtn = $('#memory-continue');
            this.continueLabel = $('#memory-continue-label');
            this.final = $('#memory-final');
            this.finalBtn = $('#memory-final-cta');

            this.revealBtn?.addEventListener('click', this._onReveal);
            this.nextBtn?.addEventListener('click', this._onNext);
            this.prevBtn?.addEventListener('click', this._onPrev);
            this.continueBtn?.addEventListener('click', this._onContinue);
            this.finalBtn?.addEventListener('click', this._onFinal);
            window.addEventListener('keydown', this._onKey);
        }

        this.reset();
    }


    /* ============================================================
       Reset
       ============================================================ */

    reset() {
        this.clearTimers();

        /*
         * Invalidate any old image load operation.
         * If an old image finishes loading after reset(),
         * it will no longer be allowed to show itself.
         */
        this._photoLoadToken++;

        this.state = 'intro';
        this.stage = 'title';
        this.current = 0;
        this.queued = 0;

        if (this.titleBlock) {
            this.titleBlock.classList.remove('is-in', 'is-settled');

            if (this._titleAnim) {
                this.titleBlock.classList.remove(this._titleAnim);
            }
        }

        this._titleAnim = '';

        if (this.photoBlock) {
            this.photoBlock.classList.remove('is-in');
        }

        if (this.frame) {
            this.frame.classList.remove(
                'is-in',
                'photo-settle-glow',
                'photo-settle-tilt',
                'photo-settle-float',
                'photo-settle-shine',
                'photo-settle-breathe',
                'photo-settle-lift',
                'photo-settle-vignette',
                'photo-settle-rest'
            );

            if (this._photoAnim) {
                this.frame.classList.remove(this._photoAnim);
            }
        }

        this._photoAnim = '';

        if (this.messageBlock) {
            this.messageBlock.classList.remove('is-in');

            if (this._messageAnim) {
                this.messageBlock.classList.remove(this._messageAnim);
            }
        }

        this._messageAnim = '';

        if (this.chapter) {
            this.chapter.classList.remove('is-active');

            this.chapter.classList.remove(
                'chapter-exit-fade',
                'chapter-exit-left',
                'chapter-exit-zoom',
                'chapter-exit-up',
                'chapter-exit-blur'
            );

            this.chapter.hidden = true;
        }

        if (this.photo) {
            /*
             * Hide the image immediately.
             * This prevents the previous memory photo from
             * remaining visible while the new photo loads.
             */
            this.photo.style.opacity = '0';

            this.photo.removeAttribute('src');
            this.photo.removeAttribute('alt');
        }

        if (this.titleText) {
            this.titleText.textContent = '';
            this.titleText.removeAttribute('data-title');
        }

        if (this.message) {
            this.message.textContent = '';
            this.message.removeAttribute('data-message');
        }

        if (this.nextBtn) {
            this.nextBtn.hidden = true;
        }

        if (this.prevBtn) {
            this.prevBtn.hidden = true;
        }

        if (this.intro) {
            this.intro.classList.remove('is-leaving');
            this.intro.hidden = false;
        }

        if (this.final) {
            this.final.hidden = true;
        }

        if (this.section) {
            this.section.scrollTop = 0;
        }

        /*
         * Visual reset only - the saved progress in localStorage
         * is left untouched on purpose.
         */
        this.refreshContinueButton();

        this._fireState('intro');
    }


    /* ============================================================
       Opening the memory book
       ============================================================ */

    beginReveal(targetIndex = 0) {
        if (this.state !== 'intro' || !this.intro) return;

        this.state = 'exiting';
        this._fireState('exiting');
        this.intro.classList.add('is-leaving');

        this.later(INTRO_EXIT_MS, () => {
            if (this.intro) {
                this.intro.hidden = true;
            }

            if (this.chapter) {
                this.chapter.hidden = false;
            }

            this.startSequence(targetIndex);
        });
    }


    /* ============================================================
       Navigation
       ============================================================ */

    next() {
        if (this.state === 'intro') {
            /*
             * Enter the last completed memory when there is
             * saved progress, otherwise start from memory 1.
             */
            this.continueFromSavedProgress();
            return;
        }

        if (this.state === 'final') {
            return;
        }

        if (this.state === 'settled') {
            this.advance(1);
            return;
        }

        this.queued += 1;
    }


    prev() {
        if (this.state === 'final') {
            if (this.final) {
                this.final.hidden = true;
            }

            this.state = 'settled';
            this._fireState('settled');
            return;
        }

        if (this.state !== 'settled') {
            return;
        }

        this.advance(-1);
    }


    advance(dir) {
        if (!this.chapter) return;

        const m = memories[this.current];

        this.state = 'exiting';

        if (this.nextBtn) {
            this.nextBtn.hidden = true;
        }

        if (this.prevBtn) {
            this.prevBtn.hidden = true;
        }

        if (this.final) {
            this.final.hidden = true;
        }

        this.chapter.classList.add(m.exitAnimation);

        this.later(this.scale(EXIT_MS) + 40, () => {
            this.chapter.classList.remove(m.exitAnimation);

            const target =
                ((this.current + dir) % this.total + this.total) %
                this.total;

            this.startSequence(target);
        });
    }


    /* ============================================================
       Chapter sequence
       title -> photo -> message
       ============================================================ */

    startSequence(index) {
        const m = memories[index];

        if (!m || !this.chapter) return;

        this.clearTimers();

        this.current = index;
        this.state = 'playing';
        this.stage = 'title';

        if (this.nextBtn) {
            this.nextBtn.hidden = true;
        }

        if (this.prevBtn) {
            this.prevBtn.hidden = true;
        }

        if (this.final) {
            this.final.hidden = true;
        }

        /*
         * IMPORTANT:
         *
         * Before starting a new memory, hide the old photo
         * immediately.
         *
         * This is an extra safety layer in addition to renderPhoto().
         */
        if (this.photo) {
            this.photo.style.opacity = '0';
        }

        this.chapter.classList.remove(
            'compose-a',
            'compose-b',
            'compose-c',
            'compose-d',
            'compose-e',
            'compose-f',
            'compose-g',
            'compose-h'
        );

        this.chapter.classList.add(
            m.composition,
            'is-active'
        );

        if (this.photoBlock) {
            this.photoBlock.classList.remove('is-in');
        }

        if (this.messageBlock) {
            this.messageBlock.classList.remove('is-in');
        }


        /* --------------------------------------------------------
           1. Title content + entrance
           -------------------------------------------------------- */

        this.renderTitle(m);

        if (this.titleBlock) {
            this.titleBlock.classList.remove(
                'is-in',
                'is-settled'
            );

            if (this._titleAnim) {
                this.titleBlock.classList.remove(this._titleAnim);
            }

            this._titleAnim = m.titleAnimation;

            void this.titleBlock.offsetWidth;

            this.titleBlock.classList.add(
                m.titleAnimation,
                'is-in'
            );
        }


        /* --------------------------------------------------------
           2. Title settles
           -------------------------------------------------------- */

        this.later(this.scale(m.titleMs), () => {
            if (this.titleBlock) {
                this.titleBlock.classList.remove('is-in');

                if (this._titleAnim) {
                    this.titleBlock.classList.remove(
                        this._titleAnim
                    );
                }

                this.titleBlock.classList.add('is-settled');
            }

            this.stage = 'photo';


            /* ----------------------------------------------------
               3. Photo content + entrance
               ---------------------------------------------------- */

            this.renderPhoto(m);

            if (this.frame) {
                this.frame.classList.remove(
                    'photo-settle-glow',
                    'photo-settle-tilt',
                    'photo-settle-float',
                    'photo-settle-shine',
                    'photo-settle-breathe',
                    'photo-settle-lift',
                    'photo-settle-vignette',
                    'photo-settle-rest'
                );

                if (this._photoAnim) {
                    this.frame.classList.remove(
                        this._photoAnim
                    );
                }

                this._photoAnim = m.photoAnimation;

                void this.frame.offsetWidth;

                this.frame.classList.add(
                    m.photoAnimation,
                    'is-in'
                );
            }

            if (this.photoBlock) {
                void this.photoBlock.offsetWidth;

                this.photoBlock.classList.add('is-in');
            }


            /* ----------------------------------------------------
               4. Photo settles
               ---------------------------------------------------- */

            this.later(this.scale(m.photoMs), () => {
                if (this.frame) {
                    this.frame.classList.remove('is-in');

                    if (this._photoAnim) {
                        this.frame.classList.remove(
                            this._photoAnim
                        );
                    }

                    this.frame.classList.add(
                        m.photoSettle
                    );
                }

                this.stage = 'message';


                /* ------------------------------------------------
                   5. Love message entrance
                   ------------------------------------------------ */

                this.renderMessage(m);

                if (this.messageBlock) {
                    if (this._messageAnim) {
                        this.messageBlock.classList.remove(
                            this._messageAnim
                        );
                    }

                    this._messageAnim =
                        m.messageAnimation;

                    void this.messageBlock.offsetWidth;

                    this.messageBlock.classList.add(
                        m.messageAnimation,
                        'is-in'
                    );
                }


                /* ------------------------------------------------
                   6. Chapter settled
                   ------------------------------------------------ */

                this.later(this.scale(m.messageMs), () => {
                    this.stage = 'settled';
                    this.state = 'settled';

                    /*
                     * A memory only counts as completed once its
                     * whole sequence (title -> photo -> message)
                     * has settled. Memory 30 (the last one) still
                     * settles here before entering its final state.
                     */
                    this.saveProgress(this.current + 1);

                    this.refreshPrevButton();

                    if (this.current === this.total - 1) {
                        this.later(
                            this.scale(FINAL_DELAY_MS),
                            () => {
                                if (this.state !== 'settled') {
                                    return;
                                }

                                this.state = 'final';
                                this._fireState('final');

                                if (this.final) {
                                    this.final.hidden = false;

                                    this.final.classList.remove(
                                        'memory-final-in'
                                    );

                                    void this.final.offsetWidth;

                                    this.final.classList.add(
                                        'memory-final-in'
                                    );
                                }
                            }
                        );
                    } else {
                        this.showNextButton();
                    }
                });
            });
        });

        this.preloadNeighbors();
    }


    /* ============================================================
       Show Next button
       ============================================================ */

    showNextButton() {
        if (!this.nextBtn) return;

        this.nextBtn.hidden = false;

        this.nextBtn.classList.remove(
            'memory-next-in'
        );

        void this.nextBtn.offsetWidth;

        this.nextBtn.classList.add(
            'memory-next-in'
        );

        this.later(this.scale(NEXT_IN_MS), () => {
            if (
                this.queued > 0 &&
                this.state === 'settled'
            ) {
                this.queued -= 1;
                this.advance(1);
            }
        });
    }


    /* ============================================================
       Show Previous button
       ============================================================ */

    /**
     * The Back button appears once a chapter settles, so the
     * visitor can return to the previous memory. It stays hidden
     * on the first memory. Read-only for progress storage.
     */
    refreshPrevButton() {
        if (!this.prevBtn) return;

        this.prevBtn.hidden = this.current <= 0;

        this.prevBtn.classList.remove(
            'memory-prev-in'
        );

        if (this.current > 0) {
            void this.prevBtn.offsetWidth;

            this.prevBtn.classList.add(
                'memory-prev-in'
            );
        }
    }


    /* ============================================================
       Progress persistence (per-device)
       ============================================================ */

    /**
     * Read the last completed memory number.
     *
     * @returns {number} 0 when nothing is saved or data is invalid
     */
    loadProgress() {
        const storage = getProgressStorage();
        if (!storage) return 0;

        try {
            const raw = storage.getItem(PROGRESS_KEY);
            if (!raw) return 0;

            const data = JSON.parse(raw);
            const value = Number(data?.lastCompletedMemory);

            if (!Number.isInteger(value) || value < 1) {
                return 0;
            }

            return Math.min(value, this.total);
        } catch {
            return 0;
        }
    }

    /**
     * Store the last completed memory number.
     * Progress only moves forward - it is never lowered.
     *
     * @param {number} memoryNumber Memory number (1-based)
     */
    saveProgress(memoryNumber) {
        const storage = getProgressStorage();
        if (!storage) return;

        try {
            const lastCompletedMemory = Math.max(
                this.loadProgress(),
                memoryNumber
            );

            storage.setItem(
                PROGRESS_KEY,
                JSON.stringify({ lastCompletedMemory })
            );
        } catch {
            /* Ignore - progress is best-effort */
        }
    }

    /** @returns {boolean} True when a Continue button should appear */
    hasContinueProgress() {
        return this.loadProgress() >= CONTINUE_THRESHOLD;
    }

    /**
     * @returns {number} Memory number to continue from,
     *                   0 when below the threshold
     */
    getContinueMemory() {
        const progress = this.loadProgress();
        return progress >= CONTINUE_THRESHOLD ? progress : 0;
    }

    /**
     * Show / hide the Continue button and update its label.
     * Read-only for storage - never writes progress.
     */
    refreshContinueButton() {
        if (!this.continueBtn) return;

        const memoryNumber = this.getContinueMemory();

        if (memoryNumber < CONTINUE_THRESHOLD) {
            this.continueBtn.hidden = true;
            return;
        }

        if (this.continueLabel) {
            this.continueLabel.textContent =
                'Continue from Memory ' + memoryNumber;
        }

        this.continueBtn.hidden = false;
    }

    /**
     * Open the last completed memory using the same
     * intro exit animation as the normal reveal.
     * Falls back to memory 1 without saved progress.
     */
    continueFromSavedProgress() {
        if (this.state !== 'intro') return;

        const memoryNumber = this.getContinueMemory();

        if (memoryNumber < CONTINUE_THRESHOLD) {
            this.beginReveal();
            return;
        }

        this.beginReveal(memoryNumber - 1);
    }


    /* ============================================================
       Rendering
       ============================================================ */

    renderTitle(m) {
        if (!this.titleText) return;

        this.titleText.textContent = '';

        this.titleText.setAttribute(
            'data-title',
            m.title
        );

        this.buildWords(
            this.titleText,
            m.title,
            m.id
        );
    }


    /*
     * ===========================================================
     * FIXED PHOTO RENDERING
     * ===========================================================
     *
     * Old behaviour:
     *
     * Memory 1 image remains inside <img>
     *        ↓
     * Memory 2 changes src
     *        ↓
     * Browser starts loading Memory 2
     *        ↓
     * Memory 1 is still visible
     *        ↓
     * Memory 2 finishes loading
     *        ↓
     * Memory 2 appears
     *
     * New behaviour:
     *
     * Memory 1
     *        ↓
     * Hide image immediately
     *        ↓
     * Load Memory 2
     *        ↓
     * Memory 2 fully loaded
     *        ↓
     * Show Memory 2
     *
     * The load token also prevents an older image from
     * becoming visible after a newer memory has started.
     * ===========================================================
     */
    renderPhoto(m) {
        if (!this.photo) return;

        const photoElement = this.photo;
        const newSrc = m.image;

        /*
         * Create a unique token for this image request.
         */
        const loadToken = ++this._photoLoadToken;

        /*
         * Immediately hide whatever image is currently inside
         * the <img>.
         */
        photoElement.style.opacity = '0';

        /*
         * Update alt text immediately.
         */
        photoElement.alt = m.title;

        /*
         * Remove the old source before assigning the new one.
         *
         * This ensures the previous image cannot remain visible.
         */
        photoElement.removeAttribute('src');

        /*
         * New image successfully loaded.
         */
        photoElement.onload = () => {
            /*
             * If another memory started loading after this image,
             * ignore this old load event.
             */
            if (loadToken !== this._photoLoadToken) {
                return;
            }

            /*
             * Only show the image after the browser confirms
             * that the new image has loaded.
             */
            requestAnimationFrame(() => {
                if (loadToken !== this._photoLoadToken) {
                    return;
                }

                photoElement.style.opacity = '1';
            });
        };

        /*
         * New image failed to load.
         * Show the graceful fallback instead.
         */
        photoElement.onerror = () => {
            /*
             * Ignore an old image error.
             */
            if (loadToken !== this._photoLoadToken) {
                return;
            }

            /*
             * Prevent the fallback itself from triggering
             * the same error handler recursively.
             */
            photoElement.onload = null;
            photoElement.onerror = null;

            photoElement.src = FALLBACK_IMAGE;
            photoElement.style.opacity = '1';
        };

        /*
         * Start loading the new image.
         */
        photoElement.src = newSrc;
    }


    renderMessage(m) {
        if (!this.message) return;

        this.message.textContent = '';

        this.message.setAttribute(
            'data-message',
            m.message
        );

        this.buildWords(
            this.message,
            m.message,
            m.id + 100
        );
    }


    /* ============================================================
       Build text animation spans
       ============================================================ */

    buildWords(container, text, salt) {
        const words = text.split(/\s+/);

        words.forEach((word, wi) => {
            if (wi > 0) {
                container.appendChild(
                    document.createTextNode(' ')
                );
            }

            const w = document.createElement('span');

            w.className = 'tw';

            w.style.setProperty(
                '--i',
                String(wi)
            );

            for (let li = 0; li < word.length; li++) {
                const l = document.createElement('span');

                l.className = 'tl';
                l.textContent = word[li];

                l.style.setProperty(
                    '--i',
                    String(wi * 3 + li)
                );

                l.style.setProperty(
                    '--dx',
                    String(
                        ((li * 37 + salt * 61) % 90) - 45
                    ) + 'px'
                );

                l.style.setProperty(
                    '--dy',
                    String(
                        ((li * 53 + salt * 29) % 70) - 35
                    ) + 'px'
                );

                l.style.setProperty(
                    '--rot',
                    String(
                        ((li * 13 + salt * 7) % 24) - 12
                    ) + 'deg'
                );

                w.appendChild(l);
            }

            container.appendChild(w);
        });
    }


    /* ============================================================
       Preload neighbouring photos
       ============================================================ */

    preloadNeighbors() {
        if (this.total === 0) return;

        const next =
            memories[
                (this.current + 1) % this.total
            ].image;

        const prev =
            memories[
                (this.current - 1 + this.total) % this.total
            ].image;

        for (const src of [next, prev]) {
            const probe = new Image();
            probe.src = src;
        }
    }


    /* ============================================================
       Keyboard
       ============================================================ */

    handleKey(event) {
        if (
            this.section?.hidden ||
            !this.section.classList.contains('is-visible')
        ) {
            return;
        }

        if (event.key === 'ArrowRight') {
            event.preventDefault();
            this.next();
        } else if (event.key === 'ArrowLeft') {
            event.preventDefault();
            this.prev();
        }
    }


    /* ============================================================
       Timers / cleanup
       ============================================================ */

    later(ms, fn) {
        const id = setTimeout(fn, ms);

        this.timers.push(id);

        return id;
    }


    clearTimers() {
        for (const id of this.timers) {
            clearTimeout(id);
        }

        this.timers = [];
    }


    destroy() {
        this.clearTimers();

        /*
         * Invalidate any pending image load.
         */
        this._photoLoadToken++;

        this.revealBtn?.removeEventListener(
            'click',
            this._onReveal
        );

        this.nextBtn?.removeEventListener(
            'click',
            this._onNext
        );

        this.prevBtn?.removeEventListener(
            'click',
            this._onPrev
        );

        this.continueBtn?.removeEventListener(
            'click',
            this._onContinue
        );

        this.finalBtn?.removeEventListener(
            'click',
            this._onFinal
        );

        window.removeEventListener(
            'keydown',
            this._onKey
        );
    }
}