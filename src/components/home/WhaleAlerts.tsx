export interface WhaleAlert {
  symbol: string;
  name: string;
  token_address: string;
  bullishScore?: number;
  bearishScore?: number;
  type: 'BULLISH' | 'BEARISH';
}

export const WhaleAlerts: React.FC<{
  alerts: WhaleAlert[];
}> = ({ alerts }) => {
  return (
    <div className="whale-alerts">
      <h2 className="whale-alerts__title">
        <span className="whale-alerts__icon">🐋</span>
        Whale Movements
      </h2>
      <div className="whale-alerts__grid">
        {alerts.map((alert, index) => (
          <a
            href={`https://dexscreener.com/solana/${alert.token_address}`}
            target="_blank"
            rel="noopener noreferrer"
            key={index}
            className="alert-card__link"
          >
            <div 
              className={`alert-card ${alert.type.toLowerCase()}`}
            >
              <div className="alert-card__header">
                <span className="alert-card__token">{alert.name}</span>
                <span className="alert-card__symbol">({alert.symbol})</span>
              </div>
              <div className="alert-card__content">
                <div className="alert-card__score">
                  {alert.type === 'BULLISH' ? 
                    <>
                      <span className="score-label">Bullish Score</span>
                      <span className="score-value">{alert.bullishScore}</span>
                    </> : 
                    <>
                      <span className="score-label">Bearish Score</span>
                      <span className="score-value">{alert.bearishScore}</span>
                    </>
                  }
                </div>
                <span className={`trend-badge ${alert.type.toLowerCase()}`}>
                  {alert.type === 'BULLISH' ? '↗️' : '↘️'} {alert.type}
                </span>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}; 