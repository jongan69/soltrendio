import React, { useState } from 'react';

interface PriceAlert {
  token: string;
  condition: 'above' | 'below';
  price: number;
  notification: {
    email?: boolean;
    telegram?: boolean;
    discord?: boolean;
  };
}

export const PriceAlerts: React.FC<{
  alerts: PriceAlert[];
  isPremium: boolean;
  onCreateAlert: (alert: PriceAlert) => void;
}> = ({ alerts, isPremium, onCreateAlert }) => {
  const [newAlert, setNewAlert] = useState<Partial<PriceAlert>>({});

  const alertLimit = isPremium ? 50 : 3;

  return (
    <div className="price-alerts">
      <h2>Price Alerts</h2>
      {alerts.length < alertLimit && (
        <form onSubmit={(e) => {
          e.preventDefault();
          onCreateAlert(newAlert as PriceAlert);
        }}>
          {/* Alert creation form */}
        </form>
      )}
      
      <div className="active-alerts">
        {alerts.map((alert, index) => (
          <div key={index} className="alert-item">
            {/* Alert display */}
          </div>
        ))}
      </div>
      
      {!isPremium && (
        <div className="premium-features">
          <h3>Premium Features:</h3>
          <ul>
            <li>Set up to 50 price alerts</li>
            <li>Multiple notification channels</li>
            <li>Advanced condition types</li>
            <li>No delay in notifications</li>
          </ul>
        </div>
      )}
    </div>
  );
}; 