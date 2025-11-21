#version 300 es

precision mediump float;

in vec3 v_normal;
in vec3 v_light;
in vec3 v_viewer;

out vec4 color;

// Propriedades do Material 
const vec3 materialAmb = vec3(1.0, 0.0, 0.0); // Vermelho
const vec3 materialDif = vec3(1.0, 0.0, 0.0);
const vec3 materialSpe = vec3(1.0, 1.0, 1.0);
const float shininess = 6.0;

// Propriedades da Luz 
const vec3 lightAmb = vec3(0.2, 0.2, 0.2);
const vec3 lightDif = vec3(0.7, 0.7, 0.7);
const vec3 lightSpe = vec3(1.0, 1.0, 1.0);

void main() {
    // Renormalizar os vetores após a interpolação 
    vec3 N = normalize(v_normal);
    vec3 L = normalize(v_light);
    vec3 V = normalize(v_viewer);
    
    // Vetor Halfway ou Reflexão (Phong)
    // slide usa H = L + V 
    vec3 H = normalize(L + V);

    // Cálculo das cores bases
    vec3 ambientColor = lightAmb * materialAmb;
    vec3 diffuseColor = lightDif * materialDif;
    vec3 specularColor = lightSpe * materialSpe;

    // Difusa 
    float diffuseFactor = max(dot(L, N), 0.0);
    vec3 diffuse = diffuseFactor * diffuseColor;

    // Especular
    float specularFactor = 0.0;
    if (diffuseFactor > 0.0) {
        specularFactor = pow(max(dot(N, H), 0.0), shininess);
    }
    vec3 specular = specularFactor * specularColor;

    // Cor final
    color = vec4(ambientColor + diffuse + specular, 1.0);
}