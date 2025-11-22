#version 300 es

precision mediump float;

in vec3 v_normal;
in vec3 v_light;
in vec3 v_viewer;

out vec4 color;

struct MaterialInfo {
    vec3 Ka; // Ambiente 
    vec3 Kd; // Difusa 
    vec3 Ks; // Especular 
    float shininess; // "n" - Fórmula de Phong
};
uniform MaterialInfo u_material;

struct LightInfo {
    // variam de 0 a 255
    vec3 ambient;  
    vec3 diffuse;  
    vec3 specular; 
    vec4 position; 
    vec3 direction; // Direção para onde o spot aponta (em camera coords)
    float cutoff;   // Expoente de decaimento
    float aperture; // Ângulo de abertura (cosseno) 
};
uniform LightInfo u_light; // Por enquanto uma luz só, depois virará array u_lights[]

void main() {
    vec3 N = normalize(v_normal);
    vec3 L = normalize(v_light);
    vec3 V = normalize(v_viewer);
    // Vetor Halfway ou Reflexão (Phong)
    // slide usa H = L + V 
    vec3 H = normalize(L + V);

    // Converter de 0 a 255 para 0 a 1
    // O dat.gui manda 0-255, mas a luz calcula com 0.0-1.0
    vec3 matAmb = u_material.Ka / 255.0;
    vec3 matDif = u_material.Kd / 255.0;
    vec3 matSpe = u_material.Ks / 255.0;

    vec3 lightAmb = u_light.ambient / 255.0;
    vec3 lightDif = u_light.diffuse / 255.0;
    vec3 lightSpe = u_light.specular / 255.0;

    // Ambiente
    vec3 ambient = lightAmb * matAmb;

    // Difusa 
    float diffuseFactor = max(dot(L, N), 0.0);
    vec3 diffuse = diffuseFactor * (lightDif * matDif);

    // Especular
    float specularFactor = 0.0;
    if (diffuseFactor > 0.0) {
        specularFactor = pow(max(dot(N, H), 0.0), u_material.shininess);
    }
    vec3 specular = specularFactor * (lightSpe * matSpe);

    // Só aplica se a luz for pontual (w=1). Se for direcional (w=0), ignora spot.
    if (u_light.position.w == 1.0) {
        // Vetor D, na qual, é a direção do spot (normalizada)
        vec3 D = normalize(u_light.direction);
        
        // Cosseno do ângulo entre o vetor da luz (-L) e a direção do spot (D)
        // L aponta DO ponto PARA a luz e -L aponta DA luz PARA o ponto.
        float spotCos = dot(-L, D);

        // Se estiver dentro do cone (cosseno maior que abertura)
        if (spotCos > u_light.aperture) {
            // Fator de atenuação suave nas bordas
            float spotFactor = pow(spotCos, u_light.cutoff);
            
            diffuse *= spotFactor;
            specular *= spotFactor;
        
        } else {
            // Fora do cone -> sem luz direta
            diffuse = vec3(0.0);
            specular = vec3(0.0);
        }
    }

    color = vec4(ambient + diffuse + specular, 1.0);
}