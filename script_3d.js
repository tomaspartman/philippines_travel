// --- Global Three.js Variables ---
let scene, camera, renderer, container;
let raycaster;
let mouse = new THREE.Vector2();

// --- Configuration ---
const MAP_CONTAINER_ID = 'map-container';
const EXTRUSION_HEIGHT = 5; // How tall the 3D island shapes are
const INITIAL_CAMERA_Y = 100;

// --- Placeholder GeoJSON data ---
// NOTE: For a real map, you would load a GeoJSON file. 
// This simple data represents a large rectangle and a smaller square.
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
                // Coordinates are simplified for demonstration
                "coordinates": [
                    [ [150, 50], [350, 50], [350, 400], [150, 400], [150, 50] ]
                ]
            }
        },
        // ... more regions would go here (Visayas, Mindanao, etc.)
    ]
};

// --- Core Three.js Setup Function ---
function init() {
    container = document.getElementById(MAP_CONTAINER_ID);
    
    // 1. Scene: The container for all objects, lights, and cameras
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xADD8E6); // Light Blue for 'water'

    // 2. Camera: Defines what the user sees
    // PerspectiveCamera(FOV, Aspect Ratio, Near, Far)
    const aspectRatio = container.clientWidth / container.clientHeight;
    camera = new THREE.PerspectiveCamera(50, aspectRatio, 1, 1000);
    camera.position.set(250, INITIAL_CAMERA_Y, 450); // Positioned to look down and forward
    camera.lookAt(new THREE.Vector3(250, 0, 250)); // Center view on the map area
    
    // 3. Renderer: Renders the scene onto a canvas
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // 4. Lighting: Needed for 3D objects to be visible
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(0, 100, 0); 
    scene.add(directionalLight);

    // 5. Raycaster: Tool for mouse interaction with 3D objects
    raycaster = new THREE.Raycaster();
    
    // Start drawing the 3D map shapes
    createMap();

    // Add event listeners for resizing and clicking
    window.addEventListener('resize', onWindowResize);
    renderer.domElement.addEventListener('click', onMapClick);

    // Start the render loop
    animate();
}

// --- Map Creation Function ---
function createMap() {
    philippinesRegionsGeoJSON.features.forEach(feature => {
        const properties = feature.properties;
        const coordinates = feature.geometry.coordinates;

        // Note: For complex GeoJSON with multiple polygons, you need a more robust loop.
        const shapeCoordinates = coordinates[0]; 
        
        // 1. Convert coordinates to a THREE.Shape
        const shape = new THREE.Shape();
        
        // Move to the first point
        shape.moveTo(shapeCoordinates[0][0], shapeCoordinates[0][1]);
        
        // Draw lines to the remaining points
        for (let i = 1; i < shapeCoordinates.length; i++) {
            shape.lineTo(shapeCoordinates[i][0], shapeCoordinates[i][1]);
        }

        // 2. Extrude the shape to give it height (3D)
        const extrudeSettings = {
            depth: EXTRUSION_HEIGHT,
            bevelEnabled: false
        };
        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        
        // 3. Create the 3D Mesh (Object)
        const material = new THREE.MeshPhongMaterial({
            color: new THREE.Color(Math.random(), Math.random(), Math.random()), // Random color for demonstration
            specular: 0x555555,
            shininess: 30
        });

        const mesh = new THREE.Mesh(geometry, material);
        
        // Three.js meshes are created flat (on the XY plane). We need to rotate it 90 degrees 
        // to lie flat on the XZ plane (like a floor) and position it correctly.
        mesh.rotation.x = Math.PI / 2; // Rotate 90 degrees around X-axis

        // 4. Attach region data to the mesh for clicking 
        mesh.userData.id = properties.id;
        mesh.userData.name = properties.name;
        mesh.userData.url = properties.url;
        
        scene.add(mesh);
    });
}

// --- Animation Loop ---
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

// --- Event Handlers ---
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
        // The first intersection is the object closest to the camera
        const clickedMesh = intersects[0].object;
        
        // Check if the clicked object has the user data we attached
        if (clickedMesh.userData.id) {
            // Get the modal elements
            const modal = document.getElementById('info-modal');
            const modalRegionName = document.getElementById('modal-region-name');
            const modalDescription = document.getElementById('modal-description');
            const modalDetailsLink = document.getElementById('modal-details-link');
            
            // NOTE: We need a data structure here similar to the one in the 2D example
            // For now, we'll use the data attached to the mesh.
            
            // Populate the modal
            modalRegionName.textContent = clickedMesh.userData.name;
            modalDescription.textContent = `You clicked the ${clickedMesh.userData.name}! Ready to go to the details page?`;
            modalDetailsLink.href = clickedMesh.userData.url;

            // Show the modal
            modal.style.display = 'block';

            // Optional: Highlight the clicked region (e.g., make it glow)
            // clickedMesh.material.emissive.setHex(0x333333); 
        }
    }
}

// Initialize the application
init();
