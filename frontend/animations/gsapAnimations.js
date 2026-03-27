// src/animations/gsapAnimations.js
import { gsap } from 'gsap';

/**
 * Animate a single card element with fade-in and upward motion
 * @param {HTMLElement | string} element - DOM element or selector string
 * @param {Object} options - Optional GSAP configuration overrides
 */
export const animateCard = (element, options = {}) => {
  gsap.from(element, {
    opacity: 0,
    y: 50,
    duration: 0.5,
    ease: 'power3.out',
    stagger: 0.1, // in case multiple elements are passed
    ...options, // allow overriding defaults
  });
};

/**
 * Animate multiple cards by selector
 * @param {string} selector - CSS selector for multiple elements
 * @param {Object} options - Optional GSAP configuration overrides
 */
export const animateCards = (selector, options = {}) => {
  gsap.from(selector, {
    opacity: 0,
    y: 50,
    duration: 0.5,
    ease: 'power3.out',
    stagger: 0.2,
    ...options,
  });
};
