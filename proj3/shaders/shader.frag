#version 300 es

precision mediump float;

in vec3 v_normal;

const int MAX_LIGHTS = 8;

struct LightInfo {
    // Light colour intensities
    vec3 ambient;
    vec3 diffuse;
    vec3 specular;

    // Light geometry
    vec4 position;  // Position/direction of light (in camera coordinates)
    // ...
    //   additional fields
    // ...
};

struct MaterialInfo {
    vec3 Ka;
    vec3 Kd;
    vec3 Ks;
    float shininess;
};

uniform bool u_use_normals;
uniform int u_n_lights; // Effective number of lights used

uniform LightInfo u_lights[MAX_LIGHTS]; // The array of lights present in the scene
uniform MaterialInfo u_material;        // The material of the object being drawn

out vec4 color;

void main() {
    vec3 c = vec3(1.0f, 1.0f, 1.0f);

    if(u_use_normals)
        c = 0.5f * (v_normal + vec3(1.0f, 1.0f, 1.0f));

    color = vec4(c, 1.0f);
}
