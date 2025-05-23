// Import PGlite correctly
import { PGlite } from 'https://cdn.jsdelivr.net/npm/@electric-sql/pglite/dist/index.js';

// --- Global BroadcastChannel for inter-tab communication ---
// Initialize the BroadcastChannel with a fallback for environments where it might not be available (e.g., some older browser versions or specific testing environments)
const dataChannel = 'BroadcastChannel' in window ?
    new BroadcastChannel('patient_data_channel') :
    { postMessage: () => {}, addEventListener: () => {} }; // Dummy object if BroadcastChannel is not supported

// --- Database Service (Pglite Integration) ---
class PatientDbService {
    constructor() {
        this.db = null;
        this.initializeDb(); // Start database initialization immediately when the service is instantiated
    }

    async initializeDb() {
        // Prevent re-initialization if already connected
        if (this.db) {
            // If DB is already initialized, just ensure content is loaded.
            // This might happen if initializeDb is called multiple times.
            loadContent(window.location.hash.substring(1) || 'register');
            return;
        }

        const loadingStatusDiv = document.getElementById('loadingStatus');
        if (loadingStatusDiv) {
            loadingStatusDiv.textContent = 'Connecting to database...';
        }

        try {
            // Instantiate PGlite with IndexedDB backend for persistence
            this.db = new PGlite('idb://patient_portal_db', { relaxedDurability: true });
            await this.db.waitReady; // Wait for the database to be fully ready

            // Perform a simple test query to confirm connectivity
            await this.db.query('SELECT 1 as test');

            // Create the patients table if it does not already exist
            // Using TEXT for UUIDs, and TIMESTAMP for auto-generated registration time
            await this.db.query(`
                CREATE TABLE IF NOT EXISTS patients (
                    id TEXT PRIMARY KEY,
                    "fullName" TEXT NOT NULL,
                    "dateOfBirth" TEXT NOT NULL,
                    "contactNumber" TEXT,
                    "address" TEXT,
                    "gender" TEXT NOT NULL,
                    "registeredAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            `);

            // Remove the loading status message once the database is set up
            if (loadingStatusDiv) {
                loadingStatusDiv.remove();
            }
            // Load the initial content based on the URL hash or default to 'register'
            loadContent(window.location.hash.substring(1) || 'register');

        } catch (error) {
            // Log and display any errors during database initialization
            console.error('Error initializing database:', error);
            const loadingStatusDiv = document.getElementById('loadingStatus');
            if (loadingStatusDiv) {
                loadingStatusDiv.textContent = `Error loading database: ${error.message}. Check console for details.`;
            }
            alert('Failed to initialize database. Check console for details.');
        }
    }

    async registerPatient(patientData) {
        // Ensure database is initialized before performing operations
        if (!this.db) {
            await this.initializeDb();
            if (!this.db) {
                 throw new Error('Database is still not initialized after retry.');
            }
        }
        
        try {
            // Insert patient data into the 'patients' table
            // RETURNING * allows us to get the newly inserted row, including 'registeredAt'
            const result = await this.db.query(`
                INSERT INTO patients (id, "fullName", "dateOfBirth", "contactNumber", "address", gender)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *;
            `, [
                patientData.id,
                patientData.fullName,
                patientData.dateOfBirth,
                patientData.contactNumber,
                patientData.address,
                patientData.gender
            ]);
            
            // Broadcast a message to other tabs that a new patient has been registered
            dataChannel.postMessage({
                type: 'patient_registered',
                payload: result.rows[0] // Send the full patient object
            });

            return result;
        } catch (error) {
            console.error('Error registering patient:', patientData, error);
            throw error;
        }
    }

    async getAllPatients() {
        // Ensure database is initialized
        if (!this.db) {
            await this.initializeDb();
            if (!this.db) {
                 throw new Error('Database is still not initialized after retry.');
            }
        }
        try {
            // Fetch all patients, ordering by registration time (most recent first)
            const result = await this.db.query(`
                SELECT
                    id,
                    "fullName" as "fullName",
                    "dateOfBirth" as "dateOfBirth",
                    "contactNumber" as "contactNumber",
                    "address" as "address",
                    "gender" as "gender",
                    "registeredAt" as "registeredAt"
                FROM patients
                ORDER BY "registeredAt" DESC
            `);
            return result.rows;
        } catch (error) {
            console.error('Patient query failed:', error);
            throw error;
        }
    }

