from flask import Flask, request, jsonify, render_template, redirect
import joblib
import numpy as np
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)

# 🔥 Disable template caching (important for updates)
app.config['TEMPLATES_AUTO_RELOAD'] = True
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0


# ==============================
# PAGE ROUTES
# ==============================

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/login', methods=['POST'])
def login():
    return redirect("/home")

@app.route('/home')
def home():
    return render_template('home.html')

@app.route('/sign-to-speech')
def sign_to_speech():
    return render_template('sign_to_speech.html')

@app.route('/speech-to-sign')
def speech_to_sign():
    return render_template('speech_to_sign.html')

@app.route('/about')
def about():
    return render_template('about.html')


# ==============================
# LOAD TRAINED MODEL
# ==============================

model_1hand = None

try:
    model_path = os.path.join(os.path.dirname(__file__), "model.pkl")
    model_1hand = joblib.load(model_path)
    print("✅ Model loaded successfully")
except Exception as e:
    print("❌ Model not loaded:", e)


# ==============================
# PREDICTION API
# ==============================

@app.route('/predict', methods=['POST'])
def predict():
    try:
        if model_1hand is None:
            return jsonify({"prediction": None, "confidence": 0.0})

        data = request.json
        landmarks = data.get("landmarks")
        hand_count = int(data.get("handCount", 0))

        # no hand detected
        if not landmarks:
            return jsonify({"prediction": None, "confidence": 0.0})

        # only 1-hand supported
        if hand_count != 1:
            return jsonify({
                "prediction": None,
                "confidence": 0.0,
                "message": "Only 1-hand model supported"
            })

        # convert to numpy array
        arr = np.array(landmarks).reshape(1, -1)

        # predict
        probs = model_1hand.predict_proba(arr)[0]
        prediction = model_1hand.classes_[np.argmax(probs)]
        confidence = float(np.max(probs))

        return jsonify({
            "prediction": str(prediction),
            "confidence": confidence
        })

    except Exception as e:
        print("Prediction error:", e)
        return jsonify({
            "prediction": None,
            "confidence": 0.0
        })


# ==============================
# START SERVER
# ==============================

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port, debug=True)