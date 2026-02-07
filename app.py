from flask import Flask, request, jsonify
import joblib
import numpy as np
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# ==================================================
# LOAD TRAINED MODELS
# ==================================================
print("Loading models...")

model_1hand = joblib.load("model.pkl")              # static 1 hand
model_2hand = joblib.load("static_2hand_rf.pkl")   # static 2 hand
motion_model = joblib.load("motion_1hand.pkl")    # motion 1 hand

print("All models loaded successfully ✅")

# ==================================================
# PREDICTION ENDPOINT
# ==================================================
@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.json

        landmarks = data.get("landmarks")
        hand_count = int(data.get("handCount",0))
        is_motion = bool(data.get("isMotion",False))   # true / false from frontend

        if landmarks is None or hand_count is None:
            return jsonify({
                "prediction": None,
                "confidence": 0.0
            })

        arr = np.array(landmarks).reshape(1, -1)

        # ==================================================
        # MODEL SELECTION LOGIC
        # ==================================================
        if hand_count == 1 and is_motion:
            print("🔥 USING MOTION MODEL")
            model = motion_model
        elif hand_count == 1:
            print("🟢 USING STATIC 1 HAND MODEL")
            model = model_1hand
        elif hand_count == 2:
            print("🔵 USING STATIC 2 HAND MODEL")
            model = model_2hand
        else:
            return jsonify({
                "prediction": None,
                "confidence": 0.0
            })

        # ==================================================
        # SAFETY CHECK FOR FEATURE SIZE
        # ==================================================
        expected_features = model.n_features_in_

        if arr.shape[1] != expected_features:
            print("❌ FEATURE SIZE MISMATCH")
            print("Got:", arr.shape[1], "Expected:", expected_features)
            return jsonify({
                "prediction": None,
                "confidence": 0.0
            })

        # ==================================================
        # PREDICTION
        # ==================================================
        probs = model.predict_proba(arr)[0]
        confidence = float(np.max(probs))
        prediction = model.classes_[np.argmax(probs)]

        return jsonify({
            "prediction": str(prediction),
            "confidence": confidence
        })

    except Exception as e:
        print("Error:", e)
        return jsonify({
            "prediction": None,
            "confidence": 0.0
        })

# ==================================================
# START SERVER
# ==================================================
if __name__ == "__main__":
    app.run(debug=True)
