// Add these new global variables to the top of your script.js file
let scaleFactor = 1;
let centerOffset = new THREE.Vector2(0, 0);


// --- NEW Helper Function to Project Coordinates ---
// This function calculates the necessary scale and offset 
// to translate real-world (lon/lat) GeoJSON coordinates 
// into small, centered coordinates for Three.js.
function projectCoordinates(coords, mapCenter) {
    if (coords.length === 0) return coords;

    // 1. Calculate the bounding box (min/max lon/lat)
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
    
    // Determine a scale factor to fit the map into a reasonable size (e.g., 500x500)
    // We adjust the scale based on the largest dimension to maintain aspect ratio
    scaleFactor = Math.min(500 / lonRange, 500 / latRange) || 1; 

    // Calculate the center offset (to shift the map center to a target point, e.g., (250, 250))
    const centerLon = (minLon + maxLon) / 2;
    const centerLat = (minLat + maxLat) / 2;
    
    centerOffset.x = mapCenter.x - (centerLon * scaleFactor);
    centerOffset.y = mapCenter.y - (centerLat * scaleFactor);

    console.log(`Projection calculated: Scale=${scaleFactor}, Offset=(${centerOffset.x}, ${centerOffset.y})`);
}


// --- REPLACEMENT for the EXISTING loadGeoJSON function ---
// This new version calls projectCoordinates first.
function loadGeoJSON() {
    // We assume the GeoJSON data will roughly center around (250, 250) in our scene.
    const mapCenter = new THREE.Vector2(250, 250); 
    
    // Placeholder GeoJSON data for fallback (now uses slightly larger numbers to simulate real data)
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
            // Find ALL coordinates to calculate global bounding box
            let allCoords = [];
            data.features.forEach(feature => {
                const geometry = feature.geometry;
                const coordinatesArray = (geometry.type === 'MultiPolygon') 
                                        ? geometry.coordinates.flat(2) 
                                        : geometry.coordinates.flat(1);
                allCoords.push(...coordinatesArray);
            });

            // 1. Calculate the projection scale and offset
            projectCoordinates(allCoords, mapCenter);
            
            // 2. Create the map with the calculated projection
            createMap(data);
        })
        .catch(error => {
            console.error("Error loading GeoJSON data:", error);
            // Fallback: Calculate projection based on the simple fallback data
            projectCoordinates(fallbackGeoJSON.features.map(f => f.geometry.coordinates).flat(2), mapCenter);
            createMap(fallbackGeoJSON);
        });
}


// --- MODIFICATION in the EXISTING createMap function ---
// We need to apply the scaleFactor and centerOffset to every point.
function createMap(geojson) {
    // ... (Keep the scene clearing code here) ...
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
            
            // --- MODIFIED COORDINATE APPLICATION ---
            // Apply scale and offset to the starting point
            const startX = shapeCoordinates[0][0] * scaleFactor + centerOffset.x;
            const startY = shapeCoordinates[0][1] * scaleFactor + centerOffset.y;
            shape.moveTo(startX, startY);
            
            for (let i = 1; i < shapeCoordinates.length; i++) {
                // Apply scale and offset to all subsequent points
                const currentX = shapeCoordinates[i][0] * scaleFactor + centerOffset.x;
                const currentY = shapeCoordinates[i][1] * scaleFactor + centerOffset.y;
                shape.lineTo(currentX, currentY);
            }
            // --- END MODIFIED COORDINATE APPLICATION ---

            // ... (Keep the rest of the shape creation and mesh creation code here, unchanged) ...
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
            mesh.rotation.x = Math.PI / 2;
            
            // Attach data for interactivity
            mesh.userData.id = properties.id || feature.id; 
            mesh.userData.name = properties.name || 'Unknown Region';
            mesh.userData.url = properties.url || `${mesh.userData.id}.html`;
            mesh.userData.originalColor = initialColor;
            
            scene.add(mesh);
        });
    });
}
