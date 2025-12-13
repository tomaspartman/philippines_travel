// --- Global Three.js Variables and Configuration ---
let scene, camera, renderer, controls;
let raycaster;
let mouse = new THREE.Vector2();

// Tracking variables for hover
let INTERSECTED; 
const HOVER_COLOR = new THREE.Color(0xFFD700); // Gold for highlighting

// Projection variables (calculated once the GeoJSON data is loaded)
let scaleFactor = 1;
let centerOffset = new THREE.Vector2(0, 0);

// Configuration
const MAP_CONTAINER_ID = 'map-container';
const EXTRUSION_HEIGHT = 5; 
const INITIAL_CAMERA_Y = 100;
const GEOJSON_URL = 'philippines_data.json'; 

// --- Core Three.js Setup Function ---
function init() {
    container = document.getElementById(MAP_CONTAINER_ID);
    
    // 1. Scene Setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xADD8E6); // Light Blue for 'water'

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
    
    // Start drawing the 3D map shapes by loading the data
    loadGeoJSON();

    // Add event listeners for resizing, clicking, and HOVERING (mousemove)
    window.addEventListener('resize', onWindowResize);
    renderer.domElement.addEventListener('click', onMapClick);
    renderer.domElement.addEventListener('mousemove', onMouseMove); 

    // Start the render loop
    animate();
}

// --- Coordinate Projection and Data Loading ---

// Function to calculate the scaling and offset based on GeoJSON bounds
function projectCoordinates(coords, mapCenter) {
    if (coords.length === 0) return;

    let minLon = Infinity, maxLon = -Infinity;
    let minLat = Infinity, maxLat = -Infinity;

    coords.forEach(point => {
        minLon = Math.min(minLon, point[0]);
        maxLon = Math.max(maxLon, point[0]);
        minLat = Math.min(minLat, point[1]);
        maxLat = Math.max(maxLat, point[1]);
    });

    const lonRange = maxLon - minLon;
    const latRange = maxLat - minLat;
    
    // Determine a scale factor to fit the map into a 500x500 area
    scaleFactor = Math.min(500 / lonRange, 500 / latRange) || 1; 

    // Calculate the center offset to center the map at (250, 250)
    const centerLon = (minLon + maxLon) / 2;
    const centerLat = (minLat + maxLat) / 2;
    
    centerOffset.x = mapCenter.x - (centerLon * scaleFactor);
    centerOffset.y = mapCenter.y - (centerLat * scaleFactor);
}


