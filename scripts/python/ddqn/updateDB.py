import pymongo
import requests
from dotenv import load_dotenv
import os

load_dotenv()

# MongoDB connection details
MONGO_URI = os.getenv("MONGODB_URI")
DB_NAME = "walletAnalyzer"
COLLECTION_NAME = "wallets"

# DexScreener API URL
DEX_API_URL = "https://api.dexscreener.com/latest/dex/tokens"

# Connect to MongoDB
client = pymongo.MongoClient(
    MONGO_URI,
    tls=True,
    tlsAllowInvalidCertificates=True
    )

db = client[DB_NAME]
collection = db[COLLECTION_NAME]

def get_solana_token_ca(ticker):
    """
    Retrieve the contract address (CA) of a Solana token by its ticker symbol.
    """
    try:
        url = f"https://api.dexscreener.com/latest/dex/search?q={ticker}"
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()

        first_found_address = None
        for pair in data.get('pairs', []):
            if pair.get('chainId') == 'solana':
                base_token = pair.get('baseToken', {})
                quote_token = pair.get('quoteToken', {})

                if first_found_address is None:
                    first_found_address = base_token.get('address') or quote_token.get('address')

                if base_token.get('symbol').upper() == ticker.upper():
                    return base_token.get('address')
                elif quote_token.get('symbol').upper() == ticker.upper():
                    return quote_token.get('address')

        return first_found_address
    except requests.RequestException as e:
        print(f"Error fetching token data: {e}")
        return None

def fetch_market_data(contract_address):
    """
    Fetches market data for a given token contract address from DexScreener API.
    """
    try:
        response = requests.get(f"{DEX_API_URL}/{contract_address}")
        if response.status_code == 200:
            data = response.json()
            if "pairs" in data and len(data["pairs"]) > 0:
                pair = data["pairs"][0]
                return {
                    "marketCap": pair.get("marketCap"),
                    "price": pair.get("priceUsd"),
                }
        else:
            print(f"Failed to fetch data for contract address {contract_address}: {response.status_code}")
    except Exception as e:
        print(f"Error fetching market data for contract address {contract_address}: {e}")
    return None

def update_wallets():
    """
    Updates wallets in the database with missing marketCap, price, and contractAddress for topHoldings.
    """
    wallets = collection.find()  # Fetch all documents from the collection

    for wallet in wallets:
        updated = False
        if wallet.get("topHoldings") is None:
            continue
        for holding in wallet.get("topHoldings", []):
            symbol = holding.get("symbol")
            contract_address = holding.get("contractAddress")  # Use contractAddress field

            if not contract_address:
                # Fetch the contract address if missing
                contract_address = get_solana_token_ca(symbol)
                if contract_address:
                    holding["contractAddress"] = contract_address
                    print(f"Updated {symbol} with contract address {contract_address}.")
                    updated = True
                else:
                    print(f"Could not find contract address for {symbol}. Skipping.")
                    continue

            if "marketCap" not in holding or "price" not in holding:
                market_data = fetch_market_data(contract_address)
                if market_data:
                    holding["marketCap"] = market_data["marketCap"]
                    holding["price"] = market_data["price"]
                    updated = True
                    print(f"Updated {symbol} in wallet {wallet['address']} with marketCap and price.")

        if updated:
            # Update the wallet in the database
            collection.update_one({"_id": wallet["_id"]}, {"$set": {"topHoldings": wallet["topHoldings"]}})

if __name__ == "__main__":
    update_wallets()
