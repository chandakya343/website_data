// Global variables for Three.js setup
let container;
let camera, scene, renderer;
let uniforms;

// Variables for mouse speed tracking
let previousMouseX = 0;
let previousMouseY = 0;
let mouseSpeed = 0;
let lastMouseMoveTime = Date.now();

// Constants for speed limiting
const MAX_SPEED_FACTOR = 3.0;  // Maximum animation speed multiplier
const BASE_SPEED = 0.05;       // Base animation speed
const SPEED_DECAY = 0.95;      // How quickly speed decays when mouse stops
const SPEED_SMOOTHING = 0.5;   // How smooth the speed changes are (0-1)

function init() {
    // Get the container element
    container = document.getElementById('shader-container');

    // Setup camera
    camera = new THREE.Camera();
    camera.position.z = 1;

    // Create scene
    scene = new THREE.Scene();
    
    // Create plane geometry that fills screen
    const geometry = new THREE.PlaneBufferGeometry(2, 2);

    // Setup uniforms for shader
    uniforms = {
        u_time: { type: "f", value: 1.0 },
        u_resolution: { type: "v2", value: new THREE.Vector2() },
        u_mouse: { type: "v2", value: new THREE.Vector2() }
    };
    
    // Create shader material
    const material = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: `
            void main() {
                gl_Position = vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform vec2 u_resolution;
            uniform float u_time;
            
            const int octaves = 6;
            const float seed = 43758.5453123;
            const float seed2 = 73156.8473192;
            
            vec2 random2(vec2 st, float seed) {
                st = vec2(dot(st,vec2(127.1,311.7)),
                          dot(st,vec2(269.5,183.3)));
                return -1.0 + 2.0*fract(sin(st)*seed);
            }
            
            float noise(vec2 st, float seed) {
                vec2 i = floor(st);
                vec2 f = fract(st);
                vec2 u = f*f*(3.0-2.0*f);
                return mix(mix(dot(random2(i + vec2(0.0,0.0), seed), f - vec2(0.0,0.0)),
                             dot(random2(i + vec2(1.0,0.0), seed), f - vec2(1.0,0.0)), u.x),
                         mix(dot(random2(i + vec2(0.0,1.0), seed), f - vec2(0.0,1.0)),
                             dot(random2(i + vec2(1.0,1.0), seed), f - vec2(1.0,1.0)), u.x), u.y);
            }
            
            float fbm1(in vec2 _st, float seed) {
                float v = 0.0;
                float a = 0.5;
                vec2 shift = vec2(100.0);
                mat2 rot = mat2(cos(0.5), sin(0.5),
                              -sin(0.5), cos(0.50));
                for (int i = 0; i < octaves; ++i) {
                    v += a * noise(_st, seed);
                    _st = rot * _st * 2.0 + shift;
                    a *= 0.4;
                }
                return v;
            }
            
            float pattern(vec2 uv, float seed, float time, inout vec2 q, inout vec2 r) {
                q = vec2(fbm1(uv + vec2(0.0,0.0), seed),
                        fbm1(uv + vec2(5.2,1.3), seed));
                r = vec2(fbm1(uv + 4.0*q + vec2(1.7 - time / 2.,9.2), seed),
                        fbm1(uv + 4.0*q + vec2(8.3 - time / 2.,2.8), seed));
                vec2 s = vec2(fbm1(uv + 4.0*r + vec2(21.7 - time / 2.,90.2), seed),
                            fbm1(uv + 4.0*r + vec2(80.3 - time / 2.,20.8), seed));
                vec2 t = vec2(fbm1(uv + 4.0*s + vec2(121.7 - time / 2.,90.2), seed),
                            fbm1(uv + 4.0*s + vec2(180.3 - time / 2.,20.8), seed));
                float rtn = fbm1(uv + 4.0*t, seed);
                rtn = clamp(rtn, 0., .5);
                return rtn;
            }

            void main() {
                vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;
                uv *= 1. + dot(uv, uv)*.3;
                
                float time = u_time / 20.;
                
                mat2 rot = mat2(cos(time), sin(time),
                              -sin(time), cos(time));
                uv = rot * uv;
                uv *= 1.4 + sin(time) * .3;
                uv.x -= time;
                
                vec2 q = vec2(0.,0.);
                vec2 r = vec2(0.,0.);
                
                vec3 colour = vec3(pattern(uv, seed, time, q, r));
                float QR = clamp(dot(q, r), -1., 1.);
                colour += vec3(
                    (q.x + q.y) + QR * 30., 
                    QR * 15., 
                    r.x * r.y + QR * 5.
                );
                colour += .1;
                colour = clamp(colour, 0.05, 1.);
                
                gl_FragColor = vec4(colour + (abs(colour) * .5), 1.);
            }
        `
    });
    
    // Create mesh and add to scene
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    
    // Setup renderer
    renderer = new THREE.WebGLRenderer();
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);
    
    // Setup event listeners
    onWindowResize();
    window.addEventListener('resize', onWindowResize, false);
    
    // Setup mouse movement handler
    document.onmousemove = function(e) {
        // Get current time for speed calculation
        const currentTime = Date.now();
        // Calculate time delta in seconds
        const timeDelta = (currentTime - lastMouseMoveTime) / 1000;
        
        // Calculate mouse movement distance
        const deltaX = e.pageX - previousMouseX;
        const deltaY = e.pageY - previousMouseY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        // Update mouse speed with smoothing
        mouseSpeed = mouseSpeed * SPEED_SMOOTHING + 
                    (distance / Math.max(timeDelta, 0.016)) * (1 - SPEED_SMOOTHING);
        
        // Update positions and time for next frame
        previousMouseX = e.pageX;
        previousMouseY = e.pageY;
        lastMouseMoveTime = currentTime;
        
        // Update uniform values
        uniforms.u_mouse.value.x = e.pageX;
        uniforms.u_mouse.value.y = e.pageY;
    }
}

function onWindowResize() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    uniforms.u_resolution.value.x = renderer.domElement.width;
    uniforms.u_resolution.value.y = renderer.domElement.height;
}

function animate() {
    requestAnimationFrame(animate);
    render();
}

function render() {
    // Calculate speed factor with maximum limit
    const speedFactor = Math.min(MAX_SPEED_FACTOR, 
                               Math.max(1, 1 + (mouseSpeed / 1000)));
    
    // Update time uniform with limited speed
    uniforms.u_time.value += BASE_SPEED * speedFactor;
    
    // Decay mouse speed
    mouseSpeed *= SPEED_DECAY;
    
    // Render the scene
    renderer.render(scene, camera);
}

// Start the animation
init();
animate();