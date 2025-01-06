import numpy as np
import tensorflow as tf
from tensorflow.keras import layers
from pymongo import MongoClient
import requests
import random
from sklearn.preprocessing import StandardScaler
import os
from dotenv import load_dotenv
from langchain_openai import OpenAI
from langchain.prompts import PromptTemplate
from operator import itemgetter

# Load environment variables from .env file
load_dotenv()
API_URL = "https://soltrendio.com/api/stats/getTrends"  # Replace with your actual API URL
MODEL_PATH = "rl_wallet_model.h5"  # Path to the trained model
# MongoDB Connection Setup
def get_mongo_connection():
    MONGO_URI = os.getenv("MONGODB_URI")
    print(f"Attempting to connect to MongoDB with URI: {MONGO_URI[:20]}...")  # Only show start of URI for security
    
    DB_NAME = "walletAnalyzer"
    COLLECTION_NAME = "wallets"

    client = MongoClient(
        MONGO_URI,
        tls=True,
        tlsAllowInvalidCertificates=True
    )
    db = client[DB_NAME]
    print("Successfully connected to MongoDB")
    return db[COLLECTION_NAME]

collection = get_mongo_connection()

# Fetch Aggregated Data from API
def fetch_aggregated_data(api_url):
    print(f"Fetching data from API: {api_url}")
    response = requests.get(api_url)
    print(f"API Response status code: {response.status_code}")
    return response.json()

# Extract States from Wallet Data
def extract_state(wallet, api_data):
    print(f"\nExtracting state for wallet: {wallet.get('address', 'Unknown address')}")
    
    if wallet.get("topHoldings") is None or not wallet["topHoldings"]:
        print("Warning: Wallet has no topHoldings")
        return None

    print(f"Number of top holdings: {len(wallet['topHoldings'])}")
    
    # Pad or truncate topHoldings to exactly 8 tokens
    MAX_TOKENS = 8
    padded_holdings = wallet['topHoldings'][:MAX_TOKENS]  # Truncate if more than 8
    while len(padded_holdings) < MAX_TOKENS:  # Pad with empty holdings if less than 8
        padded_holdings.append({
            'marketCap': '0',
            'price': '0',
            'balance': '0',
            'symbol': 'EMPTY'
        })

    market_caps = [float(h.get('marketCap', 0)) for h in padded_holdings]
    token_prices = [float(h.get('price', 0)) for h in padded_holdings]
    token_balances = [float(h.get('balance', 0)) for h in padded_holdings]

    print(f"Market caps: {market_caps}")
    print(f"Token prices: {token_prices}")
    print(f"Token balances: {token_balances}")

    avg_market_cap = sum(market_caps) / len(market_caps) if market_caps else 0
    print(f"Average market cap: {avg_market_cap}")

    # Ensure totalValue is a float
    total_value = wallet['totalValue']
    if isinstance(total_value, dict) and '$numberDouble' in total_value:
        total_value = float(total_value['$numberDouble'])
    print(f"Total wallet value: {total_value}")

    # Create state vector with exactly 25 features:
    # 5 portfolio metrics + (8 tokens × 2.5 features per token = 20 features)
    state = [
        total_value,                    # Total portfolio value
        len(wallet['topHoldings']),     # Original number of holdings
        avg_market_cap,                 # Average market cap of top holdings
        api_data['portfolioMetrics']['averagePortfolioValue'],  # Average portfolio value
        api_data['portfolioMetrics']['totalPortfolioValue']     # Total portfolio value
    ] + token_balances + token_prices   # 8 balances + 8 prices = 16 features

    # Total features: 5 + 8 + 8 = 21 features
    # Add 4 more features to reach 25 (you might want to adjust these based on your model's requirements)
    state.extend([0.0] * 4)  # Padding with zeros to reach 25 features

    print(f"Final state vector shape: {len(state)}")
    print(f"State vector: {state}\n")
    return np.array(state)

# Normalize Features
def normalize_states(states, scaler=None):
    print("\nNormalizing states...")
    # Convert list to numpy array if it isn't already
    states = np.array(states)
    print(f"Input states shape: {states.shape}")
    
    if scaler is None:
        scaler = StandardScaler()
        states = scaler.fit_transform(states)
        print("Created new scaler and fit_transformed states")
    else:
        states = scaler.transform(states)
        print("Used existing scaler to transform states")
    
    print(f"Normalized states shape: {states.shape}")
    print(f"Normalized states sample: {states[0][:5]}...\n")
    return states, scaler

