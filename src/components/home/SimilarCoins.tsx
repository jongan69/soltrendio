export const SimilarCoinsSection = ({ similarCoins }: { similarCoins: any[] }) => (
    <div className="bg-white/95 backdrop-blur-sm rounded-xl p-4 sm:p-6 shadow-xl border border-purple-200/50 hover:shadow-2xl transition-all duration-300">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Similar Newly Listed Coins</h2>
      <div className="space-y-4">
        {similarCoins.map((coin, index) => (
          <div key={index} className="border-b border-gray-200 pb-4 last:border-0">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
              <div>
                <h3 className="text-lg font-semibold">
                  {coin.newCoin.name} ({coin.newCoin.symbol})
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {coin.reason}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  {coin.newCoin.description}
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {coin.link && (
                    <a
                      href={coin.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-sm bg-blue-500 text-white hover:bg-blue-600"
                    >
                      View on Dexscreener
                    </a>
                  )}
                  {coin.website && (
                    <a
                      href={coin.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-sm bg-green-500 text-white hover:bg-green-600"
                    >
                      Visit Website
                    </a>
                  )}
                  {coin.twitter && (
                    <a
                      href={coin.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-sm bg-blue-500 text-white hover:bg-blue-600"
                    >
                      View on Twitter
                    </a>
                  )}
                  {coin.telegram && (
                    <a
                      href={coin.telegram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-sm bg-blue-500 text-white hover:bg-blue-600"
                    >
                      View on Telegram
                    </a>
                  )}
                  {coin.discord && (
                    <a
                      href={coin.discord}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-sm bg-blue-500 text-white hover:bg-blue-600"
                    >
                      View on Discord
                    </a>
                  )}
                  {coin.github && (
                    <a
                      href={coin.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-sm bg-blue-500 text-white hover:bg-blue-600"
                    >
                      View on Github
                    </a>
                  )}
                </div>
              </div>
              <div className="bg-purple-100 px-3 py-1 rounded-full mt-2 sm:mt-0">
                <span className="text-sm font-medium text-purple-800">
                  {(coin.similarityScore * 100).toFixed(0)}% Match
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );