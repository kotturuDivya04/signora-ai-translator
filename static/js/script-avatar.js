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
  hello: "/static/assets/animations/hello.glb",
  hi: "/static/assets/animations/hello.glb",
  namaste: "/static/assets/animations/hello.glb",
  namaskar: "/static/assets/animations/hello.glb",
  namaskaram: "/static/assets/animations/hello.glb",
  vanakkam: "/static/assets/animations/hello.glb",

  // Pronouns
  i: "/static/assets/animations/I.glb",
  me: "/static/assets/animations/me.glb",
  you: "/static/assets/animations/you.glb",
  main: "/static/assets/animations/I.glb",
  mujhe: "/static/assets/animations/me.glb",
  tum: "/static/assets/animations/you.glb",
  aap: "/static/assets/animations/you.glb",
  nenu: "/static/assets/animations/I.glb",
  naaku: "/static/assets/animations/me.glb",
  nuvvu: "/static/assets/animations/you.glb",
  naan: "/static/assets/animations/I.glb",
  ennai: "/static/assets/animations/me.glb",
  nee: "/static/assets/animations/you.glb",

  // Actions
  help: "/static/assets/animations/help.glb",
  madad: "/static/assets/animations/help.glb",
  sahayam: "/static/assets/animations/help.glb",
  udhavi: "/static/assets/animations/help.glb",

  eat: "/static/assets/animations/eat.glb",
  food: "/static/assets/animations/eat.glb",
  eating: "/static/assets/animations/eat.glb",
  khana: "/static/assets/animations/eat.glb",
  tinu: "/static/assets/animations/eat.glb",
  saapidu: "/static/assets/animations/eat.glb",

  // Polite
  please: "/static/assets/animations/please.glb",
  sorry: "/static/assets/animations/sorry.glb",
  thank: "/static/assets/animations/thankyou.glb",
  thanks: "/static/assets/animations/thankyou.glb",
  welcome: "/static/assets/animations/welcome.glb",

  // Questions
  what: "/static/assets/animations/what.glb",
  how: "/static/assets/animations/how.glb",
  name: "/static/assets/animations/name.glb",
  yes: "/static/assets/animations/yes.glb",
  ok: "/static/assets/animations/ok.glb",

  kya: "/static/assets/animations/what.glb",
  kaise: "/static/assets/animations/how.glb",
  naam: "/static/assets/animations/name.glb",
  haan: "/static/assets/animations/yes.glb",

  emi: "/static/assets/animations/what.glb",
  ela: "/static/assets/animations/how.glb",
  peru: "/static/assets/animations/name.glb",

  enna: "/static/assets/animations/what.glb",
  eppadi: "/static/assets/animations/how.glb",
  peyar: "/static/assets/animations/name.glb"
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
