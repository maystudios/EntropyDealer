// utils.js - RNG and Helper Functions

/**
 * Clamp a value between min and max
 */
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

/**
 * Simple RNG - returns random number between 0 and 1
 */
function random() {
    return Math.random();
}

/**
 * Returns true with given probability (0.0 to 1.0)
 */
function rollTrial(probability) {
    return random() < probability;
}

/**
 * Shuffle array in place (Fisher-Yates)
 */
function shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

/**
 * Pick random element from array
 */
function randomChoice(array) {
    return array[Math.floor(random() * array.length)];
}

/**
 * Format number to fixed decimal places
 */
function formatNumber(num, decimals = 2) {
    return num.toFixed(decimals);
}

/**
 * Format percentage (0.0-1.0 to "50%")
 */
function formatPercent(value) {
    return Math.round(value * 100) + '%';
}

/**
 * Save to localStorage
 */
function saveToStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
        console.error('Failed to save to localStorage:', e);
    }
}

/**
 * Load from localStorage
 */
function loadFromStorage(key, defaultValue = null) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
        console.error('Failed to load from localStorage:', e);
        return defaultValue;
    }
}

/**
 * Wait for specified milliseconds
 */
function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
