import numpy as np
import tensorflow as tf
from tensorflow.keras import layers
from pymongo import MongoClient
import requests
import random
from collections import deque
from sklearn.preprocessing import StandardScaler
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# MongoDB Connection Setup
# Define connection parameters and establish connection to MongoDB
def get_mongo_connection():
    MONGO_URI = os.getenv("MONGODB_URI")
    DB_NAME = "walletAnalyzer"
    COLLECTION_NAME = "wallets"

    client = MongoClient(
        MONGO_URI,
        tls=True,
        tlsAllowInvalidCertificates=True
    )
    db = client[DB_NAME]
    return db[COLLECTION_NAME]

collection = get_mongo_connection()

# DexScreener API URL
DEX_API_URL = "https://api.dexscreener.com/latest/dex/tokens"

# Fetch Aggregated Data from API
# Retrieve portfolio and token trends from external API
def fetch_aggregated_data(api_url):
    response = requests.get(api_url)
    return response.json()

# Retrieve Contract Address for Token
# Find the contract address of a Solana token by its ticker symbol
def get_solana_token_ca(ticker):
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

# Fetch Market Data for Token
# Retrieve market cap and price data for a token contract address
def fetch_market_data(contract_address):
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

# Update Wallets in Database
# Enhance wallet data with token market information and contract addresses
def update_wallets():
    wallets = collection.find()
    for wallet in wallets:
        updated = False
        if wallet.get("topHoldings") is None or not wallet["topHoldings"]:
            continue
        for holding in wallet.get("topHoldings", []):
            symbol = holding.get("symbol")
            contract_address = holding.get("contractAddress")

            if not contract_address:
                contract_address = get_solana_token_ca(symbol)
                if contract_address:
                    holding["contractAddress"] = contract_address
                    print(f"Updated {symbol} with contract address {contract_address}.")
                    updated = True

            if "marketCap" not in holding or "price" not in holding:
                market_data = fetch_market_data(contract_address)
                if market_data:
                    holding["marketCap"] = market_data["marketCap"]
                    holding["price"] = market_data["price"]
                    updated = True
                    print(f"Updated {symbol} in wallet {wallet['address']} with marketCap and price.")

        if updated:
            collection.update_one({"_id": wallet["_id"]}, {"$set": {"topHoldings": wallet["topHoldings"]}})

# Extract States from Wallet Data
# Convert wallet data into numerical state vectors for RL training
def extract_state(wallet, api_data, max_tokens=10):
    if wallet.get("topHoldings") is None or not wallet["topHoldings"]:
        return None  # Skip wallets without topHoldings

    # Extract market caps, token prices, and balances
    market_caps = [float(h.get('marketCap', 0)) for h in wallet['topHoldings'][:max_tokens]]
    token_prices = [float(h.get('price', 0)) for h in wallet['topHoldings'][:max_tokens]]
    token_balances = [float(h.get('balance', 0)) for h in wallet['topHoldings'][:max_tokens]]

    # Pad with zeros to ensure fixed length
    market_caps += [0] * (max_tokens - len(market_caps))
    token_prices += [0] * (max_tokens - len(token_prices))
    token_balances += [0] * (max_tokens - len(token_balances))

    avg_market_cap = sum(market_caps) / len(market_caps) if market_caps else 0

    # Ensure totalValue is a float
    total_value = wallet['totalValue']
    if isinstance(total_value, dict) and '$numberDouble' in total_value:
        total_value = float(total_value['$numberDouble'])

    state = [
        total_value,  # Total portfolio value
        len(wallet['topHoldings']),  # Number of holdings
        avg_market_cap,  # Average market cap of top holdings
        api_data['portfolioMetrics']['averagePortfolioValue'],  # Average portfolio value
        api_data['portfolioMetrics']['totalPortfolioValue'],  # Total portfolio value
    ] + token_balances + token_prices  # Include token balances and prices

    return np.array(state)



# Normalize Features
# Standardize state features for improved model training
def normalize_states(states):
    scaler = StandardScaler()
    return scaler.fit_transform(states)

