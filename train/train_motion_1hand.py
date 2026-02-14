import pandas as pd
import numpy as np
import pickle
import matplotlib.pyplot as plt
from sklearn.model_selection import train_test_split, cross_val_score, learning_curve
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report

# 1. Load the cleaned dataset
# Ensure you use 'onehandmotion_cleaned.csv' which I fixed for you earlier
data = pd.read_csv("onehandmotion.csv")

MAX_FRAMES = 30
label_col = "label"
frame_col = "frame"

# Select coordinate columns (x0-x20, y0-y20)
feature_cols = [c for c in data.columns if c.startswith('x') or c.startswith('y')]

X_chunks = []
y_chunks = []

# 2. Process sequences into 30-frame chunks
print("Processing sequences...")
for label, group in data.groupby(label_col):
    group = group.sort_values(frame_col)
    frames = group[feature_cols].values

    # Take chunks of 30 frames
    for i in range(0, len(frames) - MAX_FRAMES + 1, MAX_FRAMES):
        chunk = frames[i:i+MAX_FRAMES]
        X_chunks.append(chunk.flatten())
        y_chunks.append(label)

X = np.array(X_chunks)
y = np.array(y_chunks)

print(f"Total sequences created: {X.shape[0]}")
print(f"Feature size: {X.shape[1]}") # Should be 1260 (30*42)

# 3. Split data (using stratify to ensure equal class balance)
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

# 4. Train Model 
# I added 'max_depth' to help prevent extreme overfitting
model = RandomForestClassifier(n_estimators=100, max_depth=15, random_state=42)
model.fit(X_train, y_train)

# --- OVERFITTING CHECKS ---

# Check 1: Train vs Test Accuracy Gap
train_acc = model.score(X_train, y_train)
test_acc = model.score(X_test, y_test)
print(f"\n[Check 1] Training Accuracy: {train_acc*100:.2f}%")
print(f"[Check 1] Testing Accuracy: {test_acc*100:.2f}%")

# Check 2: 5-Fold Cross-Validation
print("\n[Check 2] Running Cross-Validation...")
cv_scores = cross_val_score(model, X, y, cv=5)
print(f"Cross-Validation Mean: {cv_scores.mean()*100:.2f}%")
print(f"Cross-Validation Std Dev: {cv_scores.std():.4f}")

# Check 3: Generate Learning Curve Plot
print("\n[Check 3] Generating Learning Curve...")
train_sizes, train_scores, test_scores = learning_curve(
    model, X, y, cv=5, n_jobs=-1, train_sizes=np.linspace(0.1, 1.0, 5)
)

plt.figure(figsize=(10, 6))
plt.plot(train_sizes, np.mean(train_scores, axis=1), 'o-', color="r", label="Training score")
plt.plot(train_sizes, np.mean(test_scores, axis=1), 'o-', color="g", label="Cross-validation score")
plt.title("Learning Curve (Overfitting Analysis)")
plt.xlabel("Training Examples")
plt.ylabel("Accuracy Score")
plt.legend(loc="best")
plt.grid()
plt.savefig("learning_curve.png")
print("Learning curve plot saved as 'learning_curve.png'")

# 5. Save the final model
with open("motion_1hand.pkl", "wb") as f:
    pickle.dump(model, f)

print("\nModel saved successfully as 'motion_1hand.pkl' ✅")