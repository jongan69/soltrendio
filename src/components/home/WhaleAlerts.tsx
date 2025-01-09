interface WhaleAlert {
  timestamp: number;
  token: string;
  amount: number;
  type: 'BUY' | 'SELL';
  walletType: 'Smart Money' | 'Institution' | 'Known Whale';
  historicalSuccess: number;
}

export const WhaleAlerts: React.FC<{
  alerts: WhaleAlert[];
  subscriptionLevel: 'free' | 'premium';
}> = ({ alerts, subscriptionLevel }) => {
  const alertLimit = subscriptionLevel === 'premium' ? alerts.length : 3;
  
  return (
    <div className="whale-alerts">
      <h2>Whale Movements</h2>
      {alerts.slice(0, alertLimit).map((alert, index) => (
        <div key={index} className="alert-card">
          <span className="wallet-badge">{alert.walletType}</span>
          <p>{alert.token}: {alert.type} ${alert.amount.toLocaleString()}</p>
          <p>Historical Success Rate: {alert.historicalSuccess}%</p>
        </div>
      ))}
      {subscriptionLevel === 'free' && alerts.length > 3 && (
        <div className="upgrade-prompt">
          <p>Upgrade to Premium to see {alerts.length - 3} more alerts</p>
        </div>
      )}
    </div>
  );
}; 