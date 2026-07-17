/**
 * SuperMemo-2 Algorithm
 * @param {number} quality - 0-5 rating (0=Blackout, 5=Perfect)
 * @param {number} prevRepetition - 'n'
 * @param {number} prevInterval - 'I'
 * @param {number} prevEaseFactor - 'EF'
 */
const calculateSM2 = (quality, prevRepetition, prevInterval, prevEaseFactor) => {
    let repetition = prevRepetition;
    let interval = prevInterval;
    let easeFactor = prevEaseFactor;

    if (quality >= 3) {
        // Correct Response
        if (repetition === 0) {
            interval = 1;
        } else if (repetition === 1) {
            interval = 6;
        } else {
            interval = Math.round(interval * easeFactor);
        }
        repetition += 1;
    } else {
        // SMART FAILURE LOGIC
        // Instead of resetting to 0 (repetition = 0, interval = 1)
        // We reduce the interval significantly but keep some credit
        
        repetition = 0; // Reset repetition count logic
        
        // If they knew it well (Interval > 20 days), soft reset to 25% of time
        // If they were new to it, hard reset to 1 day
        interval = prevInterval > 20 ? Math.ceil(prevInterval * 0.25) : 1;
    }

    // Update Ease Factor (Standard SM-2)
    easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    if (easeFactor < 1.3) easeFactor = 1.3;

    return { repetition, interval, easeFactor };
};

module.exports = calculateSM2;