from flask import Flask, request, jsonify, render_template
import joblib
import numpy as np
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)

# ==============================
# PAGE ROUTES (FRONTEND)
# ==============================

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/home")
def home():
    return render_template("home.html")

@app.route("/sign-to-speech")
def sign_to_speech():
    return render_template("sign_to_speech.html")

@app.route("/speech-to-sign")
def speech_to_sign():
    return render_template("speech_to_sign.html")

@app.route("/about")
def about():
    return render_template("about.html")

# ==============================
# LOAD TRAINED MODELS
# ==============================

model_1hand = joblib.load("model.pkl")
model_2hand = joblib.load("static_2hand_rf.pkl")
motion_model = joblib.load("motion_1hand.pkl")

# ==============================
# API ENDPOINT
# ==============================

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.json
        landmarks = data.get("landmarks")
        hand_count = int(data.get("handCount", 0))
        is_motion = bool(data.get("isMotion", False))

        if not landmarks:
            return jsonify({"prediction": None, "confidence": 0.0})

        arr = np.array(landmarks).reshape(1, -1)

        if hand_count == 1 and is_motion:
            model = motion_model
        elif hand_count == 1:
            model = model_1hand
        elif hand_count == 2:
            model = model_2hand
        else:
            return jsonify({"prediction": None, "confidence": 0.0})

        probs = model.predict_proba(arr)[0]
        prediction = model.classes_[np.argmax(probs)]
        confidence = float(np.max(probs))

        return jsonify({
            "prediction": str(prediction),
            "confidence": confidence
        })

    except Exception as e:
        print(e)
        return jsonify({"prediction": None, "confidence": 0.0})

# ==============================
# START SERVER (RENDER)
# ==============================

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port)
