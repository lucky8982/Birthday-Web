/* ============================================================
   Happy Birthday My Love 💙 - Utility Helpers
   ------------------------------------------------------------
   File:    js/utils.js
   Purpose: Small, reusable helper functions used across the
            birthday website. No page logic lives here - just
            tools. This module is passive and safe to import.
   ============================================================ */


/**
 * Select the first element matching a CSS selector.
 *
 * @param {string} selector - CSS selector, e.g. '#gift-box'
 * @param {ParentNode} [scope=document] - Where to search from
 * @returns {Element|null} The first match, or null
 */
export function $(selector, scope = document) {
    return scope.querySelector(selector);
}


/**
 * Select every element matching a CSS selector.
 *
 * @param {string} selector - CSS selector, e.g. '.title-line'
 * @param {ParentNode} [scope=document] - Where to search from
 * @returns {Element[]} All matches (always an array)
 */
export function $$(selector, scope = document) {
    return Array.from(scope.querySelectorAll(selector));
}


/**
 * Create an HTML element with optional properties.
 *
 * @param {string} tag - Tag name, e.g. 'div' or 'span'
 * @param {Object} [options] - Optional element settings
 * @param {string} [options.className] - Classes to add
 * @param {string} [options.id] - Element id
 * @param {string} [options.text] - Text content
 * @param {string} [options.html] - Inner HTML (use sparingly)
 * @param {Object} [options.attrs] - Extra attributes, e.g. { title: 'hi' }
 * @returns {HTMLElement} The created element
 */
export function createElement(tag, options = {}) {
    const el = document.createElement(tag);

    if (options.className) el.className = options.className;
    if (options.id) el.id = options.id;
    if (options.text) el.textContent = options.text;
    if (options.html) el.innerHTML = options.html;

    // Set any extra attributes passed in
    if (options.attrs) {
        for (const [name, value] of Object.entries(options.attrs)) {
            el.setAttribute(name, value);
        }
    }

    return el;
}


/**
 * Clamp a number between a minimum and a maximum.
 *
 * @param {number} value - The number to clamp
 * @param {number} min - Lower bound
 * @param {number} max - Upper bound
 * @returns {number} The clamped value
 */
export function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}


/**
 * Generate a random float between min (inclusive) and max (exclusive).
 *
 * @param {number} min - Smallest possible value
 * @param {number} max - Largest possible value (not included)
 * @returns {number} A random float
 */
export function random(min, max) {
    return Math.random() * (max - min) + min;
}


/**
 * Generate a random integer between min and max (both inclusive).
 *
 * @param {number} min - Smallest possible value
 * @param {number} max - Largest possible value
 * @returns {number} A random integer
 */
export function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}


/**
 * Wait a number of milliseconds, then resolve.
 * Useful for sequencing animations.
 *
 * @param {number} ms - How long to wait
 * @returns {Promise<void>} Resolves after the delay
 */
export function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}


/**
 * Detect if the user prefers reduced motion.
 *
 * @returns {boolean} True when reduced motion is requested
 */
export function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}


/**
 * Add an event listener safely - no-op when the target is missing,
 * which keeps the rest of the page from breaking.
 *
 * @param {Element|null} target - Element to attach to (may be null)
 * @param {string} type - Event type, e.g. 'click'
 * @param {Function} handler - Event handler
 * @param {Object|boolean} [options] - addEventListener options
 */
export function safeOn(target, type, handler, options = false) {
    if (target) target.addEventListener(type, handler, options);
}


/**
 * Detect the rough screen type. Useful for choosing between
 * hover effects, particle counts and layout tweaks.
 *
 * @returns {Object} Device information
 * @returns {boolean} isMobile - Phone-sized viewport
 * @returns {boolean} isTablet - Tablet-sized viewport
 * @returns {boolean} isTouch - Can the screen sense touch
 */
export function getDevice() {
    const width = window.innerWidth;

    return {
        isMobile: width < 768,
        isTablet: width >= 768 && width < 1024,
        isTouch: window.matchMedia('(pointer: coarse)').matches,
    };
}


/**
 * Get the current viewport size, updating on window resize.
 * Kept as a function so callers always read live values.
 *
 * @returns {Object} { width, height } of the viewport
 */
export function getViewport() {
    return {
        width: window.innerWidth,
        height: window.innerHeight,
    };
}