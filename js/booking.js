// Customer Booking JavaScript

document.addEventListener('DOMContentLoaded', function () {
    console.log('DOM fully loaded');
    // Initialize Firebase
    const firebaseConfig = window.appConfig.firebase;
    console.log('Firebase config:', firebaseConfig);

    // Check if Firebase is already initialized
    if (!firebase.apps.length) {
        try {
            firebase.initializeApp(firebaseConfig);
            console.log('Firebase initialized successfully');
        } catch (error) {
            console.error('Error initializing Firebase:', error);
            alert('Error initializing Firebase. Please check console for details.');
            return;
        }
    }

    // Initialize Firestore
    let db;
    try {
        db = firebase.firestore();
        console.log('Firestore instance created');
    } catch (error) {
        console.error('Error creating Firestore instance:', error);
        alert('Error connecting to database. Please check console for details.');
        return;
    }

    // Initialize EmailJS
    emailjs.init(window.appConfig.emailjs.userId);

    // Get form elements
    const serviceSelect = document.getElementById('service-select');
    const bookingForm = document.getElementById('booking-form');
    const bookAppointmentBtn = document.getElementById('book-appointment-btn');
    const customerNameInput = document.getElementById('customer-name');
    const customerPhoneInput = document.getElementById('customer-phone');
    const customerEmailInput = document.getElementById('customer-email');
    const customerNotesInput = document.getElementById('customer-notes');

    console.log('Form elements initialized:', {
        serviceSelect: !!serviceSelect,
        bookingForm: !!bookingForm,
        bookAppointmentBtn: !!bookAppointmentBtn,
        customerNameInput: !!customerNameInput,
        customerPhoneInput: !!customerPhoneInput,
        customerEmailInput: !!customerEmailInput,
        customerNotesInput: !!customerNotesInput
    });

    // Add a new time slot select element
    const timeSlotSelect = document.createElement('select');
    timeSlotSelect.className = 'form-select';
    timeSlotSelect.id = 'time-slot-select';
    timeSlotSelect.required = true;
    const timeSlotLabel = document.createElement('label');
    timeSlotLabel.htmlFor = 'time-slot-select';
    timeSlotLabel.className = 'form-label';
    timeSlotLabel.textContent = 'Select Time';

    // Insert after the date picker
    const datePickerInput = document.getElementById('appointment-date');
    datePickerInput.parentNode.insertBefore(timeSlotLabel, datePickerInput.nextSibling);
    datePickerInput.parentNode.insertBefore(timeSlotSelect, timeSlotLabel.nextSibling);

    timeSlotSelect.innerHTML = '<option value="" selected disabled>Choose a time...</option>';

    datePickerInput.addEventListener('change', updateAvailableTimeSlots);
    serviceSelect.addEventListener('change', updateAvailableTimeSlots);

    // Use flatpickr for date only
    const datePicker = flatpickr('#appointment-date', {
        enableTime: false,
        dateFormat: "Y-m-d",
        minDate: "today",
        maxDate: new Date().fp_incr(window.appConfig.maxAdvanceBookingDays),
        disable: [
            function (date) {
                // Disable weekends
                return (date.getDay() === 0 || date.getDay() === 6);
            }
        ],
        locale: {
            firstDayOfWeek: 1 // Monday
        },
        onChange: function () {
            updateAvailableTimeSlots();
        }
    });

    // Handle "Book Now" button clicks - using event delegation for better reliability
    document.getElementById('service-list').addEventListener('click', function (e) {
        const button = e.target.closest('.book-service-btn');
        if (button) {
            e.preventDefault();
            const serviceId = button.getAttribute('data-service-id');
            if (serviceSelect && serviceId) {
                serviceSelect.value = serviceId;
            }

            document.getElementById('booking').scrollIntoView({ behavior: 'smooth' });

            if (bookingForm) {
                bookingForm.classList.add('highlight-form');
                setTimeout(() => {
                    bookingForm.classList.remove('highlight-form');
                }, 1500);
            }
        }
    });

    // Handle form submission
    if (bookAppointmentBtn) {
        console.log('Book Appointment button found, attaching click event');
        bookAppointmentBtn.addEventListener('click', function (e) {
            e.preventDefault();
            console.log('Book Appointment button clicked');
            processBookingForm();
        });
    }

    if (bookingForm) {
        console.log('Booking form found, attaching submit event');
        bookingForm.onsubmit = function (e) {
            console.log('Form submitted');
            e.preventDefault();
            processBookingForm();
            return false;
        };
    }

    // Function to validate email format
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Function to validate phone number format
    function isValidPhone(phone) {
        const phoneRegex = /^\+?[\d\s-]{10,}$/;
        return phoneRegex.test(phone);
    }

    // Function to check for overlapping appointments
    async function checkOverlappingAppointments(serviceId, appointmentDate) {
        const service = window.services.find(s => s.id === serviceId);
        if (!service) return true;

        const appointmentEnd = new Date(appointmentDate.getTime() + service.duration * 60000);

        const bookings = await db.collection('bookings')
            .where('status', 'in', ['pending', 'confirmed'])
            .get();

        for (const doc of bookings.docs) {
            const booking = doc.data();
            const bookingDate = booking.appointmentDate.toDate();
            const bookingService = window.services.find(s => s.id === booking.serviceId);
            if (!bookingService) continue;

            const bookingEnd = new Date(bookingDate.getTime() + bookingService.duration * 60000);

            if (appointmentDate < bookingEnd && appointmentEnd > bookingDate) {
                return true;
            }
        }

        return false;
    }

    // Function to process the booking form
    async function processBookingForm() {
        console.log('Processing booking form');
        try {
            const serviceId = serviceSelect.value;
            if (!serviceId) {
                alert('Please select a service');
                return;
            }
            const service = window.services.find(s => s.id === serviceId);
            if (!service) {
                alert('Please select a valid service');
                return;
            }
            if (!datePickerInput.value || !timeSlotSelect.value) {
                alert('Please select an appointment date and time');
                return;
            }
            const appointmentDate = new Date(timeSlotSelect.value);
            const customerName = customerNameInput.value.trim();
            const customerPhone = customerPhoneInput.value.trim();
            const customerEmail = customerEmailInput.value.trim();
            const customerNotes = customerNotesInput.value.trim();
            if (!customerName || !customerPhone || !customerEmail) {
                alert('Please fill in all required fields');
                return;
            }
            if (!isValidEmail(customerEmail)) {
                alert('Please enter a valid email address');
                return;
            }
            if (!isValidPhone(customerPhone)) {
                alert('Please enter a valid phone number');
                return;
            }
            // No need to check for overlap, already filtered
            const bookingId = generateBookingId();
            const booking = {
                id: bookingId,
                serviceId: serviceId,
                serviceName: service.name,
                servicePrice: service.price,
                serviceDuration: service.duration,
                appointmentDate: firebase.firestore.Timestamp.fromDate(appointmentDate),
                customerName: customerName,
                customerPhone: customerPhone,
                customerEmail: customerEmail,
                customerNotes: customerNotes,
                status: 'pending',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            try {
                const db = firebase.firestore();
                const docRef = db.collection('bookings').doc(bookingId);
                await docRef.set(booking);

                // Send email notification
                const emailSent = await sendEmailNotification(booking);
                if (!emailSent) {
                    console.warn('Failed to send email notification');
                }

                showConfirmation(booking);
                bookingForm.reset();
                datePicker.clear();
                timeSlotSelect.innerHTML = '<option value="" selected disabled>Choose a time...</option>';
            } catch (error) {
                console.error('Error saving to Firestore:', error);
                alert('There was an error saving your booking. Please try again. Error: ' + error.message);
            }
        } catch (error) {
            console.error('Error in processBookingForm:', error);
            alert('There was an error processing your booking. Please try again. Error: ' + error.message);
        }
    }

    // Function to generate a unique booking ID
    function generateBookingId() {
        const timestamp = new Date().getTime().toString(36);
        const randomStr = Math.random().toString(36).substring(2, 8);
        return `BK-${timestamp}-${randomStr}`.toUpperCase();
    }

    // Function to send email notification
    async function sendEmailNotification(booking) {
        try {
            console.log('Preparing to send email with booking:', booking);

            // Example of what the actual values look like:
            // If booking.customerEmail is "john@example.com"
            // and window.appConfig.businessName is "My Business"
            // then templateParams will be:
            const templateParams = {
                to_email: booking.customerEmail,        // e.g., "john@example.com"
                from_name: window.appConfig.businessName, // e.g., "My Business"
                reply_to: window.appConfig.businessEmail, // e.g., "business@example.com"
                customer_name: booking.customerName,     // e.g., "John Doe"
                business_name: window.appConfig.businessName, // e.g., "My Business"
                service_name: booking.serviceName,       // e.g., "Deluxe Service"
                appointment_date: booking.appointmentDate.toDate().toLocaleDateString(), // e.g., "5/27/2025"
                appointment_time: booking.appointmentDate.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), // e.g., "10:30 AM"
                service_duration: booking.serviceDuration, // e.g., 120
                service_price: booking.servicePrice.toFixed(2), // e.g., "129.99"
                booking_id: booking.id,                  // e.g., "BK-123456"
                business_email: window.appConfig.businessEmail, // e.g., "business@example.com"
                business_phone: window.appConfig.businessPhone  // e.g., "+1234567890"
            };

            console.log('Template parameters:', templateParams);
            console.log('Using service ID:', window.appConfig.emailjs.serviceId);
            console.log('Using template ID:', window.appConfig.emailjs.templateId);

            // Send the email with actual values
            const response = await emailjs.send(
                window.appConfig.emailjs.serviceId,
                window.appConfig.emailjs.templateId,
                templateParams
            );

            console.log('EmailJS response:', response);
            return true;
        } catch (error) {
            console.error('Detailed error sending email:', {
                message: error.message,
                text: error.text,
                status: error.status,
                stack: error.stack
            });
            return false;
        }
    }

    // Function to show confirmation modal
    function showConfirmation(booking) {
        console.log('Showing confirmation modal for booking:', booking);
        const modal = new bootstrap.Modal(document.getElementById('confirmation-modal'));
        const confirmationDetails = document.getElementById('confirmation-details');

        const appointmentDate = booking.appointmentDate.toDate();
        const formattedDate = appointmentDate.toLocaleDateString();
        const formattedTime = appointmentDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        confirmationDetails.innerHTML = `
            <div class="confirmation-receipt" id="receipt-content">
                <h4 class="text-center">Booking Confirmation</h4>
                <div class="detail-row">
                    <div class="detail-label">Service:</div>
                    <div class="detail-value">${booking.serviceName}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Price:</div>
                    <div class="detail-value">$${booking.servicePrice.toFixed(2)}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Date:</div>
                    <div class="detail-value">${formattedDate}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Time:</div>
                    <div class="detail-value">${formattedTime}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Name:</div>
                    <div class="detail-value">${booking.customerName}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Email:</div>
                    <div class="detail-value">${booking.customerEmail}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Phone:</div>
                    <div class="detail-value">${booking.customerPhone}</div>
                </div>
                <div class="text-center confirmation-id">
                    Booking ID: ${booking.id}
                </div>
            </div>
            <p class="text-center">Thank you for your booking! We'll contact you shortly to confirm your appointment.</p>
        `;

        // Save receipt functionality
        document.getElementById('save-confirmation').addEventListener('click', function () {
            const receiptContent = document.getElementById('receipt-content');

            html2canvas(receiptContent).then(canvas => {
                const link = document.createElement('a');
                link.download = `booking-receipt-${booking.id}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
            });
        });

        modal.show();
    }

    async function updateAvailableTimeSlots() {
        timeSlotSelect.innerHTML = '<option value="" selected disabled>Choose a time...</option>';
        const serviceId = serviceSelect.value;
        const dateStr = datePickerInput.value;
        if (!serviceId || !dateStr) {
            console.log('No service or date selected.');
            return;
        }
        const service = window.services.find(s => s.id === serviceId);
        if (!service) {
            console.log('Service not found for ID:', serviceId);
            return;
        }

        // Get business hours for the selected day
        const date = new Date(dateStr);
        const dayOfWeek = date.getDay();
        const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dayOfWeek];
        const hours = window.appConfig.businessHours[dayName];
        console.log('Selected service:', service);
        console.log('Selected date:', dateStr, date);
        console.log('Business hours for this day:', hours);
        if (!hours.open || !hours.close) {
            console.log('No business hours set for this day.');
            return;
        }
        const [openHour, openMinute] = hours.open.split(':').map(Number);
        const [closeHour, closeMinute] = hours.close.split(':').map(Number);
        const openTime = openHour * 60 + openMinute;
        const closeTime = closeHour * 60 + closeMinute;
        const duration = service.duration;
        const slotStep = window.appConfig.timeSlotDuration || 15; // e.g., 15 min steps
        console.log('Open:', openTime, 'Close:', closeTime, 'Duration:', duration, 'Slot step:', slotStep);

        // Fetch existing bookings for this day
        const db = firebase.firestore();
        const startOfDay = new Date(dateStr + 'T00:00:00');
        const endOfDay = new Date(dateStr + 'T23:59:59');
        const bookingsSnap = await db.collection('bookings')
            .where('serviceId', '==', serviceId)
            .where('status', 'in', ['pending', 'confirmed'])
            .get();
        const bookings = bookingsSnap.docs.map(doc => doc.data()).filter(b => {
            const d = b.appointmentDate.toDate();
            return d >= startOfDay && d <= endOfDay;
        });
        console.log('Existing bookings:', bookings);

        // Build a list of unavailable time ranges
        const unavailable = bookings.map(b => {
            const start = b.appointmentDate.toDate();
            const end = new Date(start.getTime() + service.duration * 60000);
            return [start, end];
        });

        let slotCount = 0;
        // Generate all possible slots
        for (let mins = openTime; mins + duration <= closeTime; mins += slotStep) {
            const slotStart = new Date(dateStr + 'T00:00:00');
            slotStart.setMinutes(mins);
            const slotEnd = new Date(slotStart.getTime() + duration * 60000);
            // Check for overlap
            let overlaps = false;
            for (const [unavailStart, unavailEnd] of unavailable) {
                if (slotStart < unavailEnd && slotEnd > unavailStart) {
                    overlaps = true;
                    break;
                }
            }
            if (!overlaps) {
                const label = slotStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const value = slotStart.toISOString();
                const option = document.createElement('option');
                option.value = value;
                option.textContent = label;
                timeSlotSelect.appendChild(option);
                slotCount++;
            }
        }
        if (slotCount === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'No available times for this day.';
            option.disabled = true;
            timeSlotSelect.appendChild(option);
            console.log('No available time slots for this day.');
        } else {
            console.log('Available slots:', slotCount);
        }
    }
});
