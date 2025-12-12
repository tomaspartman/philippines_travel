// --- Global Three.js Variables ---
let scene, camera, renderer, controls;
let raycaster;
let mouse = new THREE.Vector2();

// --- Configuration ---
const MAP_CONTAINER_ID = 'map-container';
const EXTRUSION_HEIGHT = 5; 
const INITIAL_CAMERA_Y = 100;
// NOTE: Change this URL if you host your GeoJSON file elsewhere!
const GEOJSON_URL = 'philippines_data.json'; 


// --- Core Three.js Setup and Animation (init, animate, onWindowResize are unchanged) ---
// ... (Keep the init, animate, and onWindowResize functions as they were) ...
// ... (We will skip pasting the unchanged functions for brevity) ...


// --- Event Handlers (onMapClick is unchanged) ---
// ... (Keep the onMapClick function as it was) ...


// --- NEW/UPDATED Map Creation Functions ---

// 1. New function to load the GeoJSON file
function loadGeoJSON() {
    // We use the fetch API to load the external data file
    fetch(GEOJSON_URL)
        .then(response => {
            if (!response.ok) {
                // If fetching the local file fails (common issue), log a message
                throw new Error(`HTTP error! Status: ${response.status}. 
                    Check if you have a file named ${GEOJSON_URL} in your project directory.`);
            }
            return response.json();
        })
        .then(data => {
            // Once data is loaded, process it to create 3D shapes
            createMap(data);
            console.log("GeoJSON data loaded and 3D map created.");
        })
        .catch(error => {
            console.error("Error loading GeoJSON data:", error);
            // Fallback: If loading fails, use the old simple placeholder data
            console.log("Using simplified placeholder map as a fallback.");
            createMap({
                 "features": [
                     // Simple Luzon placeholder
                    {"properties": {"name": "Luzon (Fallback)", "id": "luzon", "url": "luzon.html"}, "geometry": {"coordinates": [[ [150, 50], [350, 50], [350, 400], [150, 400], [150, 50] ]]}},
                    // Simple Visayas placeholder
                    {"properties": {"name": "Visayas (Fallback)", "id": "visayas", "url": "visayas.html"}, "geometry": {"coordinates": [[ [200, 450], [400, 450], [400, 600], [200, 600], [200, 450] ]]}}
                 ]
             });
        });
}

// 2. Updated createMap function to accept the loaded data
function createMap(geojson) {
    // Clear any previous shapes before adding new ones
    // (Important if you use the fallback and then manually reload)
    scene.children.filter(obj => obj.isMesh).forEach(obj => scene.remove(obj)); 
    
    geojson.features.forEach(feature => {
        const properties = feature.properties;
        const geometry = feature.geometry;

        // GeoJSON can have MultiPolygon (complex shapes) or Polygon (simple shapes)
        const coordinatesArray = (geometry.type === 'MultiPolygon') 
                                ? geometry.coordinates.flat() // Flatten array for simplicity
                                : [geometry.coordinates]; // Wrap simple Polygon coordinates

        coordinatesArray.forEach(coordinates => {
            if (coordinates.length === 0) return; // Skip empty coordinate sets
            
            // The first array usually holds the outer boundary
            const shapeCoordinates = coordinates[0]; 
            
            // --- Coordinate Conversion and Shape Creation (Same as before) ---
            const shape = new THREE.Shape();
            shape.moveTo(shapeCoordinates[0][0], shapeCoordinates[0][1]);
            
            for (let i = 1; i < shapeCoordinates.length; i++) {
                shape.lineTo(shapeCoordinates[i][0], shapeCoordinates[i][1]);
            }
            // --- End Shape Creation ---

            // --- Extrusion and Mesh Creation (Same as before) ---
            const extrudeSettings = {
                depth: EXTRUSION_HEIGHT,
                bevelEnabled: false
            };
            const extrusionGeometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
            
            const material = new THREE.MeshPhongMaterial({
                color: new THREE.Color(Math.random(), Math.random(), Math.random()),
                specular: 0x555555,
                shininess: 30
            });

            const mesh = new THREE.Mesh(extrusionGeometry, material);
            mesh.rotation.x = Math.PI / 2;
            
            // Attach data for interactivity
            mesh.userData.id = properties.id || feature.id; 
            mesh.userData.name = properties.name || 'Unknown Region';
            mesh.userData.url = properties.url || `${mesh.userData.id}.html`;
            
            scene.add(mesh);
        });
    });
}


// --- Execute initialization (Update this call) ---
function init() {
    // ... (All initialization code: camera, renderer, lighting, controls) ...
    // ... (Keep existing code from last turn) ...
    
    // START MAP LOADING INSTEAD OF createMap()
    loadGeoJSON(); 

    // Add event listeners for resizing and clicking
    window.addEventListener('resize', onWindowResize);
    renderer.domElement.addEventListener('click', onMapClick);

    // Start the render loop
    animate();
}

init(); // Call init to start the program
