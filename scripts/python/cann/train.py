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

# Training Loop
def train_cann(api_url, max_epochs=100, batch_size=32, max_tokens=10):
    # Fetch API data
    api_data = fetch_aggregated_data(api_url)

    # Prepare training data
    training_data = []
    for wallet in collection.find():
        state = extract_state(wallet, api_data, max_tokens=max_tokens)
        if state is not None:
            # Example target: Random actions (replace with actual reward-based targets)
            target_action = np.random.uniform(0, 1, size=3)
            training_data.append((state, target_action))

    if not training_data:
        print("No valid training data found.")
        return

    states, targets = zip(*training_data)
    states, scaler = normalize_states(states)

    # Convert to PyTorch tensors
    states = torch.tensor(states, dtype=torch.float32)
    targets = torch.tensor(targets, dtype=torch.float32)

    # Initialize the CANN model
    input_size = states.shape[1]
    recurrent_size = 64
    output_size = targets.shape[1]
    cann = CANN(input_size, recurrent_size, output_size)

    criterion = nn.MSELoss()
    optimizer = optim.Adam(cann.parameters(), lr=0.001)

    # Training loop
    for epoch in range(max_epochs):
        epoch_loss = 0
        for i in range(0, len(states), batch_size):
            batch_states = states[i:i+batch_size]
            batch_targets = targets[i:i+batch_size]
            state_memory = torch.zeros(batch_states.size(0), recurrent_size)  # Initialize recurrent state

            # Forward pass
            optimizer.zero_grad()
            outputs, _ = cann(batch_states, state_memory)
            loss = criterion(outputs, batch_targets)

            # Backpropagation
            loss.backward()
            optimizer.step()

            epoch_loss += loss.item()

        print(f"Epoch {epoch + 1}/{max_epochs}, Loss: {epoch_loss / len(states)}")

    # Save the trained model
    torch.save(cann.state_dict(), "cann_model.pth")
    print("Model training complete and saved.")

    # Save metadata for testing
    metadata = {
        "input_size": input_size,
        "recurrent_size": recurrent_size,
        "output_size": output_size,
        "max_tokens": max_tokens
    }
    with open("cann_metadata.json", "w") as f:
        json.dump(metadata, f)
    print("Model metadata saved.")

if __name__ == "__main__":
    API_URL = "https://soltrendio.com/api/stats/getTrends"  # Replace with your actual API URL
    train_cann(API_URL)
