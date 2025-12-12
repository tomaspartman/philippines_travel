// --- Global Three.js Variables ---
let scene, camera, renderer, controls; // Added 'controls'
let raycaster;
let mouse = new THREE.Vector2();

// --- Configuration ---
const MAP_CONTAINER_ID = 'map-container';
const EXTRUSION_HEIGHT = 5; 
const INITIAL_CAMERA_Y = 100;

// --- Placeholder GeoJSON data ---
// We will keep this placeholder data for now until we load a real GeoJSON file.
const philippinesRegionsGeoJSON = {
    "type": "FeatureCollection",
    "features": [
        {
            "type": "Feature",
            "properties": {
                "name": "Luzon Region",
                "id": "luzon",
                "url": "luzon.html"
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [ [150, 50], [350, 50], [350, 400], [150, 400], [150, 50] ]
                ]
            }
        },
        // Let's add another simple rectangle for Visayas to show multiple objects
        {
            "type": "Feature",
            "properties": {
                "name": "Visayas Region",
                "id": "visayas",
                "url": "visayas.html"
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [ [200, 450], [400, 450], [400, 600], [200, 600], [200, 450] ]
                ]
            }
        }
    ]
};

// --- Core Three.js Setup Function ---
function init() {
    container = document.getElementById(MAP_CONTAINER_ID);
    
    // 1. Scene Setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xADD8E6); 

    // 2. Camera Setup
    const aspectRatio = container.clientWidth / container.clientHeight;
    camera = new THREE.PerspectiveCamera(50, aspectRatio, 1, 1000);
    camera.position.set(250, INITIAL_CAMERA_Y, 450); 
    camera.lookAt(new THREE.Vector3(250, 0, 250)); // Center view on the map area
    
    // 3. Renderer Setup
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(0, 100, 0); 
    scene.add(directionalLight);

    // 5. Orbit Controls Initialization
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target.set(250, 0, 250); // Set the center of rotation to the map center
    controls.update();
    
    // 6. Raycaster
    raycaster = new THREE.Raycaster();
    
    // Start drawing the 3D map shapes
    createMap();

    // Add event listeners for resizing and clicking
    window.addEventListener('resize', onWindowResize);
    renderer.domElement.addEventListener('click', onMapClick);

    // Start the render loop
    animate();
}

// --- Map Creation Function (Unchanged from before) ---
function createMap() {
    philippinesRegionsGeoJSON.features.forEach(feature => {
        const properties = feature.properties;
        const coordinates = feature.geometry.coordinates;

        const shapeCoordinates = coordinates[0]; 
        
        const shape = new THREE.Shape();
        shape.moveTo(shapeCoordinates[0][0], shapeCoordinates[0][1]);
        
        for (let i = 1; i < shapeCoordinates.length; i++) {
            shape.lineTo(shapeCoordinates[i][0], shapeCoordinates[i][1]);
        }

        const extrudeSettings = {
            depth: EXTRUSION_HEIGHT,
            bevelEnabled: false
        };
        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        
        const material = new THREE.MeshPhongMaterial({
            color: new THREE.Color(Math.random(), Math.random(), Math.random()),
            specular: 0x555555,
            shininess: 30
        });

        const mesh = new THREE.Mesh(geometry, material);
        
        mesh.rotation.x = Math.PI / 2; // Lay the shape flat on the ground
        
        mesh.userData.id = properties.id;
        mesh.userData.name = properties.name;
        mesh.userData.url = properties.url;
        
        scene.add(mesh);
    });
}

// --- Animation Loop (Updated to include controls update) ---
function animate() {
    requestAnimationFrame(animate);
    
    // Crucial: Update controls in the animation loop
    controls.update(); 
    
    renderer.render(scene, camera);
}

// --- Event Handlers (Unchanged from before) ---
function onWindowResize() {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

function onMapClick(event) {
    // Calculate mouse position in normalized device coordinates (-1 to +1)
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Update the raycaster with the camera and mouse position
    raycaster.setFromCamera(mouse, camera);

    // Calculate objects intersecting the ray
    const intersects = raycaster.intersectObjects(scene.children);

    if (intersects.length > 0) {
        const clickedMesh = intersects[0].object;
        
        if (clickedMesh.userData.id) {
            const modal = document.getElementById('info-modal');
            const modalRegionName = document.getElementById('modal-region-name');
            const modalDescription = document.getElementById('modal-description');
            const modalDetailsLink = document.getElementById('modal-details-link');
            
            modalRegionName.textContent = clickedMesh.userData.name;
            modalDescription.textContent = `You clicked the ${clickedMesh.userData.name}! Ready to go to the details page?`;
            modalDetailsLink.href = clickedMesh.userData.url;

            modal.style.display = 'block';
        }
    }
}

// Initialize the application
init();
