# Project 3: Illumination and Shading

This project is a 3D interactive application developed using WebGL and GLSL that implements the Phong Illumination Model. It simulates realistic lighting interactions (ambient, diffuse, and specular reflection) allowing users to explore how light affects 3D geometry in real-time. The application supports switching between per-vertex (Gouraud) and per-fragment (Phong) shading.

## 👥 Authors
- Henrique José Maceiro Martins (67985)
- Eduardo Ferreira de Melo (75157)

## 🚀 About the Project
The scene renders a platform with four primitive objects (Cube, Torus, Cylinder, and Bunny). The core objective is to manage multiple light sources and materials within a perspective projection.

### Key Features
* **Lighting Models:**
    * Switch seamlessly between **Phong Shading** (per-fragment, high quality) and **Gouraud Shading** (per-vertex, interpolated) via the interface.
    * Support for the full Phong Reflection Model (Ambient + Diffuse + Specular).
* **Dynamic Light Management (Challenge):**
    * Add or remove light sources dynamically (up to 3 lights).
    * Individual On/Off toggle for each light source.
* **Advanced Light Types:**
    * Change light types in real-time: **Point**, **Directional**, or **Spotlight**.
    * **Spotlights** feature adjustable cutoff (attenuation) and aperture angles.
* **Coordinate Systems (Challenge):**
    * **Lock to Camera:** Lights can be fixed to the camera (creating a "lantern" effect) or fixed to the World coordinates.
* **Material System:**
    * Interactive editing of the Bunny's material properties (Ka, Kd, Ks, and Shininess).
    * Other objects (Torus, Cylinder, Cube) use distinct, fixed material presets.

## 🛠️ Technical Implementation
* **GLSL Shaders:**
    * **Vertex Shader:** Handles projection, model-view transformations, and implements Gouraud shading logic.
    * **Fragment Shader:** Implements Phong shading logic and Spotlight cone calculations (using dot products and cutoff exponents).
* **Camera System (Fly Mode):** A fully interactive camera implemented in JavaScript allowing 6-DOF navigation (WASD + QE) and mouse look.
* **Rendering Optimizations:** Toggles for **Back-face Culling** and **Z-Buffer (Depth Test)**.

## ⌨️ Controls

### Camera Navigation (Fly Mode)
* **W / S**: Move camera Forward / Backward.
* **A / D**: Strafe Left / Right.
* **Q / E**: Move Up / Down (Elevation).
* **Mouse Drag**: Look around (orientation).
* **Scroll**: Adjust Field of View (Zoom).

### Interface Controls
* **Reset Camera**: Instantly returns the camera to its initial position.
* **Add/Remove Light**: Dynamically manage the number of active lights in the scene.
* **Shading Mode**: Toggle between Phong (0) and Gouraud (1).
