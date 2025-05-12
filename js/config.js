// Shared Configuration

/**
 * Global configuration object for the application
 * @type {Object}
 */
window.appConfig = {
    /**
     * Firebase configuration
     * @type {Object}
     */
    firebase: {
        apiKey: "AIzaSyDcQDlngQhjaMD7nC9ELKAv_MFxSHnKDsU",
        authDomain: "store-ea0a6.firebaseapp.com",
        projectId: "store-ea0a6",
        storageBucket: "store-ea0a6.firebasestorage.app",
        messagingSenderId: "647069208771",
        appId: "1:647069208771:web:18a6dcfa258d6f1811d276",
        measurementId: "G-7B63VZVLTJ"
    },

    /**
     * EmailJS configuration for sending emails (optional)
     * @type {Object}
     */
    emailjs: {
        userId: "b5SoGilvy7eFO3neC",
        serviceId: "service_m7syzby",
        templateId: "template_uap4gtr",
    },

    /**
     * Business information
     * @type {Object}
     */
    businessName: "Service Business",
    businessPhone: "+1234567890",
    businessEmail: "fadybottros@gmail.com",
    businessAddress: "123 Main Street, City, State, ZIP",

    /**
     * Owner email for authentication and notifications
     * @type {string}
     */
    ownerEmail: "owner@gmail.com",

    /**
     * Business hours configuration
     * @type {Object}
     */
    businessHours: {
        monday: { open: "09:00", close: "23:00" },
        tuesday: { open: "09:00", close: "23:00" },
        wednesday: { open: "09:00", close: "23:00" },
        thursday: { open: "09:00", close: "23:00" },
        friday: { open: "09:00", close: "23:00" },
        saturday: { open: "09:00", close: "23:00" },
        sunday: { open: "", close: "" }
    },

    /**
     * Time slot duration in minutes
     * @type {number}
     */
    timeSlotDuration: 30,

    /**
     * Maximum days in advance for booking
     * @type {number}
     */
    maxAdvanceBookingDays: 30
};

// Validate configuration
function validateConfig() {
    const config = window.appConfig;

    // Validate Firebase config
    if (!config.firebase || typeof config.firebase !== 'object') {
        throw new Error('Firebase configuration is required');
    }

    const requiredFirebaseFields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
    for (const field of requiredFirebaseFields) {
        if (!config.firebase[field] || config.firebase[field].includes('YOUR_')) {
            throw new Error(`Firebase ${field} is required`);
        }
    }

    // EmailJS config is optional for now
    if (config.emailjs && typeof config.emailjs === 'object') {
        const requiredEmailJsFields = ['userId', 'serviceId', 'templateId', 'statusTemplateId'];
        for (const field of requiredEmailJsFields) {
            if (config.emailjs[field] && config.emailjs[field].includes('YOUR_')) {
                console.warn(`EmailJS ${field} is not configured`);
            }
        }
    }

    // Validate business information
    if (!config.businessName || typeof config.businessName !== 'string') {
        throw new Error('Business name is required');
    }

    if (!config.businessPhone || typeof config.businessPhone !== 'string') {
        throw new Error('Business phone is required');
    }

    if (!config.businessEmail || typeof config.businessEmail !== 'string') {
        throw new Error('Business email is required');
    }

    if (!config.businessAddress || typeof config.businessAddress !== 'string') {
        throw new Error('Business address is required');
    }

    // Validate owner email
    if (!config.ownerEmail || typeof config.ownerEmail !== 'string') {
        throw new Error('Owner email is required');
    }

    // Validate business hours
    if (!config.businessHours || typeof config.businessHours !== 'object') {
        throw new Error('Business hours configuration is required');
    }

    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    for (const day of days) {
        if (!config.businessHours[day] || typeof config.businessHours[day] !== 'object') {
            throw new Error(`Business hours for ${day} is required`);
        }

        const hours = config.businessHours[day];
        if (hours.open && !isValidTimeFormat(hours.open)) {
            throw new Error(`Invalid open time format for ${day}`);
        }
        if (hours.close && !isValidTimeFormat(hours.close)) {
            throw new Error(`Invalid close time format for ${day}`);
        }
    }

    // Validate time slot duration
    if (typeof config.timeSlotDuration !== 'number' || config.timeSlotDuration <= 0) {
        throw new Error('Time slot duration must be a positive number');
    }

    // Validate max advance booking days
    if (typeof config.maxAdvanceBookingDays !== 'number' || config.maxAdvanceBookingDays <= 0) {
        throw new Error('Maximum advance booking days must be a positive number');
    }
}

// Validate time format (HH:mm)
function isValidTimeFormat(time) {
    if (typeof time !== 'string') return false;
    const [hours, minutes] = time.split(':').map(Number);
    return !isNaN(hours) && !isNaN(minutes) &&
        hours >= 0 && hours <= 23 &&
        minutes >= 0 && minutes <= 59;
}

// Validate configuration on load
try {
    validateConfig();
    console.log('Configuration validated successfully');
} catch (error) {
    console.error('Configuration validation failed:', error);
    // You might want to show a user-friendly error message here
}
