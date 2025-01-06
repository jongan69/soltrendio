import torch
import torch.nn as nn
import torch.optim as optim
from pymongo import MongoClient
import requests
import random
from sklearn.preprocessing import StandardScaler
import numpy as np
import os
import json
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
def extract_state(wallet, api_data, max_tokens=10):
    if wallet.get("topHoldings") is None or not wallet["topHoldings"]:
        return None  # Skip wallets without topHoldings

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
        api_data['portfolioMetrics']['totalPortfolioValue']  # Total portfolio value
    ] + token_balances + token_prices

    return np.array(state)

# Normalize Features
def normalize_states(states):
    scaler = StandardScaler()
    return scaler.fit_transform(states), scaler

# CANN Model
class CANN(nn.Module):
    def __init__(self, input_size, recurrent_size, output_size):
        super(CANN, self).__init__()
        self.recurrent_layer = nn.Linear(input_size + recurrent_size, recurrent_size)
        self.output_layer = nn.Linear(recurrent_size, output_size)
        self.activation = nn.Tanh()  # Continuous activation function

    def forward(self, x, state):
        # Concatenate input with recurrent state
        combined = torch.cat((x, state), dim=1)
        # Update recurrent state
        new_state = self.activation(self.recurrent_layer(combined))
        # Compute output (actions)
        output = self.output_layer(new_state)
        return output, new_state

# Test the CANN Model
def test_cann(api_url, model_path, metadata_path):
    # Load metadata
    with open(metadata_path, "r") as f:
        metadata = json.load(f)

    input_size = metadata["input_size"]
    recurrent_size = metadata["recurrent_size"]
    output_size = metadata["output_size"]
    max_tokens = metadata["max_tokens"]

    # Initialize the model
    cann = CANN(input_size, recurrent_size, output_size)
    cann.load_state_dict(torch.load(model_path, map_location=torch.device('cpu')))
    cann.eval()
    print("Model loaded successfully.")

    # Fetch API data
    api_data = fetch_aggregated_data(api_url)

    # Retry fetching a wallet with topHoldings
    max_retries = 10
    for attempt in range(max_retries):
        random_wallet = collection.aggregate([{"$sample": {"size": 1}}]).next()
        state = extract_state(random_wallet, api_data, max_tokens=max_tokens)
        if state is not None:
            break
        print(f"Attempt {attempt + 1}: Wallet has no topHoldings. Retrying...")
    else:
        print("Failed to fetch a valid wallet with topHoldings after multiple attempts.")
        return

    # Normalize the state
    scaler = StandardScaler()
    state = scaler.fit_transform([state])  # Normalize as a batch
    state_tensor = torch.tensor(state, dtype=torch.float32)
    state_memory = torch.zeros(1, recurrent_size)  # Initialize recurrent state

    # Run the model
    with torch.no_grad():
        output, _ = cann(state_tensor, state_memory)

    # Interpret the output for each token
    actions = ["Buy", "Sell", "Hold"]
    print(f"Testing on wallet: {random_wallet['address']}")

    for idx, holding in enumerate(random_wallet['topHoldings'][:max_tokens]):
        token_symbol = holding['symbol']
        
        # Ensure output corresponds to each token
        if len(output[0]) >= (idx + 1) * output_size:
            token_scores = output[0, idx * output_size:(idx + 1) * output_size]
            best_action_idx = torch.argmax(token_scores).item()
            print(f"Token: {token_symbol}, Recommended action: {actions[best_action_idx]}, Scores: {token_scores.tolist()}")
        else:
            print(f"Token: {token_symbol}, Not enough data in output for this token.")

if __name__ == "__main__":
    API_URL = "https://soltrendio.com/api/stats/getTrends"  # Replace with your actual API URL
    MODEL_PATH = "cann_model.pth"  # Path to the trained model
    METADATA_PATH = "cann_metadata.json"  # Path to the metadata file

    test_cann(API_URL, MODEL_PATH, METADATA_PATH)
