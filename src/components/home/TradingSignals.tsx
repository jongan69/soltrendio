interface TradingSignal {
  token: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  priceTarget: number;
  timeframe: string;
  reasoning: string;
}

export const TradingSignals: React.FC<{
  signals: TradingSignal[];
  isPremium: boolean;
}> = ({ signals, isPremium }) => {
  if (!isPremium) {
    return (
      <div className="blur-sm pointer-events-none">
        <div className="absolute inset-0 flex items-center justify-center">
          <button className="btn btn-primary">Upgrade to Premium</button>
        </div>
        {/* Blurred preview of signals */}
      </div>
    );
  }
  
  return (
    <div className="grid gap-4">
      {signals.map((signal, index) => (
        <div key={index} className="signal-card">
          <div className="flex justify-between">
            <h3>{signal.token}</h3>
            <span className={`badge ${signal.action.toLowerCase()}`}>
              {signal.action}
            </span>
          </div>
          <p>Price Target: ${signal.priceTarget}</p>
          <p>Confidence: {signal.confidence}%</p>
          <p className="text-sm">{signal.reasoning}</p>
        </div>
      ))}
    </div>
  );
}; 