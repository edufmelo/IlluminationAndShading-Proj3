#version 300 es

in vec4 a_position;
in vec4 a_normal;

// Matrizes Uniformes 
uniform mat4 u_model_view;
uniform mat4 u_projection;
uniform mat4 u_normals;

// Variáveis para passar ao Fragment Shader (Varyings)
out vec3 v_normal;
out vec3 v_light;
out vec3 v_viewer;

// Posição da luz (Em coord da camera)
const vec4 lightPosition = vec4(0.0, 1.8, 1.3, 1.0); 

void main() {
    // Calcula posição do vértice (ponto) no referencial da camera (aula 21)
    // mView * mModel * a_position (referencial do obj) -> refencial camera
    // usuario pode alterar a_position no js
    vec3 posC = (u_model_view * a_position).xyz;

    // Calcula vetor Normal (N) 
    v_normal = (u_normals * a_normal).xyz;

    // Calcula vetor Light (L) 
    if (lightPosition.w == 0.0) 
        v_light = normalize(lightPosition.xyz);
    else 
        v_light = normalize(lightPosition.xyz - posC);

    // Calcula vetor View (V)
    // Como estamos no referencial da camera (olho em 0,0,0), V aponta da superfície para a origem
    // Exemplo no slide 4 (aula 21)
    v_viewer = -posC; //  (Projeção Perspectiva)

    // Posição final do vértice na tela
    gl_Position = u_projection * u_model_view * a_position;
}