import { buildProgramFromSources, loadShadersFromURLS, setupWebGL } from '../../libs/utils.js';
import { length, flatten, inverse, mult, normalMatrix, perspective, lookAt, vec4, vec3, vec2, subtract, add, scale, rotate, normalize } from '../../libs/MV.js';

import * as dat from '../../libs/dat.gui.module.js'; // coisas do view eye

import * as CUBE from '../../libs/objects/cube.js';
import * as SPHERE from '../../libs/objects/sphere.js';

import * as STACK from '../../libs/stack.js';

function setup(shaders) {
    const canvas = document.getElementById('gl-canvas');
    const gl = setupWebGL(canvas);

    CUBE.init(gl);
    SPHERE.init(gl);

    const program = buildProgramFromSources(gl, shaders['shader.vert'], shaders['shader.frag']);

    // Camera  
    let camera = {
        eye: vec3(0, 0, 5),
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

    const gui = new dat.GUI();

    const optionsGui = gui.addFolder("options");
    optionsGui.add(options, "wireframe");
    optionsGui.add(options, "normals");

    const cameraGui = gui.addFolder("camera");
    cameraGui.add(camera, "fovy").min(.1).max(179.99).step(.1).onChange(v => (
        console.log("fovy changed to ", v)
    ));  // mesma coisa fazer (camera, "fovy", .1, 179.99, .1)   // onChange -> ler valor alterado e fazer algo que passamos
    cameraGui.add(camera, "aspect").min(.01).max(3).listen().domElement.style.pointerEvents = "none";  // alteraçoes no js aparecem menu (listen) e bloqueia alteraçoes via gui (pointerEvents)
    cameraGui.add(camera, "near").min(.1).max(50).step(.1).onChange(function(v) {
        if (v >= camera.far) camera.near = camera.far - 0.1;
    });
    cameraGui.add(camera, "far").min(.1).max(50).step(.1);
    
    const eyeGui = cameraGui.addFolder("eye");
    eyeGui.add(camera.eye, "0");
    eyeGui.add(camera.eye, "1");
    eyeGui.add(camera.eye, "2");

    const atGui = cameraGui.addFolder("at");
    atGui.add(camera.at, "0");
    atGui.add(camera.at, "1");
    atGui.add(camera.at, "2");

    const upGui = cameraGui.addFolder("up");
    upGui.add(camera.up, "0");
    upGui.add(camera.up, "1");
    upGui.add(camera.up, "2");

    // matrices
    let mView, mProjection;

    let down = false;
    let lastX, lastY;

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);

    resizeCanvasToFullWindow();

    window.addEventListener('resize', resizeCanvasToFullWindow);
    
    // exercicio 25
    const vetorAtEye = subtract(camera.at, camera.eye);
    const vetorEyeAt = subtract(camera.eye, camera.at);

    // canvas.onwheel = function(event) {
    //     if (event.deltaY < 0 && event.key === "Shift") {
    //         down = true;
    //         const zoom = 
    //         camera.eye += camera.at + scale(zoom, vetorAtEye);
            
    //     } else if (event.deltaY > 0 && event.key === "Shift") {
    //         down = true;
    //         camera.eye += camera.eye + event.deltaY * 0.01;
    //     };

    // }

    window.requestAnimationFrame(render);

    function onKeyDown(event) { 

        if (event.key === "Shift") {
            down = true;
        }
    };

    function resizeCanvasToFullWindow() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        camera.aspect = canvas.width / canvas.height;

        gl.viewport(0, 0, canvas.width, canvas.height);
    }

    function render(time) {
        window.requestAnimationFrame(render);

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.useProgram(program);

        mView = lookAt(camera.eye, camera.at, camera.up);
        STACK.loadMatrix(mView);

        mProjection = perspective(camera.fovy, camera.aspect, camera.near, camera.far);


        gl.uniformMatrix4fv(gl.getUniformLocation(program, "u_model_view"), false, flatten(STACK.modelView()));
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "u_projection"), false, flatten(mProjection));
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "u_normals"), false, flatten(normalMatrix(STACK.modelView())));

        gl.uniform1i(gl.getUniformLocation(program, "u_use_normals"), options.normals);

        SPHERE.draw(gl, program, options.wireframe ? gl.LINES : gl.TRIANGLES);
        CUBE.draw(gl, program, gl.LINES);
    }
}

const urls = ['shader.vert', 'shader.frag'];

loadShadersFromURLS(urls).then(shaders => setup(shaders));