function loadGeoJSON() {
    const mapCenter = new THREE.Vector2(250, 250); 
    
    // Fallback data in case the main file fails to load
    const fallbackGeoJSON = {
        "features": [
            {"properties": {"name": "Luzon (Fallback)", "id": "luzon", "url": "luzon.html"}, "geometry": {"coordinates": [[ [120, 14], [125, 14], [125, 20], [120, 20], [120, 14] ]]}},
            {"properties": {"name": "Visayas (Fallback)", "id": "visayas", "url": "visayas.html"}, "geometry": {"coordinates": [[ [120, 8], [125, 8], [125, 14], [120, 14], [120, 8] ]]}}
        ]
    };

    fetch(GEOJSON_URL)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}. Using fallback data.`);
            }
            return response.json();
        })
        .then(data => {
            // Collect all coordinates to calculate the global bounding box
            let allCoords = [];
            data.features.forEach(feature => {
                const geometry = feature.geometry;
                
                let currentCoords = [];
                if (geometry.type === 'Polygon') {
                    currentCoords = geometry.coordinates.flat(1);
                } else if (geometry.type === 'MultiPolygon') {
                    currentCoords = geometry.coordinates.flat(2); 
                }
                allCoords.push(...currentCoords);
            });

            // 1. Calculate the projection scale and offset
            projectCoordinates(allCoords, mapCenter);
            
            // 2. Create the map with the calculated projection
            createMap(data);
        })
        .catch(error => {
            console.error("Error loading GeoJSON data:", error);
            // If loading fails, calculate projection on fallback data and use it
            projectCoordinates(fallbackGeoJSON.features.map(f => f.geometry.coordinates).flat(2), mapCenter);
            createMap(fallbackGeoJSON);
        });
}


// --- Map Creation Function ---
function createMap(geojson) {
    // Clear any previous shapes
    scene.children.filter(obj => obj.isMesh).forEach(obj => scene.remove(obj)); 
    
    geojson.features.forEach(feature => {
        const properties = feature.properties;
        const geometry = feature.geometry;

        // --- ROBUST MULTIPOLYGON PROCESSING (Zabezpečí všetky ostrovy) ---
        let parts = [];
        if (geometry.type === 'MultiPolygon') {
            // Získa outer ring (hranicu) pre každý samostatný ostrov
            parts = geometry.coordinates.map(polygon => polygon[0]); 
        } else if (geometry.type === 'Polygon') {
            // Získa outer ring pre jednoduchý ostrov
            parts = [geometry.coordinates[0]]; 
        } else {
            return; // Skip unknown geometry types
        }
        
        parts.forEach(shapeCoordinates => {
            if (!shapeCoordinates || shapeCoordinates.length === 0) return;
            
            const shape = new THREE.Shape();
            
            // --- APLIKÁCIA SÚRADNÍC S INVERZIOU X-OSI ---
            const lon_start = shapeCoordinates[0][0]; // Longitude -> X
            const lat_start = shapeCoordinates[0][1]; // Latitude -> Y
            
            // Výpočet počiatočného bodu: Používame -scaleFactor pre zrkadlové otočenie
            const startX = lon_start * -scaleFactor + centerOffset.x;
            const startY = lat_start * scaleFactor + centerOffset.y; 
            
            shape.moveTo(startX, startY);
            
            for (let i = 1; i < shapeCoordinates.length; i++) {
                const lon_current = shapeCoordinates[i][0];
                const lat_current = shapeCoordinates[i][1];
                
                // Výpočet aktuálneho bodu: Používame -scaleFactor pre X
                const currentX = lon_current * -scaleFactor + centerOffset.x;
                const currentY = lat_current * scaleFactor + centerOffset.y;
                
                shape.lineTo(currentX, currentY);
            }
            
            // --- Extrusion and Mesh Creation ---
            const extrudeSettings = {
                depth: EXTRUSION_HEIGHT,
                bevelEnabled: false
            };
            const extrusionGeometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
            
            const initialColor = new THREE.Color(Math.random(), Math.random(), Math.random());
            
            const material = new THREE.MeshPhongMaterial({
                color: initialColor,
                specular: 0x555555,
                shininess: 30
            });

            const mesh = new THREE.Mesh(extrusionGeometry, material);
            mesh.rotation.x = Math.PI / 2; // Lay the shape flat on the ground
            
            // Attach data for interactivity, including the original color
            mesh.userData.id = properties.id || feature.id; 
            mesh.userData.name = properties.name || 'Unknown Region';
            mesh.userData.url = properties.url || `${mesh.userData.id}.html`;
            mesh.userData.originalColor = initialColor; // Store the color for hover reset
            
            scene.add(mesh);
        });
    });
}

// --- Animation Loop ---
function animate() {
    requestAnimationFrame(animate);
    
    controls.update(); // Update Orbit Controls
    checkHover();      // Check for hover state
    
    renderer.render(scene, camera);
}


// --- Event Handlers (Click and Hover) ---

function onWindowResize() {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

// Helper function to convert screen click to 3D mouse vector
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
        const hoveredObject = intersects[0].object;

        if (INTERSECTED != hoveredObject && hoveredObject.userData.originalColor) {
            // Reset the color of the previous object
            if (INTERSECTED) {
                INTERSECTED.material.color.copy(INTERSECTED.userData.originalColor);
            }

            INTERSECTED = hoveredObject;
            
            // Change the color of the new hovered object
            INTERSECTED.material.color.copy(HOVER_COLOR); 
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
            // Logic to display the modal
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
