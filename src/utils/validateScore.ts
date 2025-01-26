export const hasValidScores = (scores: {
    racismScore: number,
    hateSpeechScore: number,
    drugUseScore: number,
    crudityScore: number,
    profanityScore: number
  }) => {
    // console.log("Checking scores:", scores);
    const hasAnyScore = Object.values(scores).some(score => score > 0);
    const hasCrudityScore = scores.crudityScore > 0;
    // console.log("Has any valid scores:", hasAnyScore, "Has crudity score:", hasCrudityScore);
    return hasAnyScore || hasCrudityScore;
  };