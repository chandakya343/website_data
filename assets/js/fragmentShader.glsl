// Place your fragment shader code here
// Make sure to adjust any paths or uniforms as needed
// Copy the code from your original HTML <script> tag
uniform vec2 u_resolution;
uniform vec4 u_mouse;
uniform float u_time;
uniform sampler2D u_noise;
uniform sampler2D u_buffer;
uniform bool u_renderpass;
uniform int u_frame;

#define PI 3.141592653589793
#define TAU 6.283185307179586

const float multiplier = 25.5;

const float zoomSpeed = 3.;
const int layers = 5;

mat2 rotate2d(float _angle){
    return mat2(cos(_angle),sin(_angle),
                -sin(_angle),cos(_angle));
}

vec2 hash2(vec2 p)
{
  vec2 o = texture2D( u_noise, (p+0.5)/256.0, -100.0 ).xy;
  return o;
}

vec3 hsb2rgb( in vec3 c ){
  vec3 rgb = clamp(abs(mod(c.x*6.0+vec3(0.0,4.0,2.0),
                           6.0)-3.0)-1.0,
                   0.0,
                   1.0 );
  rgb = rgb*rgb*(3.0-2.0*rgb);
  return c.z * mix( vec3(1.0), rgb, c.y);
}

vec3 domain(vec2 z){
  return vec3(hsb2rgb(vec3(atan(z.y,z.x)/TAU,1.,1.)));
}
vec3 colour(vec2 z) {
    return domain(z);
}

// The render function is where we render the pattern to be added to the layer
vec3 render(vec2 uv, float scale) {
  vec2 id = floor(uv);
  vec2 subuv = fract(uv);
  vec2 rand = hash2(id);
  float bokeh = abs(scale) * 1.;

  float particle = 0.;

  if(length(rand) > 1.3) {
    vec2 pos = subuv-.5;
    float field = length(pos);
    particle = smoothstep(.7, 0., field);
    particle += smoothstep(.2, 0.2 * bokeh, field);
  }
  return vec3(particle*2.);
}

vec3 renderLayer(int layer, int layers, vec2 uv, inout float opacity) {
  vec2 _uv = uv;
  float scale = mod((u_time + zoomSpeed / float(layers) * float(layer)) / zoomSpeed, -1.);
  uv *= 20.;
  uv *= scale*scale;
  uv = rotate2d(u_time / 10.) * uv;
  uv += vec2(25. + sin(u_time*.1)*.2) * float(layer);

  vec3 pass = render(uv * multiplier, scale) * .2;

  opacity = 1. + scale;
  float _opacity = opacity;

  float endOpacity = smoothstep(0., 0.4, scale * -1.);
  opacity += endOpacity;

  return pass * _opacity * endOpacity;
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.y, u_resolution.x);
  vec2 sample = gl_FragCoord.xy / u_resolution.xy;

  vec4 fragcolour;

  if(u_renderpass == true) {

    if(u_frame > 5) {
      fragcolour = texture2D(u_buffer, sample) * 6.;
    }

    uv *= rotate2d(u_time*.5);

    float opacity = 1.;
    float opacity_sum = 1.;

    for(int i = 1; i <= layers; i++) {
      fragcolour += clamp(vec4(renderLayer(i, layers, uv, opacity), 1.) * 5., 0., 5.);
      opacity_sum += opacity;
    }

    fragcolour *= 1./opacity_sum;
  } else {
    fragcolour = texture2D(u_buffer, sample) * 5.;
  }

  gl_FragColor = fragcolour;
}
