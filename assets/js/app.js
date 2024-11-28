let container;
let camera, scene, renderer;
let uniforms;

let divisor = 1 / 8;
let textureFraction = 1 / 1;

let w = window.innerWidth;
let h = window.innerHeight * 0.25; // Adjust height if needed

let newmouse = { x: 0, y: 0 };

let loader = new THREE.TextureLoader();
let texture, rtTexture, rtTexture2;
loader.setCrossOrigin("anonymous");
loader.load(
  'https://s3-us-west-2.amazonaws.com/s.cdpn.io/982762/noise.png',
  function (tex) {
    texture = tex;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.minFilter = THREE.LinearFilter;
    init();
    animate();
  }
);

function init() {
  container = document.getElementById('container');

  camera = new THREE.Camera();
  camera.position.z = 1;

  scene = new THREE.Scene();

  var geometry = new THREE.PlaneBufferGeometry(2, 2);

  rtTexture = new THREE.WebGLRenderTarget(w * textureFraction, h * textureFraction);
  rtTexture2 = new THREE.WebGLRenderTarget(w * textureFraction, h * textureFraction);

  uniforms = {
    u_time: { type: "f", value: 1.0 },
    u_resolution: { type: "v2", value: new THREE.Vector2(w, h) },
    u_noise: { type: "t", value: texture },
    u_buffer: { type: "t", value: rtTexture.texture },
    u_mouse: { type: "v3", value: new THREE.Vector3() },
    u_frame: { type: "i", value: -1 },
    u_renderpass: { type: 'b', value: false }
  };

  var material = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: document.getElementById('vertexShader').textContent,
    fragmentShader: document.getElementById('fragmentShader').textContent
  });
  material.extensions.derivatives = true;

  var mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  renderer = new THREE.WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(w, h);

  container.appendChild(renderer.domElement);

  window.addEventListener('resize', onWindowResize, false);

  document.addEventListener('pointermove', (e) => {
    let ratio = h / w;
    if (h > w) {
      newmouse.x = (e.pageX - w / 2) / w;
      newmouse.y = (e.pageY - h / 2) / h * -1 * ratio;
    } else {
      newmouse.x = (e.pageX - w / 2) / w / ratio;
      newmouse.y = (e.pageY - h / 2) / h * -1;
    }
    e.preventDefault();
  });
}

function onWindowResize(event) {
  w = window.innerWidth;
  h = window.innerHeight * 0.25; // Adjust height if needed

  renderer.setSize(w, h);
  uniforms.u_resolution.value.x = renderer.domElement.width;
  uniforms.u_resolution.value.y = renderer.domElement.height;

  uniforms.u_frame.value = 0;

  rtTexture = new THREE.WebGLRenderTarget(w * textureFraction, h * textureFraction);
  rtTexture2 = new THREE.WebGLRenderTarget(w * textureFraction, h * textureFraction);
}

function animate(delta) {
  requestAnimationFrame(animate);
  render(delta);
}

function renderTexture(delta) {
  let odims = uniforms.u_resolution.value.clone();
  uniforms.u_resolution.value.x = w * textureFraction;
  uniforms.u_resolution.value.y = h * textureFraction;

  uniforms.u_buffer.value = rtTexture2.texture;
  uniforms.u_renderpass.value = true;

  renderer.setRenderTarget(rtTexture);
  renderer.render(scene, camera, rtTexture, true);

  let buffer = rtTexture;
  rtTexture = rtTexture2;
  rtTexture2 = buffer;

  uniforms.u_buffer.value = rtTexture.texture;
  uniforms.u_resolution.value = odims;
  uniforms.u_renderpass.value = false;
}

function render(delta) {
  uniforms.u_frame.value++;

  uniforms.u_mouse.value.x += (newmouse.x - uniforms.u_mouse.value.x) * divisor;
  uniforms.u_mouse.value.y += (newmouse.y - uniforms.u_mouse.value.y) * divisor;

  uniforms.u_time.value = delta * 0.0005;
  renderer.render(scene, camera);
  renderTexture();
}