# Add this new function to create the summary
def generate_trading_summary(wallet_address, holdings_analysis):
    """
    Generate a natural language summary of trading recommendations using Langchain.
    """
    try:
        llm = OpenAI(temperature=0.7, openai_api_key=os.getenv("OPENAI_API_KEY"))
        
        # Create a prompt template
        template = """
        As a crypto trading advisor, analyze the following wallet and its DDQN holdings analysis:

        Wallet Address: {wallet_address}

        Holdings Analysis:
        {holdings_details}

        Please provide a concise summary of the recommended trading actions, including:
        1. Overall portfolio assessment
        2. Specific recommendations for each token
        3. Key opportunities and risks

        Summary:
        """

        # Create prompt with template
        prompt = PromptTemplate(
            input_variables=["wallet_address", "holdings_details"],
            template=template
        )

        # Create and run the chain using the new pattern
        chain = (
            {"wallet_address": itemgetter("wallet_address"), 
             "holdings_details": itemgetter("holdings_details")} 
            | prompt 
            | llm
        )
        
        # Invoke the chain with the new pattern
        summary = chain.invoke({
            "wallet_address": wallet_address,
            "holdings_details": holdings_analysis
        })
        
        print("\n=== AI Generated Trading Summary ===")
        print(summary)
        return summary
        
    except Exception as e:
        print(f"Error generating summary: {str(e)}")
        return None

# Load and Test the Trained Model
def test_model_on_wallet(wallet_identifier, api_url, model_path):
    # Load the trained model without compilation
    model = tf.keras.models.load_model(model_path, compile=False)
    print("Model loaded successfully.")

    # Recompile the model with the correct loss function
    model.compile(optimizer=tf.keras.optimizers.Adam(learning_rate=0.001), loss='mse')
    print("Model recompiled with MSE loss.")

    # Fetch API data
    api_data = fetch_aggregated_data(api_url)

    # Fetch wallet from database
    wallet = collection.find_one({"$or": [{"address": wallet_identifier}, {"domain": wallet_identifier}]})
    if wallet is None:
        print(f"Wallet with identifier {wallet_identifier} not found in the database.")
        return

    # Extract state
    state = extract_state(wallet, api_data)
    if state is None:
        print(f"Wallet {wallet_identifier} has no topHoldings or insufficient data.")
        return

    # Normalize the state (use a pre-fitted scaler if available)
    states, scaler = normalize_states([state])
    normalized_state = states[0]  # Extract the first (and only) normalized state

    # Predict actions using the model
    q_values = model.predict(normalized_state.reshape(1, -1))[0]

    # Iterate over all tokens in the wallet and output the best action
    print(f"\nAnalyzing wallet: {wallet['address']}")
    print(f"Q-values: {q_values}")

    # Create a list to store analysis results
    holdings_analysis = []

    for token_index, holding in enumerate(wallet["topHoldings"]):
        # Determine the best action for this token
        actions = ["Buy", "Sell", "Hold"]
        token_q_values = q_values[token_index * 3: (token_index + 1) * 3]
        best_action_index = np.argmax(token_q_values)
        best_action = actions[best_action_index]
        
        # Calculate confidence as the difference between the best Q-value and the average of others
        confidence = token_q_values[best_action_index] - np.mean(token_q_values)

        # Store the analysis
        holdings_analysis.append({
            "symbol": holding["symbol"],
            "balance": holding.get("balance", 0),
            "action": best_action,
            "confidence": confidence,
            "q_values": token_q_values.tolist()
        })

        # Output the action for the token
        print(f"Token: {holding['symbol']}, Best action: {best_action}, Q-values: {token_q_values}")

    # Generate and display the trading summary
    generate_trading_summary(wallet['address'], holdings_analysis)


if __name__ == "__main__":
    wallet_identifier = input("Enter the wallet address or .sol domain to analyze: ").strip()
    test_model_on_wallet(wallet_identifier, API_URL, MODEL_PATH)
