import * as THREE from "three";
//import Stats from 'three/examples/jsm/libs/stats.module'
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
const scene = new THREE.Scene();

//const gridHelper = new THREE.GridHelper(10, 10, 0xaec6cf, 0xaec6cf);
//scene.add(gridHelper);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

const renderer = new THREE.WebGLRenderer( { antialias: true, alpha: true } );
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

//const geometry = new THREE.BoxGeometry()
//const material = new THREE.MeshBasicMaterial({
//    color: 0x00ff00,
//    wireframe: true,
//})
//
//const cube = new THREE.Mesh(geometry, material)
//cube.position.set(0, 0.5, -10)
//scene.add(cube)
const sectionCount = document.querySelectorAll("section").length
const sectionheight = 100/ (sectionCount-1)


let model: THREE.Object3D;
const modelGroup = new THREE.Group()
const loader = new GLTFLoader();
loader.load(
  "assets/Jake.glb",
  (gltf) => {
    const originalModel = gltf.scene

    // Compute the bounding box to get height
    const bbox = new THREE.Box3().setFromObject(originalModel)
    const center = new THREE.Vector3()
    const size = new THREE.Vector3()
    bbox.getCenter(center)
    bbox.getSize(size)
    // Create a container and offset the model upward
    model = new THREE.Object3D()
    originalModel.position.y = -center.y // shift model to centre around its centre
    model.add(originalModel)

    // Place the container in the scene
    model.position.set(0, 0, 10)
    model.scale.set(10, 10, 10)
    scene.add(model)
  },
  undefined,
  (error) => {
    console.error("Error loading GLTF model:", error);
  }
);


const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(5, 10, 7.5);
scene.add(directionalLight);

const mouse = new THREE.Vector2();
const target3D = new THREE.Vector3();

document.addEventListener("mousemove", (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
});

window.addEventListener("resize", onWindowResize, false);
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  render();
}

/* Liner Interpolation
 * lerp(min, max, ratio)
 * eg,
 * lerp(20, 60, .5)) = 40
 * lerp(-20, 60, .5)) = 20
 * lerp(20, 60, .75)) = 50
 * lerp(-20, -10, .1)) = -.19
 */
function lerp(x: number, y: number, a: number): number {
  return (1 - a) * x + a * y;
}

// Used to fit the lerps to start and end at specific scrolling percentages
function scalePercent(start: number, end: number) {
  return (scrollPercent - start) / (end - start);
}

const animationScripts: { start: number; end: number; func: () => void }[] = [];


//add an animation that moves the cube through first 40 percent of scroll
animationScripts.push({
  start: 0,
  end: sectionheight,
  func: () => {
    camera.lookAt(modelGroup.position);
    camera.position.set(0, 1, 2);
    model.position.z = lerp(-10, -5, scalePercent(0, 40));
    model.position.x = lerp(0, -5, scalePercent(0, 40));
    model.position.y = lerp(-5, 0, scalePercent(0, 40));

    // Convert mouse to 3D world space at z = 0 plane
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    raycaster.ray.at(5, target3D); // adjust depth as needed

    // Rotate model to look at the point
    model.lookAt(target3D);
  },
});

//add an animation that rotates the cube between 40-60 percent of scroll
animationScripts.push({
  start: 2*(sectionheight)-1,
  end: 3*(sectionheight),
  func: () => {
    camera.lookAt(model.position);
    camera.position.set(0, 1, 2);
    model.rotation.z = lerp(0, Math.PI, scalePercent(40, 60));
    //console.log(cube.rotation.z)
  },
});

//add an animation that moves the camera between 60-80 percent of scroll
animationScripts.push({
  start: 3*(sectionheight)-1,
  end: 4*(sectionheight),
  func: () => {
    //camera.position.x = lerp(0, 5, scalePercent(60, 80));
    //camera.position.y = lerp(1, 5, scalePercent(60, 80));
    camera.position.y = lerp(0, -11, scalePercent(3*(sectionheight)-1, 4*(sectionheight)));
    //camera.lookAt(model.position);
    //console.log(camera.position.x + " " + camera.position.y)
  },
});

//add an animation that auto rotates the cube from 80 percent of scroll
animationScripts.push({
  start: 4*(sectionheight)-1,
  end: 101,
  func: () => {
    //auto rotate
    model.rotation.x += 0.01;
    model.rotation.y += 0.01;
  },
});

function playScrollAnimations() {
  animationScripts.forEach((a) => {
    if (scrollPercent >= a.start && scrollPercent < a.end) {
      a.func();
    }
  });
}

let scrollPercent = 0;

document.body.onscroll = () => {
  //calculate the current scroll progress as a percentage
  scrollPercent =
    ((document.documentElement.scrollTop || document.body.scrollTop) /
      ((document.documentElement.scrollHeight || document.body.scrollHeight) -
        document.documentElement.clientHeight)) *
    100;
  (document.getElementById("scrollProgress") as HTMLDivElement).innerText =
    "Scroll Progress : " + scrollPercent.toFixed(2);
};

//const stats = new Stats()
//document.body.appendChild(stats.dom)

function animate() {
  requestAnimationFrame(animate);

  playScrollAnimations();

  render();

  //stats.update()
}

let scrollTimeout: number | null = null;

function autoScrollToNearestSection() {
  const sections = Array.from(document.querySelectorAll("section"));
  const scrollTop = window.scrollY;
  const viewportHeight = window.innerHeight;

  // Find the closest section based on scroll position
  const nearestSection = sections.reduce(
    (closest, section) => {
      const offsetTop = section.offsetTop;
      const distance = Math.abs(offsetTop - scrollTop);
      if (distance < Math.abs(closest.offsetTop - scrollTop)) {
        return { section, offsetTop };
      }
      return closest;
    },
    { section: sections[0], offsetTop: sections[0].offsetTop }
  );

  // Smooth scroll to that section
  window.scrollTo({
    top: nearestSection.offsetTop,
    behavior: "smooth",
  });
}
(window as any).scrollToSection = (index: number) => {
  const sections = document.querySelectorAll("section");
  if (index >= 0 && index < sections.length) {
    const top = sections[index].offsetTop;
    window.scrollTo({
      top,
      behavior: "smooth",
    });
  }
};
// Listen for scroll, then trigger auto-scroll when user stops
window.addEventListener("scroll", () => {
  if (scrollTimeout !== null) {
    clearTimeout(scrollTimeout);
  }

  scrollTimeout = window.setTimeout(() => {
    autoScrollToNearestSection();
  }, 200); // wait 200ms after last scroll
});

function render() {
  renderer.render(scene, camera);
}

window.scrollTo({ top: 0, behavior: "smooth" });
animate();