    // Method to execute arbitrary raw SQL queries
    async executeRawQuery(sqlQuery) {
        // Ensure database is initialized
        if (!this.db) {
            await this.initializeDb();
            if (!this.db) {
                 throw new Error('Database is still not initialized after retry.');
            }
        }
        try {
            const result = await this.db.query(sqlQuery);
            // If the query is a DML or DDL statement (modifies data or schema), broadcast a message
            if (sqlQuery.toLowerCase().match(/insert|update|delete|alter|create|drop/)) {
                dataChannel.postMessage({ type: 'data_modified_by_raw_query' });
            }
            return result; // Returns PGlite query result object
        } catch (error) {
            console.error('Raw SQL query failed:', error);
            throw error;
        }
    }
}

// Instantiate the database service, making it available throughout the script
const patientDbService = new PatientDbService();

// --- DOM Element References ---
const contentArea = document.querySelector('.content-area');
const navLinks = document.querySelectorAll('.nav-link');

// --- Content Loading and Routing ---
// Dynamically loads content into the main content area based on the route
function loadContent(route) {
    let contentHtml = '';
    // Remove 'active' class from all navigation links
    navLinks.forEach(link => link.classList.remove('active'));

    switch (route) {
        case 'register':
            // HTML for the patient registration form
            contentHtml = `
                <div class="registration-container p-8 bg-gray-800 rounded-xl shadow-2xl max-w-2xl mx-auto border border-gray-700">
                    <h2 class="text-text-white text-3xl font-extrabold mb-8 text-center tracking-wide">Register New Patient</h2>
                    <form id="registrationForm" class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                        <div>
                            <label for="fullName" class="block text-gray-200 text-base font-semibold mb-2">Full Name</label>
                            <input type="text" id="fullName" name="fullName" required
                                class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-blue focus:border-transparent transition-all duration-200 ease-in-out">
                        </div>
                        <div>
                            <label for="dateOfBirth" class="block text-gray-200 text-base font-semibold mb-2">Date of Birth</label>
                            <input type="date" id="dateOfBirth" name="dateOfBirth" required
                                class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-blue focus:border-transparent transition-all duration-200 ease-in-out">
                        </div>
                        <div>
                            <label for="contactNumber" class="block text-gray-200 text-base font-semibold mb-2">Contact Number</label>
                            <input type="tel" id="contactNumber" name="contactNumber"
                                class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-blue focus:border-transparent transition-all duration-200 ease-in-out">
                        </div>
                        <div>
                            <label for="gender" class="block text-gray-200 text-base font-semibold mb-2">Gender</label>
                            <select id="gender" name="gender" required
                                class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-text-white focus:outline-none focus:ring-2 focus:ring-accent-blue focus:border-transparent appearance-none leading-tight transition-all duration-200 ease-in-out">
                                <option value="" class="bg-gray-700 text-gray-400">Select Gender</option>
                                <option value="male" class="bg-gray-700">Male</option>
                                <option value="female" class="bg-gray-700">Female</option>
                                <option value="other" class="bg-gray-700">Other</option>
                            </select>
                        </div>
                        <div class="md:col-span-2">
                            <label for="address" class="block text-gray-200 text-base font-semibold mb-2">Address</label>
                            <textarea id="address" name="address" rows="3"
                                class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-blue focus:border-transparent resize-y transition-all duration-200 ease-in-out"></textarea>
                        </div>
                        <div class="md:col-span-2 flex justify-end mt-6">
                            <button type="submit"
                                class="bg-accent-blue text-white py-3 px-8 rounded-full hover:bg-accent-dark-blue transition-all duration-300 ease-in-out font-bold text-lg shadow-lg focus:outline-none focus:ring-2 focus:ring-accent-blue focus:ring-opacity-75">
                                Register Patient
                            </button>
                        </div>
                    </form>
                </div>
            `;
            document.querySelector('[data-route="register"]').classList.add('active');
            contentArea.innerHTML = contentHtml;
            attachFormListeners(); // Attach event listeners to the newly rendered form
            break;

        case 'query':
            // HTML for displaying patient records and raw SQL query interface
            contentHtml = `
                <div class="query-container p-4 bg-bg-medium rounded-lg shadow-md max-w-4xl mx-auto">
                    <h2 class="text-text-white text-2xl font-semibold mb-6 text-center">Patient Records & Raw Query</h2>

                    <h3 class="text-text-white text-xl font-semibold mb-4 mt-6">Registered Patients</h3>
                    <div class="mb-4">
                        <input type="text" id="searchInput" placeholder="Search patients..."
                            class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-blue focus:border-transparent">
                    </div>
                    <div id="patientsTableContainer" class="overflow-x-auto mb-8">
                        <table class="min-w-full bg-gray-800 rounded-lg overflow-hidden">
                            <thead class="bg-gray-700 text-gray-300 uppercase text-sm leading-normal">
                                <tr>
                                    <th class="py-3 px-6 text-left">Full Name</th>
                                    <th class="py-3 px-6 text-left">Date of Birth</th>
                                    <th class="py-3 px-6 text-left">Gender</th>
                                    <th class="py-3 px-6 text-left">Contact</th>
                                    <th class="py-3 px-6 text-left">Address</th>
                                    <th class="py-3 px-6 text-left">Registered</th>
                                </tr>
                            </thead>
                            <tbody class="text-gray-200 text-sm font-light" id="patientsTableBody">
                                <tr><td colspan="6" class="py-4 text-center text-gray-400">Loading patients...</td></tr>
                            </tbody>
                        </table>
                    </div>
                    <div id="noPatientsMessage" class="hidden text-center text-gray-400 text-lg py-8">No patients registered yet.</div>

                    <h3 class="text-text-white text-xl font-semibold mb-4 mt-8">Execute Raw SQL</h3>
                    <div class="mb-4">
                        <textarea id="sqlQueryInput" rows="5" placeholder="Enter SQL query here (e.g., SELECT * FROM patients;)"
                            class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-blue focus:border-transparent font-mono text-sm"></textarea>
                    </div>
                    <div class="flex justify-end mb-4">
                        <button id="executeSqlQueryBtn"
                            class="bg-accent-blue text-white py-2 px-6 rounded-full hover:bg-accent-dark-blue transition-all duration-300 ease-in-out font-bold text-base shadow-lg focus:outline-none focus:ring-2 focus:ring-accent-blue focus:ring-opacity-75">
                            Execute Query
                        </button>
                    </div>
                    <div id="sqlQueryResult" class="bg-gray-800 p-4 rounded-lg overflow-x-auto text-sm">
                        <pre class="text-gray-200 whitespace-pre-wrap" id="sqlQueryResultPre">Query results will appear here.</pre>
                    </div>
                    <div id="sqlQueryError" class="hidden text-red-400 text-sm mt-2"></div>
                </div>
            `;
            document.querySelector('[data-route="query"]').classList.add('active');
            contentArea.innerHTML = contentHtml;
            renderPatientsList(); // Initial render of the patient list
            setupSearch(); // Setup search functionality
            setupRawQueryExecutor(); // Setup raw SQL query functionality
            break;

        case 'about':
            // HTML for the About page
            contentHtml = `
                <div class="about-container p-4 bg-bg-medium rounded-lg shadow-md">
                    <h2 class="text-text-white text-2xl font-semibold mb-4 text-center">About PatientPortal</h2>
                    <p class="text-text-white text-lg">This is a demo application for patient data management using Pglite.</p>
                    <p class="text-gray-400 mt-2">Developed as per the requirements for Medblocks.</p>
                </div>
            `;
            document.querySelector('[data-route="about"]').classList.add('active');
            contentArea.innerHTML = contentHtml;
            break;

        default:
            // If no valid hash is provided, redirect to the 'register' route
            window.location.hash = '#register';
            return;
    }
}

