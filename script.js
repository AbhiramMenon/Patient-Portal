
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
  <div class="registration-container bg-card-bg p-8 rounded-xl shadow-lg border border-border-default max-w-3xl w-full mx-auto">
    <div class="text-center mb-8">
      <h2 class="text-3xl font-bold text-text-light mb-2">Register New Patient</h2>
      <div class="w-24 h-1 bg-accent-blue mx-auto rounded-full opacity-80"></div>
    </div>

    <form id="registrationForm" class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <label for="fullName" class="block text-text-light font-medium mb-2">Full Name</label>
        <input type="text" id="fullName" name="fullName" required
          class="w-full px-4 py-3 bg-card-bg border border-white rounded-lg text-black placeholder-text-placeholder focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition-all duration-200">
      </div>

      <div>
        <label for="dateOfBirth" class="block text-text-light font-medium mb-2">Date of Birth</label>
        <input type="date" id="dateOfBirth" name="dateOfBirth" required
          class="w-full px-4 py-3 bg-card-bg border border-white rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition-all duration-200">
      </div>

      <div>
        <label for="contactNumber" class="block text-text-light font-medium mb-2">Contact Number</label>
        <input type="tel" id="contactNumber" name="contactNumber"
          class="w-full px-4 py-3 bg-card-bg border border-white rounded-lg text-black placeholder-text-placeholder focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition-all duration-200">
      </div>

      <div>
        <label for="gender" class="block text-text-light font-medium mb-2">Gender</label>
        <select id="gender" name="gender" required
          class="w-full px-4 py-3 bg-card-bg border border-white rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition-all duration-200 appearance-none">
          <option value="" class="bg-card-bg text-text-placeholder">Select Gender</option>
          <option value="male" class="bg-card-bg text-black">Male</option>
          <option value="female" class="bg-card-bg text-black">Female</option>
          <option value="other" class="bg-card-bg text-black">Other</option>
        </select>
      </div>

      <div class="md:col-span-2">
        <label for="address" class="block text-text-light font-medium mb-2">Address</label>
        <textarea id="address" name="address" rows="3"
          class="w-full px-4 py-3 bg-card-bg border border-white rounded-lg text-black placeholder-text-placeholder focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent resize-y transition-all duration-200"></textarea>
      </div>

      <div class="md:col-span-2 flex justify-end mt-2">
        <button type="submit"
          class="bg-accent-blue hover:bg-accent-dark-blue text-white font-medium py-3 px-8 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent-blue focus:ring-opacity-75 flex items-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
          </svg>
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
    <div class="query-container p-6 bg-card-bg rounded-xl shadow-lg border border-border-default max-w-4xl mx-auto">
        <h2 class="text-text-light text-2xl font-bold mb-8 text-center">Patient Records & Raw Query</h2>

        <div class="space-y-6">
            <!-- Registered Patients Section -->
            <div class="space-y-4">
                <h3 class="text-text-light text-xl font-semibold">Registered Patients</h3>
                <div class="relative">
                    <input type="text" id="searchInput" placeholder="Search patients..."
                        class="w-full px-4 py-3 bg-card-bg border border-white rounded-lg text-black placeholder-text-placeholder focus:outline-none focus:ring-2 focus:ring-accent-blue focus:border-transparent transition-all duration-200">
                    <div class="absolute right-3 top-3 text-text-placeholder">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                        </svg>
                    </div>
                </div>

                <div id="patientsTableContainer" class="overflow-x-auto">
                    <table class="min-w-full bg-card-bg rounded-lg overflow-hidden border border-border-default">
                        <thead class="bg-table-header-bg">
                            <tr class="text-left text-text-light text-sm font-medium">
                                <th class="py-3 px-6 border-b border-border-default">Full Name</th>
                                <th class="py-3 px-6 border-b border-border-default">Date of Birth</th>
                                <th class="py-3 px-6 border-b border-border-default">Gender</th>
                                <th class="py-3 px-6 border-b border-border-default">Contact</th>
                                <th class="py-3 px-6 border-b border-border-default">Address</th>
                                <th class="py-3 px-6 border-b border-border-default">Registered</th>
                            </tr>
                        </thead>
                        <tbody class="text-text-light text-sm" id="patientsTableBody">
                            <tr>
                                <td colspan="6" class="py-4 text-center text-text-placeholder">Loading patients...</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div id="noPatientsMessage" class="hidden text-center text-text-placeholder text-lg py-8">No patients registered yet.</div>
            </div>

            <!-- Raw SQL Section -->
            <div class="space-y-4">
                <h3 class="text-text-light text-xl font-semibold">Execute Raw SQL</h3>
                <div class="space-y-4">
                    <textarea id="sqlQueryInput" rows="5" placeholder="Enter SQL query here (e.g., SELECT * FROM patients;)"
                        class="w-full px-4 py-3 bg-card-bg border border-white rounded-lg text-black placeholder-text-placeholder focus:outline-none focus:ring-2 focus:ring-accent-blue focus:border-transparent font-mono text-sm transition-all duration-200"></textarea>

                    <div class="flex justify-end">
                        <button id="executeSqlQueryBtn"
                            class="bg-accent-blue text-white py-2 px-6 rounded-lg hover:bg-accent-dark-blue transition-all duration-200 ease-in-out font-medium text-base focus:outline-none focus:ring-2 focus:ring-accent-blue focus:ring-opacity-75 flex items-center gap-2">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M12 5l7 7-7 7"></path>
                            </svg>
                            Execute Query
                        </button>
                    </div>
                </div>

                <div id="sqlQueryResult" class="bg-card-bg p-4 rounded-lg border border-border-default overflow-x-auto">
                    <pre class="text-text-light whitespace-pre-wrap font-mono text-sm" id="sqlQueryResultPre">Query results will appear here.</pre>
                </div>
                <div id="sqlQueryError" class="hidden text-error-red text-sm mt-2 flex items-start gap-2">
                    <svg class="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <span id="sqlErrorText"></span>
                </div>
            </div>
        </div>
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
    <div class="p-8 bg-card-bg rounded-xl shadow-lg border border-border-default max-w-2xl mx-auto transition-all duration-300 hover:shadow-xl">
        <div class="text-center mb-8">
            <h2 class="text-3xl font-bold text-text-light mb-3">About Patient Portal</h2>
            <div class="w-24 h-1 bg-accent-blue mx-auto rounded-full opacity-80"></div>
        </div>

        <div class="space-y-6 text-text-light">
            <p class="text-lg leading-relaxed text-center">
                A <span class="text-accent-blue font-medium">modern</span> application for efficient patient data management in a secure local environment.
            </p>

            <div class="bg-card-bg p-6 rounded-lg border border-border-default">
                <h3 class="text-xl font-semibold mb-4 flex items-center gap-3 text-accent-blue">
                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clip-rule="evenodd"></path>
                    </svg>
                    Key Features
                </h3>
                
                <ul class="space-y-4">
                    <li class="flex items-start gap-4 p-3 rounded-lg hover:bg-table-row-hover transition-colors">
                        <div class="bg-accent-blue/10 p-2 rounded-full flex-shrink-0">
                            <svg class="w-4 h-4 text-accent-blue" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6z"></path>
                            </svg>
                        </div>
                        <div>
                            <h4 class="font-semibold">Real-time Patient Registration</h4>
                            <p class="text-sm text-text-placeholder mt-1">Quickly add new patient profiles with all necessary details</p>
                        </div>
                    </li>
                    
                    <li class="flex items-start gap-4 p-3 rounded-lg hover:bg-table-row-hover transition-colors">
                        <div class="bg-accent-blue/10 p-2 rounded-full flex-shrink-0">
                            <svg class="w-4 h-4 text-accent-blue" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"></path>
                            </svg>
                        </div>
                        <div>
                            <h4 class="font-semibold">Patient Records Query</h4>
                            <p class="text-sm text-text-placeholder mt-1">Easily search and view existing patient data</p>
                        </div>
                    </li>
                    
                    <li class="flex items-start gap-4 p-3 rounded-lg hover:bg-table-row-hover transition-colors">
                        <div class="bg-accent-blue/10 p-2 rounded-full flex-shrink-0">
                            <svg class="w-4 h-4 text-accent-blue" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd"></path>
                            </svg>
                        </div>
                        <div>
                            <h4 class="font-semibold">Inter-tab Synchronization</h4>
                            <p class="text-sm text-text-placeholder mt-1">All data updates sync automatically across open tabs</p>
                        </div>
                    </li>
                    
                    <li class="flex items-start gap-4 p-3 rounded-lg hover:bg-table-row-hover transition-colors">
                        <div class="bg-accent-blue/10 p-2 rounded-full flex-shrink-0">
                            <svg class="w-4 h-4 text-accent-blue" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                            </svg>
                        </div>
                        <div>
                            <h4 class="font-semibold">Persistent Local Database</h4>
                            <p class="text-sm text-text-placeholder mt-1">Data remains available even after closing the browser</p>
                        </div>
                    </li>
                    
                    <li class="flex items-start gap-4 p-3 rounded-lg hover:bg-table-row-hover transition-colors">
                        <div class="bg-accent-blue/10 p-2 rounded-full flex-shrink-0">
                            <svg class="w-4 h-4 text-accent-blue" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                            </svg>
                        </div>
                        <div>
                            <h4 class="font-semibold">Raw SQL Query Interface</h4>
                            <p class="text-sm text-text-placeholder mt-1">Run direct SQL commands for advanced operations</p>
                        </div>
                    </li>
                </ul>
            </div>

            <div class="text-center mt-6">
                <div class="inline-flex items-center gap-2 px-4 py-2 bg-accent-blue/10 rounded-full border border-accent-blue/20">
                    <svg class="w-4 h-4 text-accent-blue" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"></path>
                    </svg>
                    <span class="text-sm text-text-light">Secure • Private • Reliable</span>
                </div>
                <p class="text-text-placeholder text-sm mt-4">
                    Designed for healthcare professionals who value efficiency and data integrity
                </p>
            </div>
        </div>
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
                   <td class="py-3 px-6 text-left whitespace-nowrap">${
    patient.registeredAt
        ? new Date(patient.registeredAt).toLocaleString(undefined, { // Using 'undefined' lets browser determine locale
              year: 'numeric',
              month: '2-digit', // Changed to 2-digit for consistency if needed
              day: '2-digit',   // Changed to 2-digit for consistency if needed
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hourCycle: 'h23', // Ensure 24-hour format
              
          })
        : 'N/A'
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