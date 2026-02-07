import pandas as pd
from sklearn.metrics import classification_report, confusion_matrix
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier   # ✅ Random Forest
from sklearn.metrics import accuracy_score
import joblib
import os

# --- 1. CONFIGURATION ---
CSV_FILE = 'dataset4.csv'     # ✔️ Correct CSV name
MODEL_FILE = 'model.pkl'      # Output model

# --- 2. LOAD DATA ---
print(f"Loading data from {CSV_FILE}...")
try:
    df = pd.read_csv(CSV_FILE)
    print(f"Data loaded successfully. Total samples: {len(df)}")
except FileNotFoundError:
    print(f"ERROR: {CSV_FILE} not found. Make sure the CSV file is in this folder.")
    exit()
if 'label' in df.columns:
    label_counts = df['label'].value_counts().sort_index()
    
    print("--- Label Distribution ---")
    for label, count in label_counts.items():
        print(f"{label} - {count} samples")
    print("-" * 30)
# --- 3. PREPARE DATA ---
# Feature columns = all landmark values
# Label column = sign label
X = df.drop('label', axis=1)
y = df['label']

# Split into train/test sets (80% training, 20% testing)
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

print(f"Training samples: {len(X_train)}, Testing samples: {len(X_test)}")
print("-" * 30)

# --- 4. TRAIN MODEL ---
print("Training the Random Forest Classifier...")

model = RandomForestClassifier(
    n_estimators=200,       # ⭐ 200 trees → better accuracy
    random_state=42,
    n_jobs=-1               # Uses all CPU cores → faster
)

model.fit(X_train, y_train)

print("Training complete.")
print("-" * 30)

# --- 5. EVALUATE MODEL ---
print("Evaluating model accuracy...")
y_pred = model.predict(X_test)
accuracy = accuracy_score(y_test, y_pred)

print(f"Model Accuracy on Test Set: {accuracy * 100:.2f}%")
print("-" * 30)
# Make predictions on the test set

# --- 6. SAVE MODEL ---
joblib.dump(model, MODEL_FILE)

print(f"SUCCESS! Trained model saved as {MODEL_FILE}")
print("You can now run app.py to use this updated model.")

