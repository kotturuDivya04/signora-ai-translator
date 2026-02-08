import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

/* =========================================================
   SIGNORA – SPEECH TO SIGN AVATAR (FINAL STABLE VERSION)
   ========================================================= */

(() => {

console.log("✅ script-avatar.js loaded");

/* ------------------ VARIABLES ------------------ */
let scene, camera, renderer, loader, clock;
let avatar, mixer;
let isPlaying = false;

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
    const light = new THREE.DirectionalLight(0xffffff, 1.2);
    light.position.set(3, 10, 10);
    scene.add(light);

    clock = new THREE.Clock();
    loader = new GLTFLoader();

    loadAvatar();
    window.addEventListener("resize", onResize);
}

/* ------------------ LOAD BASE AVATAR ------------------ */
function loadAvatar() {
    loader.load("/static/assets/avatar/myavatar.glb", (gltf) => {
        avatar = gltf.scene;

        avatar.position.set(0, -0.1, 0);
        avatar.scale.set(1.2, 1.2, 1.2);

        mixer = new THREE.AnimationMixer(avatar);
        scene.add(avatar);

        document.getElementById("loading-text")?.remove();
        animate();
    });
}

/* ------------------ SIGN MAP (ALL LANGUAGES) ------------------ */
const SIGN_MAP = {

  // Greetings
  hello: "/static/assets/Animations/hello.glb",
  hi: "/static/assets/Animations/hello.glb",
  namaste: "/static/assets/Animations/hello.glb",
  namaskar: "/static/assets/Animations/hello.glb",
  namaskaram: "/static/assets/Animations/hello.glb",
  vanakkam: "/static/assets/Animations/hello.glb",

  // Pronouns
  i: "/static/assets/Animations/I.glb",
  me: "/static/assets/Animations/me.glb",
  you: "/static/assets/Animations/you.glb",
  main: "/static/assets/Animations/I.glb",
  mujhe: "/static/assets/Animations/me.glb",
  tum: "/static/assets/Animations/you.glb",
  aap: "/static/assets/Animations/you.glb",
  nenu: "/static/assets/Animations/I.glb",
  naaku: "/static/assets/Animations/me.glb",
  nuvvu: "/static/assets/Animations/you.glb",
  naan: "/static/assets/Animations/I.glb",
  ennai: "/static/assets/Animations/me.glb",
  nee: "/static/assets/Animations/you.glb",

  // Actions
  help: "/static/assets/Animations/help.glb",
  madad: "/static/assets/Animations/help.glb",
  sahayam: "/static/assets/Animations/help.glb",
  udhavi: "/static/assets/Animations/help.glb",

  eat: "/static/assets/Animations/eat.glb",
  food: "/static/assets/Animations/eat.glb",
  eating: "/static/assets/Animations/eat.glb",
  khana: "/static/assets/Animations/eat.glb",
  tinu: "/static/assets/Animations/eat.glb",
  saapidu: "/static/assets/Animations/eat.glb",

  // Polite
  please: "/static/assets/Animations/please.glb",
  sorry: "/static/assets/Animations/sorry.glb",
  thank: "/static/assets/Animations/thankyou.glb",
  thanks: "/static/assets/Animations/thankyou.glb",
  welcome: "/static/assets/Animations/welcome.glb",

  // Questions
  what: "/static/assets/Animations/what.glb",
  how: "/static/assets/Animations/how.glb",
  name: "/static/assets/Animations/name.glb",
  yes: "/static/assets/Animations/yes.glb",
  ok: "/static/assets/Animations/ok.glb",

  kya: "/static/assets/Animations/what.glb",
  kaise: "/static/assets/Animations/how.glb",
  naam: "/static/assets/Animations/name.glb",
  haan: "/static/assets/Animations/yes.glb",

  emi: "/static/assets/Animations/what.glb",
  ela: "/static/assets/Animations/how.glb",
  peru: "/static/assets/Animations/name.glb",

  enna: "/static/assets/Animations/what.glb",
  eppadi: "/static/assets/Animations/how.glb",
  peyar: "/static/assets/Animations/name.glb"
};

/* ------------------ PLAY WORDS SEQUENTIALLY ------------------ */
function playSentence(words, index = 0) {
    if (index >= words.length) {
        isPlaying = false;
        return;
    }

    const file = SIGN_MAP[words[index]];
    if (!file) return playSentence(words, index + 1);

    loader.load(file, (gltf) => {
        if (!gltf.animations.length) {
            return playSentence(words, index + 1);
        }

        isPlaying = true;
        const clip = gltf.animations[0];
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

/* ------------------ SPEECH → SIGN ------------------ */
window.signWord = (input) => {
    if (!avatar || !mixer || isPlaying) return;

    const words = input
        .toLowerCase()
        .replace(/[^\w\s]/g, "")
        .split(/\s+/)
        .filter(w => SIGN_MAP[w]);

    if (!words.length) return;
    playSentence(words);
};

/* ------------------ RENDER LOOP ------------------ */
function animate() {
    requestAnimationFrame(animate);
    mixer.update(clock.getDelta());
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
