import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
import joblib
import os

# ===============================
# CONFIG
# ===============================
CSV_FILE = 'twohands_static.csv'
MODEL_FILE = 'static_2hand_rf.pkl'

# ===============================
# LOAD DATA
# ===============================
print(f"Loading {CSV_FILE} ...")

if not os.path.exists(CSV_FILE):
    print("ERROR ❌ CSV file not found")
    exit()

df = pd.read_csv(CSV_FILE)
print(f"Total samples: {len(df)}")

# ===============================
# PREPARE DATA
# ===============================
if 'label' not in df.columns:
    print("ERROR ❌ 'label' column missing")
    exit()

X = df.drop('label', axis=1)
y = df['label']

print(f"Feature count: {X.shape[1]} (should be ~126)")

X_train, X_test, y_train, y_test = train_test_split(
    X, y,
    test_size=0.2,
    random_state=42,
    stratify=y
)

# ===============================
# TRAIN RANDOM FOREST
# ===============================
print("Training STATIC TWO-HAND model (Random Forest)...")

model = RandomForestClassifier(
    n_estimators=300,
    max_depth=None,
    random_state=42,
    n_jobs=-1
)

model.fit(X_train, y_train)

print("Training completed ✅")

# ===============================
# EVALUATE
# ===============================
y_pred = model.predict(X_test)
accuracy = accuracy_score(y_test, y_pred)

print(f"\nAccuracy: {accuracy * 100:.2f}%")
print("\nClassification Report:")
print(classification_report(y_test, y_pred))

# ===============================
# CONFUSION MATRIX
# ===============================
plt.figure(figsize=(10, 8))
cm = confusion_matrix(y_test, y_pred)
sns.heatmap(
    cm,
    annot=True,
    fmt='d',
    cmap='Blues',
    xticklabels=model.classes_,
    yticklabels=model.classes_
)
plt.title("Static Two-Hand Confusion Matrix (RF)")
plt.xlabel("Predicted")
plt.ylabel("Actual")
plt.tight_layout()
plt.show()

# ===============================
# SAVE MODEL
# ===============================
joblib.dump(model, MODEL_FILE)
print(f"\nSUCCESS 🎉 Model saved as '{MODEL_FILE}'")