// --- Patient List Rendering Function ---
// Fetches and displays the list of patients, with optional search filtering
async function renderPatientsList(searchTerm = '') {
    const patientsTableBody = document.getElementById('patientsTableBody');
    const noPatientsMessageDiv = document.getElementById('noPatientsMessage');
    const patientsTableContainer = document.getElementById('patientsTableContainer');

    // Essential check: ensure DOM elements exist before proceeding.
    // This function can be called by BroadcastChannel even if the user isn't on the query page.
    if (!patientsTableBody || !noPatientsMessageDiv || !patientsTableContainer) {
        // console.warn('Could not find required DOM elements for patients list. Likely not on the query page.');
        return;
    }

    // Display a loading message while fetching data
    patientsTableBody.innerHTML = '<tr><td colspan="6" class="py-4 text-center text-gray-400">Loading patients...</td></tr>';
    noPatientsMessageDiv.classList.add('hidden'); // Hide "No patients" message
    patientsTableContainer.classList.remove('hidden'); // Ensure table is visible for loading state

    try {
        const patients = await patientDbService.getAllPatients();

        // Filter patients based on the search term if provided
        const filteredPatients = searchTerm
            ? patients.filter(p =>
                Object.values(p).some(val =>
                    val && val.toString().toLowerCase().includes(searchTerm.toLowerCase())
                )
            )
            : patients;

        patientsTableBody.innerHTML = ''; // Clear existing table rows

        if (filteredPatients.length === 0) {
            // Display message if no patients are found (either none registered or none match search)
            noPatientsMessageDiv.textContent = searchTerm
                ? 'No patients match your search.'
                : 'No patients registered yet.';
            noPatientsMessageDiv.classList.remove('hidden');
            patientsTableContainer.classList.add('hidden'); // Hide the table itself
        } else {
            noPatientsMessageDiv.classList.add('hidden'); // Hide no-patients message
            patientsTableContainer.classList.remove('hidden'); // Show the table

            // Populate the table with filtered patient data
            filteredPatients.forEach(patient => {
                const row = document.createElement('tr');
                row.classList.add('border-b', 'border-gray-700', 'hover:bg-gray-700');
                row.innerHTML = `
                    <td class="py-3 px-6 text-left whitespace-nowrap">${patient.fullName || 'N/A'}</td>
                    <td class="py-3 px-6 text-left">${patient.dateOfBirth || 'N/A'}</td>
                    <td class="py-3 px-6 text-left">${patient.gender || 'N/A'}</td>
                    <td class="py-3 px-6 text-left">${patient.contactNumber || 'N/A'}</td>
                    <td class="py-3 px-6 text-left">${patient.address || 'N/A'}</td>
                    <td class="py-3 px-6 text-left">${
                        patient.registeredAt ? new Date(patient.registeredAt).toLocaleString() : 'N/A'
                    }</td>
                `;
                patientsTableBody.appendChild(row);
            });
        }
    } catch (error) {
        console.error('Error rendering patients list:', error);
        patientsTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="py-4 text-center text-red-400">
                    Error loading patients: ${error.message}
                </td>
            </tr>
        `;
        noPatientsMessageDiv.classList.add('hidden'); // Ensure message is hidden on error
        patientsTableContainer.classList.remove('hidden'); // Ensure table is visible for error message
    }
}

// --- Search Functionality Setup ---
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                renderPatientsList(e.target.value);
            }, 300); // Debounce: wait 300ms after last input to search
        });
    }
}

// --- Raw SQL Query Executor Functionality Setup ---
function setupRawQueryExecutor() {
    const sqlQueryInput = document.getElementById('sqlQueryInput');
    const executeSqlQueryBtn = document.getElementById('executeSqlQueryBtn');
    const sqlQueryResultPre = document.getElementById('sqlQueryResultPre');
    const sqlQueryErrorDiv = document.getElementById('sqlQueryError');

    // Ensure all required DOM elements exist
    if (!sqlQueryInput || !executeSqlQueryBtn || !sqlQueryResultPre || !sqlQueryErrorDiv) {
        // console.warn('Could not find required DOM elements for raw SQL query executor. Likely not on the query page.');
        return;
    }

    // Clear previous results/errors when function is called (e.g., on page load)
    sqlQueryResultPre.textContent = 'Query results will appear here.';
    sqlQueryErrorDiv.classList.add('hidden');

    // Add click listener to the execute button
    executeSqlQueryBtn.addEventListener('click', async () => {
        const sqlQuery = sqlQueryInput.value.trim();
        sqlQueryResultPre.textContent = 'Executing query...';
        sqlQueryErrorDiv.classList.add('hidden'); // Hide any previous errors

        if (!sqlQuery) {
            sqlQueryResultPre.textContent = 'Please enter a SQL query.';
            return;
        }

        try {
            const result = await patientDbService.executeRawQuery(sqlQuery);

            let output = '';
            if (result.rows && result.rows.length > 0) {
                // If the query returns rows (e.g., SELECT), display them as formatted JSON
                output = JSON.stringify(result.rows, null, 2);
            } else if (result.command) {
                // For DDL/DML commands (CREATE, INSERT, UPDATE, DELETE), show command and row count
                output = `Command: ${result.command}\nRows affected: ${result.rowCount || 0}`;
            } else {
                // Generic success message for other queries (e.g., SET, BEGIN)
                output = 'Query executed successfully with no specific rows returned.';
            }
            sqlQueryResultPre.textContent = output;
        } catch (error) {
            // Display error messages for failed queries
            sqlQueryResultPre.textContent = `Error: ${error.message}`;
            sqlQueryErrorDiv.textContent = `SQL Error: ${error.message}`;
            sqlQueryErrorDiv.classList.remove('hidden');
            console.error('Raw SQL Query Execution Error:', error);
        }
    });
}

// --- Unique ID Generation ---
// Generates a simple unique ID for new patients
// (Could be replaced with UUIDs for more robust unique identification)
function generateUniqueId() {
    return 'patient_' + Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// --- Form Submission Listener ---
// Attaches the submit event listener to the registration form
function attachFormListeners() {
    const registrationForm = document.getElementById('registrationForm');
    if (registrationForm) {
        registrationForm.addEventListener('submit', async (event) => {
            event.preventDefault(); // Prevent default browser form submission
            const formData = new FormData(registrationForm); // Get form data

            const patientData = {
                id: generateUniqueId(),
                fullName: formData.get('fullName'),
                dateOfBirth: formData.get('dateOfBirth'),
                contactNumber: formData.get('contactNumber'),
                address: formData.get('address'),
                gender: formData.get('gender')
            };

            try {
                await patientDbService.registerPatient(patientData);
                alert('Patient registered successfully!'); // Provide user feedback
                registrationForm.reset(); // Clear the form fields
                
                // If the user is currently on the 'query' page in THIS tab, refresh its list immediately
                if (window.location.hash.substring(1) === 'query') {
                    renderPatientsList();
                }

            } catch (error) {
                alert('Failed to register patient. Check console for details.');
            }
        });
    }
}

// --- Event Listeners for Routing and Initial Application Load ---

// Listen for changes in the URL hash (e.g., when navigation links are clicked or back/forward buttons are used)
window.addEventListener('hashchange', () => {
    const route = window.location.hash.substring(1); // Extract the route from the hash (e.g., '#register' -> 'register')
    loadContent(route);
});

// Attach click listeners to all navigation links
navLinks.forEach(link => {
    link.addEventListener('click', (event) => {
        event.preventDefault(); // Prevent the default link behavior (page reload)
        const route = event.target.dataset.route; // Get the target route from the 'data-route' attribute
        window.location.hash = `#${route}`; // Update the URL hash, which triggers the 'hashchange' event listener
    });
});