# Create DQN Model
# Define the neural network for the RL agent
def create_dqn(state_size, action_size):
    model = tf.keras.Sequential([
        layers.Dense(64, activation='relu', input_shape=(state_size,)),
        layers.Dense(64, activation='relu'),
        layers.Dense(action_size, activation='linear')
    ])
    model.compile(optimizer=tf.keras.optimizers.Adam(learning_rate=0.001), loss='mse')
    return model

# Simulate Next State
# Generate the next state based on the action taken and simulated market changes
def simulate_next_state(state, action, token_prices, token_balances):
    token_idx = action // 3  # Determine token index
    action_type = action % 3  # Determine action type (Buy, Sell, Hold)

    if action_type == 0:  # Buy
        state[token_idx + 5] += 1  # Increase token balance
    elif action_type == 1:  # Sell
        state[token_idx + 5] -= 1  # Decrease token balance

    # Simulate market changes in token prices
    token_prices = [price * np.random.uniform(0.95, 1.05) for price in token_prices]

    # Update total portfolio value based on new token balances and prices
    total_value = sum(balance * price for balance, price in zip(token_balances, token_prices))
    state[0] = total_value  # Update total portfolio value

    return state, token_prices

# Termination Logic
# Define conditions for ending an RL episode
def check_termination(state, steps, max_steps):
    if state[0] <= 0 or steps >= max_steps:
        return True
    return False

# Reward Function
# Calculate rewards based on portfolio performance and risk
def calculate_reward(old_value, new_value, diversification_score):
    value_change = (new_value - old_value) / old_value if old_value > 0 else 0
    reward = value_change - (1 - diversification_score)  # Penalize lack of diversification
    return reward

# Main Training Loop
# Train the RL agent by simulating interactions with the environment
# Main Training Loop
def train_rl_model(api_url):
    update_wallets()  # Ensure wallets are updated before training

    data = collection.find()  # Fetch data directly from updated collection
    api_data = fetch_aggregated_data(api_url)

    # Extract valid states, skipping None
    states = [
        state for wallet in data
        if (state := extract_state(wallet, api_data)) is not None
    ]

    # Ensure states list is not empty before proceeding
    if not states:
        print("No valid states available for training.")
        return

    states = normalize_states(states)

    state_size = len(states[0])
    action_size = 3 * len(states[0][5:])  # Buy, Sell, Hold for each token

    model = create_dqn(state_size, action_size)
    replay_buffer = deque(maxlen=2000)
    gamma = 0.99

    episodes = 100
    for episode in range(episodes):
        state = states[np.random.randint(0, len(states))]  # Random start
        token_prices = state[-len(state[5:]):]  # Extract token prices from state
        token_balances = state[5:5 + len(state[5:])]  # Extract token balances from state
        steps = 0
        done = False

        while not done:
            if np.random.rand() < 0.1:  # Exploration
                action = np.random.choice(action_size)
            else:  # Exploitation
                action = np.argmax(model.predict(state.reshape(1, -1))[0])

            next_state, token_prices = simulate_next_state(state, action, token_prices, token_balances)
            diversification_score = len(set(token_balances)) / len(token_balances)  # Diversity metric
            reward = calculate_reward(state[0], next_state[0], diversification_score)
            done = check_termination(next_state, steps, max_steps=50)

            replay_buffer.append((state, action, reward, next_state, done))

            if len(replay_buffer) > 32:
                minibatch = random.sample(replay_buffer, 32)
                states_mb, actions_mb, rewards_mb, next_states_mb, dones_mb = zip(*minibatch)

                targets = model.predict(np.array(states_mb))
                next_q_values = model.predict(np.array(next_states_mb))

                for i in range(32):
                    if dones_mb[i]:
                        targets[i][actions_mb[i]] = rewards_mb[i]
                    else:
                        targets[i][actions_mb[i]] = rewards_mb[i] + gamma * np.max(next_q_values[i])

                model.fit(np.array(states_mb), targets, epochs=1, verbose=0)

            state = next_state
            steps += 1

        print(f"Episode {episode + 1}/{episodes} completed.")

    model.save("rl_wallet_model.h5")
    print("Model training complete and saved.")


if __name__ == "__main__":
    API_URL = "https://soltrendio.com/api/stats/getTrends"  # Replace with your actual API URL
    train_rl_model(API_URL)
