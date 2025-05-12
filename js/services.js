// Shared Services

// Remove or override the default hardcoded services
window.services = [];

// Function to update the UI with services
function updateServicesUI() {
    const serviceList = document.getElementById('service-list');
    const serviceSelect = document.getElementById('service-select');

    if (!serviceList || !serviceSelect) {
        return;
    }

    // Clear existing content
    serviceList.innerHTML = '';
    serviceSelect.innerHTML = '<option value="" selected disabled>Choose a service...</option>';

    if (!window.services || window.services.length === 0) {
        serviceList.innerHTML = '<div class="col-12 text-center"><p class="text-muted">No services available at this time. Please check back later.</p></div>';
        return;
    }

    // Add services to the list
    window.services.forEach((service) => {
        // Add service card to services section
        const serviceCard = document.createElement('div');
        serviceCard.className = 'col mb-5';
        serviceCard.innerHTML = `
            <div class="card service-card h-100">
                <img class="card-img-top" src="${service.image}" alt="${service.name}">
                <div class="card-body p-4">
                    <div class="text-center">
                        <h5 class="fw-bolder">${service.name}</h5>
                        <div class="service-duration">${service.duration} minutes</div>
                        <div class="service-price">$${service.price.toFixed(2)}</div>
                    </div>
                </div>
                <div class="card-footer p-4 pt-0 border-top-0 bg-transparent">
                    <div class="text-center">
                        <button class="btn btn-outline-primary mt-auto book-service-btn" data-service-id="${service.id}">Book Now</button>
                    </div>
                </div>
            </div>
        `;
        serviceList.appendChild(serviceCard);

        // Add service option to select dropdown
        const option = document.createElement('option');
        option.value = service.id;
        option.textContent = `${service.name} - $${service.price.toFixed(2)}`;
        serviceSelect.appendChild(option);
    });
}

// Initialize Firebase and load services from Firestore
function loadServicesFromFirestore() {
    const db = firebase.firestore();
    db.collection('config').doc('services').get()
        .then(doc => {
            if (doc.exists && doc.data().services) {
                window.services = doc.data().services;
                updateServicesUI();
            } else {
                window.services = [];
                updateServicesUI();
            }
        })
        .catch(error => {
            window.services = [];
            updateServicesUI();
        });
}

document.addEventListener('DOMContentLoaded', function () {
    if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
        loadServicesFromFirestore();
    } else {
        // Wait for Firebase to be initialized
        const checkFirebase = setInterval(function () {
            if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
                clearInterval(checkFirebase);
                loadServicesFromFirestore();
            }
        }, 100);
    }
});

// Save default services to Firestore
function saveDefaultServices() {
    const db = firebase.firestore();

    // Validate default services
    try {
        window.services.forEach(validateService);

        db.collection('config').doc('services').set({
            services: window.services
        })
            .then(() => {
                updateServicesUI();
            })
            .catch(error => {
                updateServicesUI();
            });
    } catch (error) {
        updateServicesUI();
    }
}

// Validate service object
function validateService(service) {
    if (!service.id || typeof service.id !== 'string') {
        throw new Error('Service must have a valid string ID');
    }
    if (!service.name || typeof service.name !== 'string') {
        throw new Error('Service must have a valid name');
    }
    if (typeof service.price !== 'number' || service.price <= 0) {
        throw new Error('Service must have a valid positive price');
    }
    if (typeof service.duration !== 'number' || service.duration <= 0) {
        throw new Error('Service must have a valid positive duration');
    }
    if (!service.image || typeof service.image !== 'string') {
        throw new Error('Service must have a valid image URL');
    }
    return true;
}