// Initialize the application when the DOM is fully loaded
window.addEventListener('DOMContentLoaded', () => {
    // Load initial content based on the current URL hash or default to 'register'
    loadContent(window.location.hash.substring(1) || 'register');

    // Listen for real-time updates from other tabs via BroadcastChannel
    dataChannel.addEventListener('message', (event) => {
        if (!event.data) return; // Ignore empty messages

        switch (event.data.type) {
            case 'patient_registered':
                console.log('New patient added in another tab:', event.data.payload);
                // If the current tab is on the 'query' page, update the UI
                if (window.location.hash.substring(1) === 'query') {
                    // Create and display a temporary notification
                    const notification = document.createElement('div');
                    notification.className = 'bg-green-500 text-white p-2 mb-4 rounded text-center animate-pulse';
                    notification.textContent = 'New patient added! Updating list...';
                    const queryContainer = document.querySelector('.query-container');
                    if (queryContainer) queryContainer.prepend(notification); // Add notification to the top of the query container
                    
                    // Refresh the patient list and remove the notification after a short delay
                    setTimeout(() => {
                        renderPatientsList(); // Re-fetch and re-render the patient list
                        if (notification) notification.remove(); // Remove the notification
                    }, 1000); // 1-second delay
                }
                break;

            case 'data_modified_by_raw_query':
                // If the current tab is on the 'query' page, re-render the patient list
                // (No specific notification for raw query changes, just update the data)
                if (window.location.hash.substring(1) === 'query') {
                    renderPatientsList();
                    // Optionally, if you want raw query results to refresh automatically:
                    // This block was present in a previous iteration but removed for simplicity.
                    // If you re-add it, ensure the elements exist before clicking.
                    /*
                    setTimeout(() => {
                        const executeSqlQueryBtn = document.getElementById('executeSqlQueryBtn');
                        const sqlQueryInput = document.getElementById('sqlQueryInput');
                        if (executeSqlQueryBtn && sqlQueryInput && sqlQueryInput.value.trim()) {
                            console.log('Re-executing raw SQL query due to broadcast.');
                            executeSqlQueryBtn.click();
                        }
                    }, 50);
                    */
                }
                break;
        }
    });
});

// Add CSS for the notification animation
const style = document.createElement('style');
style.textContent = `
    .animate-pulse {
        animation: pulse 1.5s infinite;
    }
    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
    }
`;
document.head.appendChild(style);