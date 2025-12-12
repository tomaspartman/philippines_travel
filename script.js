// Data structure to hold the descriptions for each region
const regionData = {
    // Keys match the IDs in the SVG map (luzon, visayas, mindanao)
    'luzon': {
        name: 'Luzon: The Northern Adventure',
        description: 'From the bustling streets of Manila to the ancient rice terraces of Banaue, Luzon was a journey of contrast and history.',
        url: 'luzon.html'
    },
    'visayas': {
        name: 'Visayas: Island Hopping Paradise',
        description: 'Breathtaking beaches, crystal clear waters, and world-class diving were the highlights of my time in the central islands.',
        url: 'visayas.html'
    },
    'mindanao': {
        name: 'Mindanao: Rich Culture and Nature',
        description: 'I explored the diverse traditions and stunning natural parks in the southern part of the Philippines, a truly unique experience.',
        url: 'mindanao.html'
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // Get all clickable map regions (the path elements inside the SVG)
    const mapRegions = document.querySelectorAll('#ph-map path');
    
    // Get the modal elements
    const modal = document.getElementById('info-modal');
    const closeButton = document.querySelector('.close-button');
    const modalRegionName = document.getElementById('modal-region-name');
    const modalDescription = document.getElementById('modal-description');
    const modalDetailsLink = document.getElementById('modal-details-link');

    // 1. Add click listeners to all map regions
    mapRegions.forEach(region => {
        region.addEventListener('click', function() {
            // Get the ID of the clicked path element
            const regionId = this.id; 
            const data = regionData[regionId];

            if (data) {
                // Populate the modal content with data
                modalRegionName.textContent = data.name;
                modalDescription.textContent = data.description;
                modalDetailsLink.href = data.url; // Set the redirect link
                
                // Show the modal
                modal.style.display = 'block';
            } else {
                console.log(`No data found for region: ${regionId}`);
            }
        });
    });

    // 2. Close the modal when the user clicks on (x)
    closeButton.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    // 3. Close the modal when the user clicks anywhere outside of the modal content
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
});
