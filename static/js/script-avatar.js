import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/loaders/GLTFLoader.js";

/* =========================================================
   SIGNORA – SPEECH TO SIGN AVATAR RENDERER
   (SENTENCE FEATURE ADDED, signWord KEPT)
   ========================================================= */

(() => {

console.log("script-avatar.js loaded");

/* ------------------ VARIABLES ------------------ */
let scene, camera, renderer, loader;
let avatar, mixer, clock;
let currentAction = null;

let targetQuats = {};
const SLERP_SPEED = 0.12;
let animationMode = false;

/* ------------------ INIT ------------------ */
function init() {
    const container = document.getElementById("avatarBox");
    if (!container) {
        console.error("❌ avatarBox not found");
        return;
    }

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(
        35,
        container.clientWidth / container.clientHeight,
        0.1,
        1000
    );
    camera.position.set(0, 1.3, 2.8);
    camera.lookAt(0, 1.3, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 1.4));

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(3, 10, 10);
    scene.add(dirLight);

    clock = new THREE.Clock();
    loader = new GLTFLoader();

    loadAvatar();
    window.addEventListener("resize", onResize);
}

/* ------------------ LOAD AVATAR ------------------ */
function loadAvatar() {
    loader.load(
       "/static/assets/avatar/myavatar.glb",
        (gltf) => {
            avatar = gltf.scene;

            avatar.position.set(0, -0.1, 0);
            avatar.scale.set(1.2, 1.2, 1.2);
            avatar.rotation.set(0, 0, 0);

            mixer = new THREE.AnimationMixer(avatar);
            scene.add(avatar);

            document.getElementById("loading-text")?.remove();

            initTargets();
            resetToIdle();
            animate();
        },
        undefined,
        (err) => console.error("❌ GLB load error:", err)
    );
}

/* ------------------ BONE TARGET SYSTEM ------------------ */
let restPose = {};

function initTargets() {
    restPose = {};
    avatar.traverse((b) => {
        if (b.isBone) restPose[b.name] = b.quaternion.clone();
    });
}

function updatePose() {
    if (animationMode) return;
}

/* ------------------ NATURAL IDLE POSE ------------------ */
function resetToIdle() {
    animationMode = false;
    avatar.traverse((b) => {
        if (b.isBone && restPose[b.name]) {
            b.quaternion.copy(restPose[b.name]);
        }
    });
}

/* ------------------ PLAY SIGN ANIMATION ------------------ */
function playClip(clip, onFinish) {
    if (!clip) return;

    animationMode = true;

    if (currentAction) currentAction.fadeOut(0.2);

    const action = mixer.clipAction(clip, avatar);
    action.reset();
    action.setLoop(THREE.LoopOnce);
    action.clampWhenFinished = true;
    action.fadeIn(0.2);
    action.play();

    currentAction = action;

    setTimeout(() => {
        animationMode = false;
        resetToIdle();
        if (onFinish) onFinish();
    }, clip.duration * 1000 + 300);
}

/* ------------------ SENTENCE PLAYER (NEW) ------------------ */
const SIGN_MAP = {
  /* =====================
     GREETINGS
     ===================== */
  // English
  hello: "/static/assets/Animations/hello.glb",
  hi: "/static/assets/Animations/hello.glb",
  food:"/static/assets/Animations/eat.glb",
  eating:"/static/assets/Animations/eat.glb",
  // Hindi
  namaste: "/static/assets/Animations/hello.glb",
  namaskar: "/static/assets/Animations/hello.glb",

  // Telugu
  namaskaram: "/static/assets/Animations/hello.glb",

  // Tamil
  vanakkam: "/static/assets/Animations/hello.glb",

  /* =====================
     PRONOUNS
     ===================== */
  // English
  i: "/static/assets/Animations/I.glb",
  me: "/static/assets/Animations/me.glb",
  you: "/static/assets/Animations/you.glb",

  // Hindi
  main: "/static/assets/Animations/I.glb",
  mujhe: "/static/assets/Animations/me.glb",
  mujhey: "/static/assets/Animations/me.glb",
  tum: "/static/assets/Animations/you.glb",
  aap: "/static/assets/Animations/you.glb",

  // Telugu
  nenu: "/static/assets/Animations/I.glb",
  naaku: "/static/assets/Animations/me.glb",
  naku: "/static/assets/Animations/me.glb",
  nuvvu: "/static/assets/Animations/you.glb",
  meeru: "/static/assets/Animations/you.glb",

  // Tamil
  naan: "/static/assets/Animations/I.glb",
  ennai: "/static/assets/Animations/me.glb",
  enakku: "/static/assets/Animations/me.glb",
  nee: "/static/assets/Animations/you.glb",
  neenga: "/static/assets/Animations/you.glb",

  /* =====================
     POLITE WORDS
     ===================== */
  // English
  please: "/static/assets/Animations/please.glb",
  sorry: "/static/assets/Animations/sorry.glb",
  thank: "/static/assets/Animations/thankyou.glb",
  thanks: "/static/assets/Animations/thankyou.glb",
  welcome: "/static/assets/Animations/welcome.glb",

  // Hindi
  kripya: "/static/assets/Animations/please.glb",
  maaf: "/static/assets/Animations/sorry.glb",
  shukriya: "/static/assets/Animations/thankyou.glb",
  dhanyavaad: "/static/assets/Animations/thankyou.glb",
  swagat: "/static/assets/Animations/welcome.glb",

  // Telugu
  daya: "/static/assets/Animations/please.glb",
  kshaminchandi: "/static/assets/Animations/sorry.glb",
  dhanyavadalu: "/static/assets/Animations/thankyou.glb",
  swagatham: "/static/assets/Animations/welcome.glb",

  // Tamil
  thayavu: "/static/assets/Animations/please.glb",
  mannikkavum: "/static/assets/Animations/sorry.glb",
  nandri: "/static/assets/Animations/thankyou.glb",
  varaverppu: "/static/assets/Animations/welcome.glb",

  /* =====================
     ACTIONS
     ===================== */
  // English
  help: "/static/assets/Animations/help.glb",
  eat: "/static/assets/Animations/eat.glb",

  // Hindi
  madad: "/static/assets/Animations/help.glb",
  khana: "/static/assets/Animations/eat.glb",

  // Telugu
  sahayam: "/static/assets/Animations/help.glb",
  tinu: "/static/assets/Animations/eat.glb",
  tinnava: "/static/assets/Animations/eat.glb",

  // Tamil
  udhavi: "/static/assets/Animations/help.glb",
  saapidu: "/static/assets/Animations/eat.glb",

  /* =====================
     QUESTIONS / ANSWERS
     ===================== */
  // English
  what: "/static/assets/Animations/what.glb",
  how: "/static/assets/Animations/how.glb",
  name: "/static/assets/Animations/name.glb",
  yes: "/static/assets/Animations/yes.glb",
  ok: "/static/assets/Animations/ok.glb",

  // Hindi
  kya: "/static/assets/Animations/what.glb",
  kaise: "/static/assets/Animations/how.glb",
  naam: "/static/assets/Animations/name.glb",
  haan: "/static/assets/Animations/yes.glb",
  theek: "/static/assets/Animations/ok.glb",

  // Telugu
  emi: "/static/assets/Animations/what.glb",
  ela: "/static/assets/Animations/how.glb",
  peru: "/static/assets/Animations/name.glb",
  avunu: "/static/assets/Animations/yes.glb",
  sare: "/static/assets/Animations/ok.glb",

  // Tamil
  enna: "/static/assets/Animations/what.glb",
  eppadi: "/static/assets/Animations/how.glb",
  peyar: "/static/assets/Animations/name.glb",
  aam: "/static/assets/Animations/yes.glb",
  seri: "/static/assets/Animations/ok.glb"
};
function playSentence(words, index = 0) {
    if (index >= words.length) {
        resetToIdle();
        return;
    }

    const file = SIGN_MAP[words[index]];
    if (!file) {
        playSentence(words, index + 1);
        return;
    }

    loader.load(file, (gltf) => {
        const clip = gltf.animations[0];
        if (!clip) {
            console.warn("⚠ No animation in", file);
            playSentence(words, index + 1);
            return;
        }

        // ❗ Apply animation to BASE AVATAR
        const action = mixer.clipAction(clip, avatar);
        action.reset();
        action.setLoop(THREE.LoopOnce);
        action.clampWhenFinished = true;
        action.play();

        setTimeout(() => {
            action.stop();
            playSentence(words, index + 1);
        }, clip.duration * 1000);
    });
}


/* ------------------ SPEECH → SIGN (EXTENDED, NOT REPLACED) ------------------ */
window.signWord = (input) => {
    if (!avatar || !mixer) {
        console.warn("Avatar not ready yet");
        return;
    }

    const words = input
        .toLowerCase()
        .replace(/[^\w\s]/g, "")
        .split(/\s+/)
        .filter(w => SIGN_MAP[w]);

    if (!words.length) {
        resetToIdle();
        return;
    }

    playSentence(words);
};


/* ------------------ RENDER LOOP ------------------ */
function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    if (mixer) mixer.update(delta);

    updatePose();
    renderer.render(scene, camera);
}


/* ------------------ RESIZE ------------------ */
function onResize() {
    const box = document.getElementById("avatarBox");
    if (!box) return;

    camera.aspect = box.clientWidth / box.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(box.clientWidth, box.clientHeight);
}

/* ------------------ START ------------------ */
init();

})();
