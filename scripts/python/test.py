import numpy as np
import tensorflow as tf
from tensorflow.keras import layers
from pymongo import MongoClient
import requests
import random
from sklearn.preprocessing import StandardScaler
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# MongoDB Connection Setup
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

# Fetch Aggregated Data from API
def fetch_aggregated_data(api_url):
    response = requests.get(api_url)
    return response.json()

# Extract States from Wallet Data
def extract_state(wallet, api_data):
    if wallet.get("topHoldings") is None or not wallet["topHoldings"]:
        return None  # Skip wallets without topHoldings

    market_caps = [float(h.get('marketCap', 0)) for h in wallet['topHoldings']]
    token_prices = [float(h.get('price', 0)) for h in wallet['topHoldings']]
    token_balances = [float(h.get('balance', 0)) for h in wallet['topHoldings']]

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
        api_data['portfolioMetrics']['totalPortfolioValue']  # Total portfolio value
    ] + token_balances + token_prices

    return np.array(state)

# Normalize Features
def normalize_states(states, scaler=None):
    if scaler is None:
        scaler = StandardScaler()
        states = scaler.fit_transform(states)
    else:
        states = scaler.transform(states)
    return states, scaler

# Load and Test the Trained Model
def test_model_on_random_wallet(api_url, model_path):
    # Load the trained model without compilation
    model = tf.keras.models.load_model(model_path, compile=False)
    print("Model loaded successfully.")

    # Recompile the model with the correct loss function
    model.compile(optimizer=tf.keras.optimizers.Adam(learning_rate=0.001), loss='mse')
    print("Model recompiled with MSE loss.")

    # Fetch API data
    api_data = fetch_aggregated_data(api_url)

    # Retry fetching a wallet with topHoldings
    max_retries = 10
    for attempt in range(max_retries):
        random_wallet = collection.aggregate([{"$sample": {"size": 1}}]).next()
        state = extract_state(random_wallet, api_data)
        if state is not None:
            break
        print(f"Attempt {attempt + 1}: Wallet has no topHoldings. Retrying...")
    else:
        print("Failed to fetch a valid wallet with topHoldings after multiple attempts.")
        return

    # Normalize the state (use a pre-fitted scaler if available)
    states, scaler = normalize_states([state])
    normalized_state = states[0]  # Extract the first (and only) normalized state

    # Predict actions using the model
    q_values = model.predict(normalized_state.reshape(1, -1))[0]

    # Iterate over all tokens in the wallet and output the best action
    print(f"Testing on wallet: {random_wallet['address']}")
    print(f"Q-values: {q_values}")

    for token_index, holding in enumerate(random_wallet["topHoldings"]):
        # Determine the best action for this token
        actions = ["Buy", "Sell", "Hold"]
        token_q_values = q_values[token_index * 3: (token_index + 1) * 3]
        best_action_index = np.argmax(token_q_values)
        best_action = actions[best_action_index]

        # Output the action for the token
        token_symbol = holding["symbol"]
        print(f"Token: {token_symbol}, Best action: {best_action}, Q-values: {token_q_values}")

if __name__ == "__main__":
    API_URL = "https://soltrendio.com/api/stats/getTrends"  # Replace with your actual API URL
    MODEL_PATH = "rl_wallet_model.h5"  # Path to the trained model

    # Test the model on a random wallet
    test_model_on_random_wallet(API_URL, MODEL_PATH)
