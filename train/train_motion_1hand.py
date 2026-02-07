import pandas as pd
import numpy as np
import pickle
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score

MAX_FRAMES = 30

# Load dataset
data = pd.read_csv("onehandmotion.csv")

# Columns
label_col = "label"
frame_col = "frame"

feature_cols = [c for c in data.columns if c not in ["label", "frame"]]

X_chunks = []
y_chunks = []

# Group by each gesture label
for label, group in data.groupby(label_col):
    group = group.sort_values(frame_col)

    frames = group[feature_cols].values

    # Take chunks of 30 frames
    for i in range(0, len(frames) - MAX_FRAMES + 1, MAX_FRAMES):
        chunk = frames[i:i+MAX_FRAMES]          # shape (30, 42)
        flat = chunk.flatten()                  # shape (1260,)
        X_chunks.append(flat)
        y_chunks.append(label)

X = np.array(X_chunks)
y = np.array(y_chunks)

print("Total samples:", X.shape)
print("Feature size:", X.shape[1])   # MUST be 1260

# Split
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# Train
model = RandomForestClassifier(n_estimators=200, random_state=42)
model.fit(X_train, y_train)

# Test
y_pred = model.predict(X_test)
acc = accuracy_score(y_test, y_pred)

print("Motion model accuracy:", acc)

# Save new model
with open("motion_1hand.pkl", "wb") as f:
    pickle.dump(model, f)

print("New motion_1hand.pkl saved successfully ✅")
