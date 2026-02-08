import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

/* =========================================================
   SIGNORA – SPEECH TO SIGN AVATAR RENDERER
   (SEPARATE GLBs – BASE AVATAR IDLE ONLY)
   ========================================================= */

(() => {

console.log("script-avatar.js loaded");

/* ------------------ VARIABLES ------------------ */
let scene, camera, renderer, loader, clock;

// Base idle avatar
let idleAvatar = null;
let idleMixer = null;

// Active sign model
let activeModel = null;
let activeMixer = null;

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

    loadIdleAvatar();
    window.addEventListener("resize", onResize);
}

/* ------------------ LOAD BASE IDLE AVATAR ------------------ */
function loadIdleAvatar() {
    loader.load("/static/assets/avatar/myavatar.glb", (gltf) => {
        idleAvatar = gltf.scene;

        idleAvatar.position.set(0, -0.1, 0);
        idleAvatar.scale.set(1.2, 1.2, 1.2);

        idleMixer = new THREE.AnimationMixer(idleAvatar);
        scene.add(idleAvatar);

        document.getElementById("loading-text")?.remove();
        animate();
    });
}

/* ------------------ SIGN MAP (UNCHANGED) ------------------ */
const SIGN_MAP = {
  hello: "/static/assets/Animations/hello.glb",
  hi: "/static/assets/Animations/hello.glb",
  food: "/static/assets/Animations/eat.glb",
  eating: "/static/assets/Animations/eat.glb",

  namaste: "/static/assets/Animations/hello.glb",
  namaskar: "/static/assets/Animations/hello.glb",
  namaskaram: "/static/assets/Animations/hello.glb",
  vanakkam: "/static/assets/Animations/hello.glb",

  i: "/static/assets/Animations/I.glb",
  me: "/static/assets/Animations/me.glb",
  you: "/static/assets/Animations/you.glb",

  main: "/static/assets/Animations/I.glb",
  mujhe: "/static/assets/Animations/me.glb",
  mujhey: "/static/assets/Animations/me.glb",
  tum: "/static/assets/Animations/you.glb",
  aap: "/static/assets/Animations/you.glb",

  nenu: "/static/assets/Animations/I.glb",
  naaku: "/static/assets/Animations/me.glb",
  naku: "/static/assets/Animations/me.glb",
  nuvvu: "/static/assets/Animations/you.glb",
  meeru: "/static/assets/Animations/you.glb",

  naan: "/static/assets/Animations/I.glb",
  ennai: "/static/assets/Animations/me.glb",
  enakku: "/static/assets/Animations/me.glb",
  nee: "/static/assets/Animations/you.glb",
  neenga: "/static/assets/Animations/you.glb",

  please: "/static/assets/Animations/please.glb",
  sorry: "/static/assets/Animations/sorry.glb",
  thank: "/static/assets/Animations/thankyou.glb",
  thanks: "/static/assets/Animations/thankyou.glb",
  welcome: "/static/assets/Animations/welcome.glb",

  kripya: "/static/assets/Animations/please.glb",
  maaf: "/static/assets/Animations/sorry.glb",
  shukriya: "/static/assets/Animations/thankyou.glb",
  dhanyavaad: "/static/assets/Animations/thankyou.glb",
  swagat: "/static/assets/Animations/welcome.glb",

  daya: "/static/assets/Animations/please.glb",
  kshaminchandi: "/static/assets/Animations/sorry.glb",
  dhanyavadalu: "/static/assets/Animations/thankyou.glb",
  swagatham: "/static/assets/Animations/welcome.glb",

  thayavu: "/static/assets/Animations/please.glb",
  mannikkavum: "/static/assets/Animations/sorry.glb",
  nandri: "/static/assets/Animations/thankyou.glb",
  varaverppu: "/static/assets/Animations/welcome.glb",

  help: "/static/assets/Animations/help.glb",
  eat: "/static/assets/Animations/eat.glb",

  madad: "/static/assets/Animations/help.glb",
  khana: "/static/assets/Animations/eat.glb",

  sahayam: "/static/assets/Animations/help.glb",
  tinu: "/static/assets/Animations/eat.glb",
  tinnava: "/static/assets/Animations/eat.glb",

  udhavi: "/static/assets/Animations/help.glb",
  saapidu: "/static/assets/Animations/eat.glb",

  what: "/static/assets/Animations/what.glb",
  how: "/static/assets/Animations/how.glb",
  name: "/static/assets/Animations/name.glb",
  yes: "/static/assets/Animations/yes.glb",
  ok: "/static/assets/Animations/ok.glb",

  kya: "/static/assets/Animations/what.glb",
  kaise: "/static/assets/Animations/how.glb",
  naam: "/static/assets/Animations/name.glb",
  haan: "/static/assets/Animations/yes.glb",
  theek: "/static/assets/Animations/ok.glb",

  emi: "/static/assets/Animations/what.glb",
  ela: "/static/assets/Animations/how.glb",
  peru: "/static/assets/Animations/name.glb",
  avunu: "/static/assets/Animations/yes.glb",
  sare: "/static/assets/Animations/ok.glb",

  enna: "/static/assets/Animations/what.glb",
  eppadi: "/static/assets/Animations/how.glb",
  peyar: "/static/assets/Animations/name.glb",
  aam: "/static/assets/Animations/yes.glb",
  seri: "/static/assets/Animations/ok.glb"
};

/* ------------------ PLAY SENTENCE (SEQUENTIAL GLBs) ------------------ */
function playSentence(words, index = 0) {
    if (index >= words.length) {
        if (activeModel) {
            scene.remove(activeModel);
            activeModel = null;
            activeMixer = null;
        }
        scene.add(idleAvatar);
        return;
    }

    const file = SIGN_MAP[words[index]];
    if (!file) {
        playSentence(words, index + 1);
        return;
    }

    scene.remove(idleAvatar);

    loader.load(file, (gltf) => {
        activeModel = gltf.scene;
        activeModel.position.set(0, -0.1, 0);
        activeModel.scale.set(1.2, 1.2, 1.2);

        activeMixer = new THREE.AnimationMixer(activeModel);
        scene.add(activeModel);

        const clip = gltf.animations[0];
        if (!clip) {
            scene.remove(activeModel);
            playSentence(words, index + 1);
            return;
        }

        const action = activeMixer.clipAction(clip);
        action.setLoop(THREE.LoopOnce);
        action.clampWhenFinished = true;
        action.play();

        setTimeout(() => {
            scene.remove(activeModel);
            activeModel = null;
            activeMixer = null;
            playSentence(words, index + 1);
        }, clip.duration * 1000);
    });
}

/* ------------------ SPEECH → SIGN ------------------ */
window.signWord = (input) => {
    if (!idleAvatar) return;

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
    const delta = clock.getDelta();

    if (activeMixer) activeMixer.update(delta);
    else if (idleMixer) idleMixer.update(delta);

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
