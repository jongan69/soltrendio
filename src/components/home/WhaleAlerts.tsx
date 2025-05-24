import React, { useEffect, useState } from "react";
import { getTokenInfo } from "../../utils/getTokenInfo";

export interface WhaleActivity {
  bullish: WhaleAlert[];
  bearish: WhaleAlert[];
}

export interface WhaleAlert {
  symbol: string;
  name: string;
  token_address: string;
  bullishScore?: number;
  bearishScore?: number;
}

const DEFAULT_IMAGE_URL = "https://s3.coinmarketcap.com/static-gravity/image/5cc0b99a8dd84fbfa4e150d84b5531f2.png";

function useTokenLogo(tokenAddress: string) {
  const [logo, setLogo] = useState<string>(DEFAULT_IMAGE_URL);
  useEffect(() => {
    let mounted = true;
    getTokenInfo(tokenAddress).then((info: { image?: string } | null) => {
      if (mounted && info?.image) setLogo(info.image);
    });
    return () => { mounted = false; };
  }, [tokenAddress]);
  return logo;
}

function AlertCard({ alert, type }: { alert: WhaleAlert; type: "bullish" | "bearish" }) {
  const logo = useTokenLogo(alert.token_address);
  const score = type === "bullish" ? alert.bullishScore : alert.bearishScore;
  const badgeClass = `trend-badge ${type}`;
  const cardClass = `alert-card ${type}`;
  const scoreLabel = type === "bullish" ? "Bullish Score" : "Bearish Score";
  const dexscreenerUrl = `https://dexscreener.com/solana/${alert.token_address}`;

  return (
    <a href={dexscreenerUrl} className="alert-card__link" target="_blank" rel="noopener noreferrer">
      <div className={cardClass}>
        <div className="alert-card__header flex items-center gap-3">
          <img
            src={logo}
            alt={alert.symbol}
            className="h-10 w-10 rounded-lg object-cover bg-gray-100 border"
            onError={e => (e.currentTarget.src = DEFAULT_IMAGE_URL)}
          />
          <div>
            <div className="alert-card__token">{alert.name}</div>
            <div className="alert-card__symbol">{alert.symbol}</div>
          </div>
        </div>
        <div className="alert-card__content mt-2 flex items-center justify-between">
          <span className={badgeClass}>
            {type === "bullish" ? "🚀 Bullish" : "🔻 Bearish"}
          </span>
          <div className="alert-card__score text-right">
            <span className="score-label">{scoreLabel}</span>
            <span className="score-value">{score ?? "-"}</span>
          </div>
        </div>
      </div>
    </a>
  );
}

export const WhaleAlerts: React.FC<{
  alerts: WhaleActivity;
}> = ({ alerts }) => {
  const bullishAlerts = alerts.bullish;
  const bearishAlerts = alerts.bearish;
  return (
    <div className="whale-alerts">
      <h2 className="whale-alerts__title">
        <span className="whale-alerts__icon">🐋</span>
        Whale Movements
      </h2>
      <div className="whale-alerts__grid">
        {bullishAlerts.length > 0 && (
          <div style={{ gridColumn: "1 / -1" }}>
            <h3 style={{ color: "#22c55e", fontWeight: 700, fontSize: "1.1rem", marginBottom: 8 }}>Bullish</h3>
          </div>
        )}
        {bullishAlerts.map((alert) => (
          <AlertCard key={alert.token_address} alert={alert} type="bullish" />
        ))}
        {bearishAlerts.length > 0 && (
          <div style={{ gridColumn: "1 / -1" }}>
            <h3 style={{ color: "#ef4444", fontWeight: 700, fontSize: "1.1rem", margin: "16px 0 8px 0" }}>Bearish</h3>
          </div>
        )}
        {bearishAlerts.map((alert) => (
          <AlertCard key={alert.token_address} alert={alert} type="bearish" />
        ))}
      </div>
    </div>
  );
}; 