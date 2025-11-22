#version 300 es

precision mediump float;

in vec4 a_position;
in vec4 a_normal;

uniform mat4 u_model_view;
uniform mat4 u_projection;
uniform mat4 u_normals;

struct LightInfo {
    vec3 ambient;
    vec3 diffuse;
    vec3 specular;
    vec4 position;
    vec3 direction; 
    float cutoff;
    float aperture;
};
uniform LightInfo u_light;

// Variáveis para passar ao frag shader (varyings)
out vec3 v_normal;
out vec3 v_light;
out vec3 v_viewer;

void main() {
    // Calcula posição do vértice (ponto) no referencial da camera (aula 21)
    // mView * mModel * a_position (referencial do obj) -> refencial camera
    // usuario pode alterar a_position no js
    vec3 posC = (u_model_view * a_position).xyz;

    // Calcula vetor Normal (N) 
    v_normal = (u_normals * a_normal).xyz;

    // Calcula vetor Light (L) 
    if (u_light.position.w == 0.0) 
        v_light = normalize(u_light.position.xyz);
    else 
        v_light = normalize(u_light.position.xyz - posC);

    // Calcula vetor View (V)
    // Como estamos no referencial da camera (olho em 0,0,0), V aponta da superfície para a origem
    // Exemplo no slide 4 (aula 21)
    v_viewer = -posC; //  (Projeção Perspectiva)

    // Posição final do vértice na tela
    gl_Position = u_projection * u_model_view * a_position;
}