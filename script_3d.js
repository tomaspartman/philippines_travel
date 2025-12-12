// --- Global Three.js Variables ---
let scene, camera, renderer, controls;
let raycaster;
let mouse = new THREE.Vector2();

// Tracking variables for hover
let INTERSECTED; // The currently hovered object
const ORIGINAL_COLOR = new THREE.Color(0xAAAAAA); // Default color (will be overwritten by random in createMap)
const HOVER_COLOR = new THREE.Color(0xFFD700); // Gold for highlighting

// --- Configuration ---
const MAP_CONTAINER_ID = 'map-container';
const EXTRUSION_HEIGHT = 5; 
const INITIAL_CAMERA_Y = 100;
const GEOJSON_URL = 'philippines_data.json'; // Still looking for this file!

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
    camera.lookAt(new THREE.Vector3(250, 0, 250)); 
    
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
    controls.target.set(250, 0, 250); 
    controls.update();
    
    // 6. Raycaster
    raycaster = new THREE.Raycaster();
    
    // Start drawing the 3D map shapes
    loadGeoJSON();

    // Add event listeners for resizing, clicking, and HOVERING (mousemove)
    window.addEventListener('resize', onWindowResize);
    renderer.domElement.addEventListener('click', onMapClick);
    renderer.domElement.addEventListener('mousemove', onMouseMove); // NEW HOVER LISTENER

    // Start the render loop
    animate();
}

// --- Map Creation and Data Loading ---

function loadGeoJSON() {
    // Placeholder GeoJSON data for fallback in case of load failure
    const fallbackGeoJSON = {
        "features": [
            {"properties": {"name": "Luzon (Fallback)", "id": "luzon", "url": "luzon.html"}, "geometry": {"coordinates": [[ [150, 50], [350, 50], [350, 400], [150, 400], [150, 50] ]]}},
            {"properties": {"name": "Visayas (Fallback)", "id": "visayas", "url": "visayas.html"}, "geometry": {"coordinates": [[ [200, 450], [400, 450], [400, 600], [200, 600], [200, 450] ]]}}
        ]
    };

    fetch(GEOJSON_URL)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}. Using fallback data.`);
            }
            return response.json();
        })
        .then(data => createMap(data))
        .catch(error => {
            console.error("Error loading GeoJSON data:", error);
            createMap(fallbackGeoJSON);
        });
}


function createMap(geojson) {
    // Clear any previous shapes
    scene.children.filter(obj => obj.isMesh).forEach(obj => scene.remove(obj)); 
    
    geojson.features.forEach(feature => {
        const properties = feature.properties;
        const geometry = feature.geometry;

        const coordinatesArray = (geometry.type === 'MultiPolygon') 
                                ? geometry.coordinates.flat(1) 
                                : [geometry.coordinates];

        coordinatesArray.forEach(coordinates => {
            if (!coordinates || coordinates.length === 0) return; 
            
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
            const extrusionGeometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
            
            // Generate a persistent, random color for the region
            const initialColor = new THREE.Color(Math.random(), Math.random(), Math.random());
            
            const material = new THREE.MeshPhongMaterial({
                color: initialColor,
                specular: 0x555555,
                shininess: 30
            });

            const mesh = new THREE.Mesh(extrusionGeometry, material);
            mesh.rotation.x = Math.PI / 2;
            
            // Attach data for interactivity, including the original color
            mesh.userData.id = properties.id || feature.id; 
            mesh.userData.name = properties.name || 'Unknown Region';
            mesh.userData.url = properties.url || `${mesh.userData.id}.html`;
            mesh.userData.originalColor = initialColor; // Store the color for hover reset
            
            scene.add(mesh);
        });
    });
}


// --- Animation Loop (Updated to check for hover) ---
function animate() {
    requestAnimationFrame(animate);
    
    controls.update(); 
    
    // Check for hover state on every frame
    checkHover();
    
    renderer.render(scene, camera);
}


// --- Event Handlers ---
function onWindowResize() {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

// Function to update mouse coordinates for raycasting
function updateMousePosition(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

function onMouseMove(event) {
    updateMousePosition(event);
}

function checkHover() {
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children);

    if (intersects.length > 0) {
        // Intersected object found
        const hoveredObject = intersects[0].object;

        if (INTERSECTED != hoveredObject) {
            // New object hovered
            if (INTERSECTED) {
                // Reset the color of the previous object
                INTERSECTED.material.color.copy(INTERSECTED.userData.originalColor);
            }

            INTERSECTED = hoveredObject;
            
            // Change the color of the new hovered object
            if (INTERSECTED.userData.originalColor) {
                INTERSECTED.material.color.copy(HOVER_COLOR); 
            }
        }
    } else {
        // No intersection, reset the color of the previously hovered object
        if (INTERSECTED) {
            INTERSECTED.material.color.copy(INTERSECTED.userData.originalColor);
        }
        INTERSECTED = null;
    }
}

function onMapClick(event) {
    updateMousePosition(event);

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children);

    if (intersects.length > 0) {
        const clickedMesh = intersects[0].object;
        
        if (clickedMesh.userData.id) {
            // This is the same logic as before to show the modal
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


// Start the application
init();
