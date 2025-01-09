interface OptimizationSuggestion {
  action: string;
  token: string;
  currentAllocation: number;
  suggestedAllocation: number;
  reasoning: string;
  potentialImpact: {
    riskReduction: number;
    expectedReturn: number;
  };
}

export const PortfolioOptimizer: React.FC<{
  suggestions: OptimizationSuggestion[];
  isPremium: boolean;
}> = ({ suggestions, isPremium }) => {
  if (!isPremium) {
    return (
      <div className="upgrade-card">
        <h3>Portfolio Optimization</h3>
        <p>Upgrade to receive AI-powered portfolio optimization suggestions</p>
        <button className="btn btn-primary">Upgrade Now</button>
      </div>
    );
  }

  return (
    <div className="optimization-suggestions">
      {suggestions.map((suggestion, index) => (
        <div key={index} className="suggestion-card">
          <h4>{suggestion.action}</h4>
          <p>Token: {suggestion.token}</p>
          <div className="allocation-change">
            <span>{suggestion.currentAllocation}%</span>
            <span>→</span>
            <span>{suggestion.suggestedAllocation}%</span>
          </div>
          <p className="reasoning">{suggestion.reasoning}</p>
          <div className="potential-impact">
            <p>Risk Reduction: {suggestion.potentialImpact.riskReduction}%</p>
            <p>Expected Return: {suggestion.potentialImpact.expectedReturn}%</p>
          </div>
        </div>
      ))}
    </div>
  );
}; 