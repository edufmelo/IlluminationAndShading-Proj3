import { buildProgramFromSources, loadShadersFromURLS, setupWebGL } from '../../libs/utils.js';
import { length, flatten, inverse, mult, normalMatrix, perspective, lookAt, vec4, vec3, vec2, subtract, add, scale, rotate, normalize } from '../../libs/MV.js';

import * as dat from '../../libs/dat.gui.module.js'; // coisas do view eye

import * as CUBE from '../../libs/objects/cube.js';
import * as BUNNY from '../../libs/objects/bunny.js';
import * as TORUS from '../../libs/objects/torus.js';
import * as CYLINDER from '../../libs/objects/cylinder.js';

import * as STACK from '../../libs/stack.js';

function setup(shaders) {
    const canvas = document.getElementById('gl-canvas');
    const gl = setupWebGL(canvas);
    
    CUBE.init(gl);
    TORUS.init(gl);
    BUNNY.init(gl);
    CYLINDER.init(gl);

    const program = buildProgramFromSources(gl, shaders['shader.vert'], shaders['shader.frag']);

    // Camera  
    let camera = {
        eye: vec3(2, 4, 11),
        at: vec3(0, 0, 0),
        up: vec3(0, 1, 0),
        fovy: 55,
        aspect: 1,
        near: 0.1,
        far: 30
    }

    let options = {
        wireframe: false,
        backfaceCulling: true,
        depthTest: true
    }

    // Material interativo para Bunny
    let material = {
        Ka: vec3(55, 45, 45),   
        Kd: vec3(220, 180, 180),  
        Ks: vec3(255, 255, 255),  // Brilho branco intenso
        shininess: 150 
    }

    // Materiais fixos (Outros objetos)
    const materialBase = {
        Ka: vec3(191,169,81),
        Kd: vec3(180, 140, 100),  
        Ks: vec3(50, 50, 50),
        shininess: 10
    };

    const materialTorus = {
        Ka: vec3(10, 40, 10),
        Kd: vec3(50, 200, 50),   
        Ks: vec3(255, 255, 255),  
        shininess: 100
    };

    const materialCylinder = {
        Ka: vec3(128,0,128),
        Kd: vec3(40, 120, 100),   
        Ks: vec3(150, 150, 150),  
        shininess: 80
    };

    const materialCube = {
        Ka: vec3(50, 20, 20),
        Kd: vec3(200, 80, 80),    
        Ks: vec3(200, 200, 200),
        shininess: 60
    };

    let shading = { mode: 0 }; // 0 = Phong, 1 = Gouraud
    const gui = new dat.GUI();

    const optionsGui = gui.addFolder("options");
    optionsGui.add(options, "wireframe");
    optionsGui.add(options, "backfaceCulling").name("Backface Culling:");
    optionsGui.add(options, "depthTest").name("Depth Test:");

    const cameraGui = gui.addFolder("camera");

    const cameraControls = { reset: resetCamera };
    cameraGui.add(cameraControls, "reset").name("Reset Camera");

    cameraGui.add(camera, "fovy").min(1).max(100).step(1).listen();

    cameraGui.add(camera, "near").min(0.1).max(20).step(0.01).listen().onChange(function (v) {
        camera.near = Math.min(camera.far - 0.5, v);
    });

    cameraGui.add(camera, "far").min(0.1).max(40).step(0.01).listen().onChange(function (v) {
        camera.far = Math.max(camera.near + 0.5, v);
    });

    function getForward() {
        return normalize(subtract(camera.at, camera.eye));
    }

    function getUp(){
        return normalize(camera.up);
    }

    function getRight() {
        const forward = getForward();
        return normalize(vec3(
            forward[2], 
            0,
        -forward[0]
        ));
    }

    let keys = {};

    window.addEventListener("keydown", e => keys[e.key] = true);
    window.addEventListener("keyup",   e => keys[e.key] = false);

    const eye = cameraGui.addFolder("eye");
    eye.add(camera.eye, 0).min(-20).max(20).step(1).listen();
    eye.add(camera.eye, 1).min(-20).max(20).step(1).listen();
    eye.add(camera.eye, 2).min(-20).max(20).step(1).listen();

    const at = cameraGui.addFolder("at");
    at.add(camera.at, 0).min(-20).max(20).step(1).listen();
    at.add(camera.at, 1).min(-20).max(20).step(1).listen();
    at.add(camera.at, 2).min(-20).max(20).step(1).listen();

    const up = cameraGui.addFolder("up");
    up.add(camera.up, 0).min(-20).max(20).step(1).listen();
    up.add(camera.up, 1).min(-1).max(1).step(1).listen();
    up.add(camera.up, 2).min(-20).max(20).step(1).listen();

    let lights = [];

    // Pasta para lights
    const lightsGui = gui.addFolder("lights");
    function createDefaultLight() {
        return {
            active: true, // utilizado para on/off da light
            type: "Spotlight", // luz inicial
            position: { x: 0, y: 5, z: 10, w: 1 },
            intensities: {
                ambient: vec3(120,120,120),
                diffuse: vec3(255,255,255),
                specular: vec3(200,200,200)
            },
            axis: { x: 0, y: -1, z: -1.7 },  // spotlight direction
            spotInfo: {
                aperture: 15,
                cutoff: 25
            }
        };
    }
    
    const MAX_LIGHTS = 3;
    const addButton = { addLight: function() {
        if (lights.length < MAX_LIGHTS) {
            lights.push(createDefaultLight());
            rebuildLightsGUI();
        } else {
            alert("Maximum of 3 lights reached!"); 
        }
    }};

    lightsGui.add(addButton, "addLight").name("Add Light");

    const removeButton = { removeLight: function() {
        // Verifica se existem luzes para remover (minimo 1)
        if (lights.length > 1) {
            lights.pop(); // Remove a última luz do array
            rebuildLightsGUI(); // Reconstrói o menu
        } else {
            alert("No lights to remove.");
        }
    }};

    lightsGui.add(removeButton, "removeLight").name("Remove Light");

    gui.add(shading, "mode", { Phong:0.0, Gouraud:1.0 });

    function rebuildLightsGUI() {
        if (lightsGui.__folders) {
            for (let key of Object.keys(lightsGui.__folders)) {
                lightsGui.removeFolder(lightsGui.__folders[key]);
            }
        }

        lights.forEach((light, idLight) => {
            const f = lightsGui.addFolder("Light " + idLight);

            f.add(light, "active").name("On/Off");

            // OnChange para atualizar pasta axis, já que só será usada em Spotlight
            f.add(light, "type", ["Spotlight", "Point", "Directional"])
            .name("Type")
            .onChange(function() {
                 rebuildLightsGUI();
             });;

            const positionGui = f.addFolder("position");
            positionGui.add(light.position, "x");
            positionGui.add(light.position, "y");
            positionGui.add(light.position, "z");

            const intensitiesGui = f.addFolder("intensities");
            intensitiesGui.addColor(light.intensities, "ambient");
            intensitiesGui.addColor(light.intensities, "diffuse");
            intensitiesGui.addColor(light.intensities, "specular");

            if (light.type == "Spotlight") {
                // axis representa a direção do holofote, logo, somente no spotlight
                const axisGui = f.addFolder("axis");
                axisGui.add(light.axis, "x");
                axisGui.add(light.axis, "y");
                axisGui.add(light.axis, "z");
                f.add(light.spotInfo, "aperture").min(0).max(180);
                // atenua intensidade ao se afastar
                f.add(light.spotInfo, "cutoff").min(0).max(100);
            }

            f.open();
        });
    }

    lights.push(createDefaultLight());
    rebuildLightsGUI();

    const materialGui = gui.addFolder("material (bunny)");
    materialGui.addColor(material, "Ka");
    materialGui.addColor(material, "Kd");
    materialGui.addColor(material, "Ks");
    materialGui.add(material, "shininess").min(1).max(500);

    // matrices
    let mView, mProjection;

    let down = false;
    let lastX, lastY;

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);

    resizeCanvasToFullWindow();

    window.addEventListener('resize', resizeCanvasToFullWindow);

    window.addEventListener('wheel', function (event) {

        if (!event.altKey && !event.metaKey && !event.ctrlKey) { // Change fovy
            const factor = 1 - event.deltaY / 1000;
            camera.fovy = Math.max(1, Math.min(100, camera.fovy * factor));
        }
        else if (event.metaKey || event.ctrlKey) {
            // move camera forward and backwards (shift)

            const offset = event.deltaY / 1000;

            const dir = normalize(subtract(camera.at, camera.eye));

            const ce = add(camera.eye, scale(offset, dir));
            const ca = add(camera.at, scale(offset, dir));

            // Can't replace the objects that are being listened by dat.gui, only their properties.
            camera.eye[0] = ce[0];
            camera.eye[1] = ce[1];
            camera.eye[2] = ce[2];

            if (event.ctrlKey) {
                camera.at[0] = ca[0];
                camera.at[1] = ca[1];
                camera.at[2] = ca[2];
            }
        }
    });

    function inCameraSpace(m) {
        const mInvView = inverse(mView);

        return mult(mInvView, mult(m, mView));
    }

    canvas.addEventListener('mousemove', function (event) {
        if (down) {
            const dx = event.offsetX - lastX;
            const dy = event.offsetY - lastY;

            if (dx != 0 || dy != 0) {
                // Do something here...

                const d = vec2(dx, dy);
                const axis = vec3(-dy, -dx, 0);

                const rotation = rotate(0.5 * length(d), axis);

                let eyeAt = subtract(camera.eye, camera.at);
                eyeAt = vec4(eyeAt[0], eyeAt[1], eyeAt[2], 0);
                let newUp = vec4(camera.up[0], camera.up[1], camera.up[2], 0);

                eyeAt = mult(inCameraSpace(rotation), eyeAt);
                newUp = mult(inCameraSpace(rotation), newUp);


                camera.eye[0] = camera.at[0] + eyeAt[0];
                camera.eye[1] = camera.at[1] + eyeAt[1];
                camera.eye[2] = camera.at[2] + eyeAt[2];

                camera.up[0] = newUp[0];
                camera.up[1] = newUp[1];
                camera.up[2] = newUp[2];

                lastX = event.offsetX;
                lastY = event.offsetY;
            }

        }
    });

    canvas.addEventListener('mousedown', function (event) {
        down = true;
        lastX = event.offsetX;
        lastY = event.offsetY;
        gl.clearColor(0.2, 0.0, 0.0, 1.0);
    });

    canvas.addEventListener('mouseup', function (event) {
        down = false;
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
    });

    window.requestAnimationFrame(render);

    function resizeCanvasToFullWindow() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        camera.aspect = canvas.width / canvas.height;

        gl.viewport(0, 0, canvas.width, canvas.height);
    }

    function resetCamera() {
        // Restaurar valores iniciais
        camera.eye[0] = 2;
        camera.eye[1] = 4;
        camera.eye[2] = 11;

        camera.at[0] = 0;
        camera.at[1] = 0;
        camera.at[2] = 0;

        camera.up[0] = 0;
        camera.up[1] = 1;
        camera.up[2] = 0;

        camera.fovy = 55;
        camera.near = 0.1;
        camera.far = 20;
    }

    function drawBase() {
        STACK.pushMatrix();
            STACK.multTranslation([0.0,-0.5,0.0]);
            STACK.multScale([10, 0.5, 10]);
            uploadModelView();
            uploadNormals();

            // Carrega material verde para chão
            uploadMaterial(materialBase);

            CUBE.draw(gl, program,  options.wireframe ? gl.LINES : gl.TRIANGLES);
        STACK.popMatrix();
    }

    function drawTorus() {
        STACK.pushMatrix();
            STACK.multTranslation([-2.0,0.16,2.0]);
            STACK.multScale([2,2,2]);
            uploadModelView();
            uploadNormals();

            uploadMaterial(materialTorus);

            TORUS.draw(gl, program, options.wireframe ? gl.LINES : gl.TRIANGLES);
        STACK.popMatrix();
    }

    function drawCylinder(){
        STACK.pushMatrix();
            STACK.multTranslation([2.0,0.74,-2.0]);
            STACK.multScale([2,2,2]);
            uploadModelView();
            uploadNormals();

            uploadMaterial(materialCylinder);

            CYLINDER.draw(gl, program, options.wireframe ? gl.LINES : gl.TRIANGLES);
        STACK.popMatrix();
    }

    function drawCube(){
        STACK.pushMatrix();
            STACK.multTranslation([-2.0,0.74,-2.0]);
            STACK.multScale([2,2,2]);
            uploadModelView();
            uploadNormals();

            uploadMaterial(materialCube);

            CUBE.draw(gl, program,  options.wireframe ? gl.LINES : gl.TRIANGLES);
        STACK.popMatrix();
    }

    function drawBunny() {
        STACK.pushMatrix();
            STACK.multTranslation([2.0,0.74,2.0]);
            STACK.multScale([2,2,2]);
            uploadModelView();
            uploadNormals();

            // Material do Bunny deve ser o único que varia
            uploadMaterial(material);

            BUNNY.draw(gl, program,  options.wireframe ? gl.LINES : gl.TRIANGLES);
        STACK.popMatrix();
    }

    function uploadMatrix(name, m) {
        gl.uniformMatrix4fv(gl.getUniformLocation(program, name), false, flatten(m));
    }

    function uploadProjection(m) { uploadMatrix("u_projection", m); }

    function uploadModelView() { uploadMatrix("u_model_view", STACK.modelView()); }

    function uploadNormals() { uploadMatrix("u_normals", normalMatrix(STACK.modelView())); }

    function uploadUniforms() {
        gl.uniform1i(gl.getUniformLocation(program, "u_n_lights"), lights.length);
        gl.uniform1i(gl.getUniformLocation(program, "u_shading_mode"), shading.mode);
        
        for (let i = 0; i < lights.length; i++) {
            const u_light_amb_loc = gl.getUniformLocation(program, "u_lights[" + i + "].ambient");
            const u_light_dif_loc = gl.getUniformLocation(program, "u_lights[" + i + "].diffuse");
            const u_light_spe_loc = gl.getUniformLocation(program, "u_lights[" + i + "].specular");
            
            // Spotlight
            const u_light_pos_loc = gl.getUniformLocation(program, "u_lights[" + i + "].position"); // Assumindo que você vai criar isso no shader ou usar fixo por enquanto
            const u_light_dir_loc = gl.getUniformLocation(program, "u_lights[" + i + "].direction");
            const u_light_cut_loc = gl.getUniformLocation(program, "u_lights[" + i + "].cutoff");
            const u_light_apr_loc = gl.getUniformLocation(program, "u_lights[" + i + "].aperture");

            // Verifica se a luz está On ou Off
            let ambientIsActive = lights[i].active ? lights[i].intensities.ambient : vec3(0, 0, 0);
            let diffuseIsActive = lights[i].active ? lights[i].intensities.diffuse : vec3(0, 0, 0);
            let specularIsActive = lights[i].active ? lights[i].intensities.specular : vec3(0, 0, 0);

            gl.uniform3fv(u_light_amb_loc, flatten(vec3(ambientIsActive)));
            gl.uniform3fv(u_light_dif_loc, flatten(vec3(diffuseIsActive)));
            gl.uniform3fv(u_light_spe_loc, flatten(vec3(specularIsActive)));

            // w = 0 -> vetor (direção)
            // w = 1 -> ponto (localização)
            let posW = 1;     // w = 1 para point e spotlight
            let cutoff = 0;   // Padrão para Point - sem atenuação angular
            let aperture = 180; // Padrão para Point - abre max

            // Validar com professor:
            // Axis, cutoff e aperture só vão ser usado para spotlight, certo?
            // Assim, podemos remover a pasta quando não é Spotlight?
            if (lights[i].type === "Spotlight") {
                posW = 1;
                cutoff = lights[i].spotInfo.cutoff;      // pega do slider (usuário)
                aperture = lights[i].spotInfo.aperture; 
            }
            else if (lights[i].type === "Directional") {
                posW = 0; // w = 0
            } 
            
            // Posição World -> Camera
            // A posição definida no GUI é Mundo. O Shader espera camera.
            // Multiplicamos ViewMatrix * LightPosition
            const posWorld = vec4(
                lights[i].position.x,
                lights[i].position.y,
                lights[i].position.z,
                posW
            );
            let lightPosCamera = mult(mView, posWorld);
            gl.uniform4fv(u_light_pos_loc, flatten(lightPosCamera));

            // Direção World -> Camera
            // O eixo (direção do spot) também precisa girar com a camera
            // O 'w' é 0.0 pois é um vetor (direção), não um ponto.
            // Axis → camera space
            let spotDirWorld = vec4(lights[i].axis.x, lights[i].axis.y, lights[i].axis.z, 0.0);
            let spotDirCamera = mult(mView, spotDirWorld);

            // Passamos apenas xyz normalizado
            gl.uniform3fv(u_light_dir_loc, flatten(normalize(vec3(spotDirCamera[0], spotDirCamera[1], spotDirCamera[2]))));

            // Parametros spotlight
            gl.uniform1f(u_light_cut_loc, cutoff);
            
            // Convertemos graus para cosseno do ângulo para o shader
            // cos(graus * PI / 180)
            gl.uniform1f(u_light_apr_loc, Math.cos(aperture * Math.PI / 180));

            }
        } 

    function uploadMaterial(mat) {
        const u_mat_ka_loc = gl.getUniformLocation(program, "u_material.Ka");
        const u_mat_kd_loc = gl.getUniformLocation(program, "u_material.Kd");
        const u_mat_ks_loc = gl.getUniformLocation(program, "u_material.Ks");
        const u_mat_shi_loc = gl.getUniformLocation(program, "u_material.shininess");

        gl.uniform3fv(u_mat_ka_loc, flatten(mat.Ka));
        gl.uniform3fv(u_mat_kd_loc, flatten(mat.Kd));
        gl.uniform3fv(u_mat_ks_loc, flatten(mat.Ks));
        gl.uniform1f(u_mat_shi_loc, mat.shininess);
    }

    function render(time) {
        window.requestAnimationFrame(render);

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

         // BACKFACE CULLING
        if (options.backfaceCulling) {
            gl.enable(gl.CULL_FACE);
            gl.cullFace(gl.BACK);
        } else {
            gl.disable(gl.CULL_FACE);
        }

        // DEPTH BUFFER
        if (options.depthTest) {
            gl.enable(gl.DEPTH_TEST);
        } else {
            gl.disable(gl.DEPTH_TEST);
        }

        const speed = 0.2;

        let forward = getForward();
        let right = getRight();
        let up = getUp();
        if (keys['w']) {
            const newEye = add(camera.eye, scale(speed, forward));
            camera.eye[0] = newEye[0];
            camera.eye[1] = newEye[1];
            camera.eye[2] = newEye[2];
            //camera.at  = add(camera.at, scale(speed, forward));
        }
        if (keys['s']) {
            const newEye = subtract(camera.eye, scale(speed, forward));
            camera.eye[0] = newEye[0];
            camera.eye[1] = newEye[1];
            camera.eye[2] = newEye[2];
            //camera.at  = subtract(camera.at, scale(speed, forward));
        }
        if (keys['d']) {
            const newEye = subtract(camera.eye, scale(speed, right));
            camera.eye[0] = newEye[0];
            camera.eye[1] = newEye[1];
            camera.eye[2] = newEye[2];
            //camera.at  = subtract(camera.at, scale(speed, right));
        }
        if (keys['a']) {
            const newEye = add(camera.eye, scale(speed, right));
            camera.eye[0] = newEye[0];
            camera.eye[1] = newEye[1];
            camera.eye[2] = newEye[2];
            //camera.at  = add(camera.at, scale(speed, right));
        }
        if (keys['q']) {
            const newEye = subtract(camera.eye, scale(speed, up));
            camera.eye[0] = newEye[0];
            camera.eye[1] = newEye[1];
            camera.eye[2] = newEye[2];
            //camera.at  = subtract(camera.at, scale(speed, right));
        }
        if (keys['e']) {
            const newEye = add(camera.eye, scale(speed, up));
            camera.eye[0] = newEye[0];
            camera.eye[1] = newEye[1];
            camera.eye[2] = newEye[2];
            //camera.at  = add(camera.at, scale(speed, right));
        }
        gl.useProgram(program);

        mView = lookAt(camera.eye, camera.at, camera.up);
        STACK.loadMatrix(mView);

        mProjection = perspective(camera.fovy, camera.aspect, camera.near, camera.far);
        uploadProjection(mProjection);

        uploadUniforms();

        drawBase();
        drawTorus();
        drawCylinder();
        drawCube();
        drawBunny();
    }
}

const urls = ['shader.vert', 'shader.frag'];

loadShadersFromURLS(urls).then(shaders => setup(shaders));