import { buildProgramFromSources, loadShadersFromURLS, setupWebGL } from '../../libs/utils.js';
import { length, flatten, inverse, mult, normalMatrix, perspective, lookAt, vec4, vec3, vec2, subtract, add, scale, rotate, normalize } from '../../libs/MV.js';

import * as dat from '../../libs/dat.gui.module.js'; // coisas do view eye

import * as CUBE from '../../libs/objects/cube.js';
import * as SPHERE from '../../libs/objects/sphere.js';
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
        fovy: 45,
        aspect: 1, // Updated further down
        near: 0.1,
        far: 20
    }

    let options = {
        wireframe: false,
        normals: true
    }

    // let options = {
    //     backfaceCulling: true,
    //     depthTest: true
    // }

    let position = {
        x: 0,
        y: 0,
        z: 10,
        w: 1
    }

    let intensities = {
        ambient: [50, 50, 50],
        diffuse: [60, 60, 60],
        specular: [200, 200, 200]
    }

    let axis = {
        x: 0,
        y: 0,
        z: -1
    }

    let material = {
        Ka: vec3(150, 150, 150),
        Kd: vec3(150, 150, 150),
        Ks: vec3(200, 200, 200),
        shininess: 100
    }

    const gui = new dat.GUI();

    const optionsGui = gui.addFolder("options");
    optionsGui.add(options, "wireframe");
    optionsGui.add(options, "normals");
    // optionsGui.add(options, "backfaceCulling");
    // optionsGui.add(options, "depthTest");

    const cameraGui = gui.addFolder("camera");

    cameraGui.add(camera, "fovy").min(1).max(179).step(1).listen();
    cameraGui.add(camera, "aspect").min(0).max(10).step(0.01).listen().domElement.style.pointerEvents = "none";

    cameraGui.add(camera, "near").min(0.1).max(20).step(0.01).listen().onChange(function (v) {
        camera.near = Math.min(camera.far - 0.5, v);
    });

    cameraGui.add(camera, "far").min(0.1).max(20).step(0.01).listen().onChange(function (v) {
        camera.far = Math.max(camera.near + 0.5, v);
    });

    const eye = cameraGui.addFolder("eye");
    eye.add(camera.eye, 0).step(0.05).listen().domElement.style.pointerEvents = "none";;
    eye.add(camera.eye, 1).step(0.05).listen().domElement.style.pointerEvents = "none";;
    eye.add(camera.eye, 2).step(0.05).listen().domElement.style.pointerEvents = "none";;

    const at = cameraGui.addFolder("at");
    at.add(camera.at, 0).step(0.05).listen().domElement.style.pointerEvents = "none";;
    at.add(camera.at, 1).step(0.05).listen().domElement.style.pointerEvents = "none";;
    at.add(camera.at, 2).step(0.05).listen().domElement.style.pointerEvents = "none";;

    const up = cameraGui.addFolder("up");
    up.add(camera.up, 0).step(0.05).listen().domElement.style.pointerEvents = "none";;
    up.add(camera.up, 1).step(0.05).listen().domElement.style.pointerEvents = "none";;
    up.add(camera.up, 2).step(0.05).listen().domElement.style.pointerEvents = "none";;

    const lights = gui.addFolder("lights");
    const light1 = lights.addFolder("light 1");

    const positionGui = light1.addFolder("position");
    positionGui.add(position, "x");
    positionGui.add(position, "y");
    positionGui.add(position, "z");
    positionGui.add(position, "w");

    // const intensitiesGui = light1.addFolder("intensities");
    // intensitiesGui.add(intensities, "ambient");
    // intensitiesGui.add(intensities, "diffuse");
    // intensitiesGui.add(intensities, "specular");

    const axisGui = light1.addFolder("axis");
    axisGui.add(axis, "x");
    axisGui.add(axis, "y");
    axisGui.add(axis, "z");

    // const materialGui = gui.addFolder("material");
    // materialGui.add(material, "Ka");
    // materialGui.add(material, "Kd");
    // materialGui.add(material, "Ks");
    // materialGui.add(material, "shininess");

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
            CUBE.draw(gl, program,  options.wireframe ? gl.LINES : gl.TRIANGLES);
        STACK.popMatrix();
    }
    function drawTorus() {
        STACK.pushMatrix();
            STACK.multTranslation([-2.0,0.16,2.0]);
            STACK.multScale([2,2,2]);
            uploadModelView();
            uploadNormals();
            TORUS.draw(gl, program, options.wireframe ? gl.LINES : gl.TRIANGLES);
        STACK.popMatrix();
    }
    function drawCylinder(){
        STACK.pushMatrix();
            STACK.multTranslation([2.0,0.74,-2.0]);
            STACK.multScale([2,2,2]);
            uploadModelView();
            uploadNormals();
            CYLINDER.draw(gl, program, options.wireframe ? gl.LINES : gl.TRIANGLES);
        STACK.popMatrix();
    }
    function drawCube(){
        STACK.pushMatrix();
            STACK.multTranslation([-2.0,0.74,-2.0]);
            STACK.multScale([2,2,2]);
            uploadModelView();
            uploadNormals();
            CUBE.draw(gl, program,  options.wireframe ? gl.LINES : gl.TRIANGLES);
        STACK.popMatrix();
    }
    function drawBunny() {
        STACK.pushMatrix();
            STACK.multTranslation([2.0,0.74,2.0]);
            STACK.multScale([2,2,2]);
            uploadModelView();
            uploadNormals();
            BUNNY.draw(gl, program,  options.wireframe ? gl.LINES : gl.TRIANGLES);
        STACK.popMatrix();
    }
    function uploadMatrix(name, m) {
        gl.uniformMatrix4fv(gl.getUniformLocation(program, name), false, flatten(m));
    }

    function uploadProjection(m) { uploadMatrix("u_projection", m); }

    function uploadModelView() { uploadMatrix("u_model_view", STACK.modelView()); }

    function uploadNormals() { uploadMatrix("u_normals", normalMatrix(STACK.modelView())); }

    function render(time) {
        window.requestAnimationFrame(render);

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.useProgram(program);

        mView = lookAt(camera.eye, camera.at, camera.up);
        STACK.loadMatrix(mView);

        mProjection = perspective(camera.fovy, camera.aspect, camera.near, camera.far);

        // const u_shininess = gl.getUniformLocation(program, "u_material.shininess");
        // const u_KaOfLight0 = gl.getUniformLocation(program, "u_lights[0].ambient");

        //gl.uniformMatrix4fv(gl.getUniformLocation(program, "u_model_view"), false, flatten(STACK.modelView()));
        // gl.uniformMatrix4fv(gl.getUniformLocation(program, "u_projection"), false, flatten(mProjection));
        // gl.uniformMatrix4fv(gl.getUniformLocation(program, "u_normals"), false, flatten(normalMatrix(STACK.modelView())));
        uploadProjection(mProjection);
        //uploadModelView();
        //uploadNormals();

        gl.uniform1i(gl.getUniformLocation(program, "u_use_normals"), options.normals);
        //uploadModelView();
        //SPHERE.draw(gl, program, options.wireframe ? gl.LINES : gl.TRIANGLES);
        //CUBE.draw(gl, program, gl.LINES);
        drawBase();
        drawTorus();
        drawCylinder();
        drawCube();
        drawBunny();
    }
}

const urls = ['shader.vert', 'shader.frag'];

loadShadersFromURLS(urls).then(shaders => setup(shaders));