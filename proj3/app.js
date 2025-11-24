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
        aspect: 1, // Updated further down
        near: 0.1,
        far: 20
    }

    let options = {
        wireframe: false
    }

    // let options = {
    //     backfaceCulling: true,
    //     depthTest: true
    // }

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
        Ks: vec3(50, 50, 50),     // Pouco brilho (fosco)
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
        Ks: vec3(200, 200, 200),  // Brilho quase branco
        shininess: 60
    };

    let maxLights;
    let shading = { mode: 0 }; // 0 = Phong, 1 = Gouraud
    const gui = new dat.GUI();

    const optionsGui = gui.addFolder("options");
    optionsGui.add(options, "wireframe");

    // optionsGui.add(options, "backfaceCulling");
    // optionsGui.add(options, "depthTest");

    const cameraGui = gui.addFolder("camera");

    cameraGui.add(camera, "fovy").min(1).max(100).step(1).listen();
    cameraGui.add(camera, "aspect").min(0).max(10).step(0.01).listen().domElement.style.pointerEvents = "none";

    cameraGui.add(camera, "near").min(0.1).max(20).step(0.01).listen().onChange(function (v) {
        camera.near = Math.min(camera.far - 0.5, v);
    });

    cameraGui.add(camera, "far").min(0.1).max(20).step(0.01).listen().onChange(function (v) {
        camera.far = Math.max(camera.near + 0.5, v);
    });

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
    up.add(camera.up, 1).min(-2).max(2).step(1).listen();
    up.add(camera.up, 2).min(-20).max(20).step(1).listen();

    let lights = [];

    // Pasta para lights
    const lightsGui = gui.addFolder("lights");
    function createDefaultLight() {
        return {
            position: { x: 0, y: 5, z: 10, w: 1 },
            intensities: {
                ambient: vec3(120,120,120),
                diffuse: vec3(255,255,255),
                specular: vec3(200,200,200)
            },
            axis: { x: 0, y: -1, z: -1.7 },  // spotlight direction
            spotInfo: {
                aperture: 14,
                cutoff: 25
            }
        };
    }
    
    //const light1 = lightsGui.addFolder("first light");
    const addButton = { addLight: function() {
        if (lights.length < 3) {
            lights.push(createDefaultLight());
            rebuildLightsGUI();
        } else {
            alert("Maximum of 3 lights reached!"); 
        }
    }};

    lightsGui.add(addButton, "addLight").name("Add Light");

    gui.add(shading, "mode", { Phong:0.0, Gouraud:1.0 });

    function rebuildLightsGUI() {
        if (lightsGui.__folders) {
            for (let key of Object.keys(lightsGui.__folders)) {
                lightsGui.removeFolder(lightsGui.__folders[key]);
            }
        }

        lights.forEach((light, idx) => {
            const f = lightsGui.addFolder("Light " + idx);

            const positionGui = f.addFolder("position");
            positionGui.add(light.position, "x");
            positionGui.add(light.position, "y");
            positionGui.add(light.position, "z");
            positionGui.add(light.position, "w");

            const intensitiesGui = f.addFolder("intensities");
            intensitiesGui.addColor(light.intensities, "ambient");
            intensitiesGui.addColor(light.intensities, "diffuse");
            intensitiesGui.addColor(light.intensities, "specular");

            const axisGui = f.addFolder("axis");
            axisGui.add(light.axis, "x");
            axisGui.add(light.axis, "y");
            axisGui.add(light.axis, "z");

            f.add(light.spotInfo, "aperture").min(0).max(180);
            f.add(light.spotInfo, "cutoff").min(0).max(100);
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

                console.log(eyeAt, newUp);

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

            gl.uniform3fv(u_light_amb_loc, flatten(vec3(lights[i].intensities.ambient)));
            gl.uniform3fv(u_light_dif_loc, flatten(vec3(lights[i].intensities.diffuse)));
            gl.uniform3fv(u_light_spe_loc, flatten(vec3(lights[i].intensities.specular)));

            // Posição World -> Camera
            // A posição definida no GUI é Mundo. O Shader espera camera.
            // Multiplicamos ViewMatrix * LightPosition
            const posWorld = vec4(
                lights[i].position.x,
                lights[i].position.y,
                lights[i].position.z,
                lights[i].position.w
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
            gl.uniform1f(u_light_cut_loc, lights[i].spotInfo.cutoff);
            
            // Convertemos graus para cosseno do ângulo para o shader
            // cos(graus * PI / 180)
            gl.uniform1f(u_light_apr_loc, Math.cos(lights[i].spotInfo.aperture * Math.PI / 180));

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