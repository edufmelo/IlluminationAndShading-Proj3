#version 300 es

precision mediump float;
precision mediump int;

in vec3 v_normal;
in vec3 v_viewer;
in vec3 v_color;
out vec4 color;

const int MAX_LIGHTS = 3;

struct MaterialInfo {
    vec3 Ka; // Ambiente 
    vec3 Kd; // Difusa 
    vec3 Ks; // Especular 
    float shininess; // "n" - Fórmula de Phong
};

uniform MaterialInfo u_material;
uniform int u_shading_mode; // 0 = Phong, 1 = Gouraud

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
uniform LightInfo u_lights[MAX_LIGHTS]; 
uniform int u_n_lights;

void main() {
    if(u_shading_mode == 0){
        vec3 N = normalize(v_normal);
        vec3 V = normalize(v_viewer);
        // Vetor Halfway ou Reflexão (Phong)
        // slide usa H = L + V 
        //vec3 H = normalize(L + V);

        // Converter de 0 a 255 para 0 a 1
        // O dat.gui manda 0-255, mas a luz calcula com 0.0-1.0
        vec3 matAmb = u_material.Ka / 255.0;
        vec3 matDif = u_material.Kd / 255.0;
        vec3 matSpe = u_material.Ks / 255.0;

        vec3 result = vec3(0.0);

        for (int i = 0; i < MAX_LIGHTS; i++) {
            if (i >= u_n_lights) break;
            vec3 L;
            if (u_lights[i].position.w == 0.0)
                L = normalize(u_lights[i].position.xyz);
            else
                L = normalize(u_lights[i].position.xyz + v_viewer);

            vec3 lightAmb = u_lights[i].ambient / 255.0;
            vec3 lightDif = u_lights[i].diffuse / 255.0;
            vec3 lightSpe = u_lights[i].specular / 255.0;

            //Ambiente
            vec3 ambient = lightAmb * matAmb;

            //Difusa
            float diffuseFactor = max(dot(L, N), 0.0);
            vec3 diffuse = diffuseFactor * (lightDif * matDif);

            vec3 H = normalize(L + V);

            //Especular
            float specularFactor = pow(max(dot(N,H), 0.0), u_material.shininess);
            vec3 specular = specularFactor * (lightSpe * matSpe); 
            
            // Só aplica se a luz for pontual (w=1). Se for direcional (w=0), ignora spot.
            if (u_lights[i].position.w == 1.0) {
                // Vetor D, na qual, é a direção do spot (normalizada)
                vec3 D = normalize(u_lights[i].direction);
                
                // Cosseno do ângulo entre o vetor da luz (-L) e a direção do spot (D)
                // L aponta DO ponto PARA a luz e -L aponta DA luz PARA o ponto.
                float spotCos = dot(-L, D);

                // Se estiver dentro do cone (cosseno maior que abertura)
                if (spotCos > u_lights[i].aperture) {
                    // Fator de atenuação suave nas bordas
                    float spotFactor = pow(spotCos, u_lights[i].cutoff);
                    
                    diffuse *= spotFactor;
                    specular *= spotFactor;
                
                } else {
                    // Fora do cone -> sem luz direta
                    diffuse = vec3(0.0);
                    specular = vec3(0.0);
                }
            }
            result += ambient + diffuse + specular;
        }

        color = vec4(result, 1.0);
    }
    if(u_shading_mode == 1){
        color = vec4(v_color, 1.0);
    }
    
}