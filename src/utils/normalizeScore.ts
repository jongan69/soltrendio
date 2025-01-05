// Normalize scores to 0-1 range if they're in 0-100 range
export const normalizeScore = (score: number) => {
    if (score === undefined || score === null) return 0;
    return score > 1 ? score / 100 : score;
};