// Import PGlite correctly
import { PGlite } from 'https://cdn.jsdelivr.net/npm/@electric-sql/pglite/dist/index.js';

// --- Database Service (Pglite Integration) ---
class PatientDbService {
    constructor() {
        this.db = null;
        this.initializeDb(); // Start database initialization immediately
    }

    async initializeDb() {
        if (this.db) {
            loadContent(window.location.hash.substring(1) || 'register');
            return;
        }

        const loadingStatusDiv = document.getElementById('loadingStatus');
        if (loadingStatusDiv) {
            loadingStatusDiv.textContent = 'Connecting to database...';
        }

        try {
            this.db = new PGlite('idb://patient_portal_db', { relaxedDurability: true });
            await this.db.waitReady;

            const test = await this.db.query('SELECT 1 as test');

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

            if (loadingStatusDiv) {
                loadingStatusDiv.remove();
            }
            loadContent(window.location.hash.substring(1) || 'register');

        } catch (error) {
            console.error('Error initializing database:', error);
            const loadingStatusDiv = document.getElementById('loadingStatus');
            if (loadingStatusDiv) {
                loadingStatusDiv.textContent = `Error loading database: ${error.message}. Check console for details.`;
            }
            alert('Failed to initialize database. Check console for details.');
        }
    }

    async registerPatient(patientData) {
        if (!this.db) {
            await this.initializeDb();
            if (!this.db) {
                 throw new Error('Database is still not initialized after retry.');
            }
        }
        const { id, fullName, dateOfBirth, contactNumber, address, gender } = patientData;
        try {
            const sql = `
                INSERT INTO patients (id, "fullName", "dateOfBirth", "contactNumber", "address", gender)
                VALUES ($1, $2, $3, $4, $5, $6);
            `;
            const result = await this.db.query(sql, [id, fullName, dateOfBirth, contactNumber, address, gender]);
            return result;
        } catch (error) {
            console.error('Error registering patient:', patientData, error);
            throw error;
        }
    }

    async getAllPatients() {
        if (!this.db) {
            await this.initializeDb();
            if (!this.db) {
                 throw new Error('Database is still not initialized after retry.');
            }
        }
        try {
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

    // NEW METHOD: Execute raw SQL queries
    async executeRawQuery(sqlQuery) {
        if (!this.db) {
            await this.initializeDb();
            if (!this.db) {
                 throw new Error('Database is still not initialized after retry.');
            }
        }
        try {
            const result = await this.db.query(sqlQuery);
            return result; // Returns { rows, fields }
        } catch (error) {
            console.error('Raw SQL query failed:', error);
            throw error;
        }
    }
}

const patientDbService = new PatientDbService();

const contentArea = document.querySelector('.content-area');
const navLinks = document.querySelectorAll('.nav-link');

function loadContent(route) {
    let contentHtml = '';
    navLinks.forEach(link => link.classList.remove('active'));

    switch (route) {
        case 'register':
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
            attachFormListeners();
            break;
        case 'query':
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
            renderPatientsList();
            setupSearch();
            setupRawQueryExecutor(); // NEW: Setup raw query executor
            break;
        case 'about':
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
            window.location.hash = '#register';
            return;
    }
}

async function renderPatientsList(searchTerm = '') {
    const patientsTableBody = document.getElementById('patientsTableBody');
    const noPatientsMessageDiv = document.getElementById('noPatientsMessage');
    const patientsTableContainer = document.getElementById('patientsTableContainer');

    if (!patientsTableBody || !noPatientsMessageDiv || !patientsTableContainer) {
        console.error('Could not find required DOM elements for patients list.');
        return;
    }

    patientsTableBody.innerHTML = '<tr><td colspan="6" class="py-4 text-center text-gray-400">Loading patients...</td></tr>';
    noPatientsMessageDiv.classList.add('hidden');
    patientsTableContainer.classList.remove('hidden');

    try {
        const patients = await patientDbService.getAllPatients();

        let filteredPatients = patients;
        if (searchTerm) {
            const lowerCaseSearchTerm = searchTerm.toLowerCase();
            filteredPatients = patients.filter(patient =>
                (patient.fullName && patient.fullName.toLowerCase().includes(lowerCaseSearchTerm)) ||
                (patient.contactNumber && patient.contactNumber.toLowerCase().includes(lowerCaseSearchTerm)) ||
                (patient.address && patient.address.toLowerCase().includes(lowerCaseSearchTerm))
            );
        }

        patientsTableBody.innerHTML = '';

        if (filteredPatients.length === 0) {
            noPatientsMessageDiv.textContent = searchTerm ? 'No patients match your search.' : 'No patients registered yet.';
            noPatientsMessageDiv.classList.remove('hidden');
            patientsTableContainer.classList.add('hidden');
        } else {
            noPatientsMessageDiv.classList.add('hidden');
            patientsTableContainer.classList.remove('hidden');

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
        noPatientsMessageDiv.classList.add('hidden');
        patientsTableContainer.classList.remove('hidden');
    }
}

function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            renderPatientsList(e.target.value);
        });
    }
}

// NEW FUNCTION: Setup Raw Query Executor
function setupRawQueryExecutor() {
    const sqlQueryInput = document.getElementById('sqlQueryInput');
    const executeSqlQueryBtn = document.getElementById('executeSqlQueryBtn');
    const sqlQueryResultPre = document.getElementById('sqlQueryResultPre');
    const sqlQueryErrorDiv = document.getElementById('sqlQueryError');

    if (!sqlQueryInput || !executeSqlQueryBtn || !sqlQueryResultPre || !sqlQueryErrorDiv) {
        console.error('Could not find required DOM elements for raw SQL query executor.');
        return;
    }

    executeSqlQueryBtn.addEventListener('click', async () => {
        const sqlQuery = sqlQueryInput.value.trim();
        sqlQueryResultPre.textContent = 'Executing query...';
        sqlQueryErrorDiv.classList.add('hidden'); // Hide previous errors

        if (!sqlQuery) {
            sqlQueryResultPre.textContent = 'Please enter a SQL query.';
            return;
        }

        try {
            const result = await patientDbService.executeRawQuery(sqlQuery);

            let output = '';
            if (result.rows && result.rows.length > 0) {
                // If it's a SELECT query, display as JSON for now
                output = JSON.stringify(result.rows, null, 2);
            } else if (result.command) {
                // For DDL/DML commands like CREATE, INSERT, UPDATE, DELETE
                output = `Command: ${result.command}\nRows affected: ${result.rowCount || 0}`;
            } else {
                output = 'Query executed successfully with no rows returned.';
            }
            sqlQueryResultPre.textContent = output;
        } catch (error) {
            sqlQueryResultPre.textContent = `Error: ${error.message}`;
            sqlQueryErrorDiv.textContent = `SQL Error: ${error.message}`;
            sqlQueryErrorDiv.classList.remove('hidden');
            console.error('Raw SQL Query Execution Error:', error);
        }
    });
}


function generateUniqueId() {
    return 'patient_' + Date.now().toString(36) + Math.random().toString(36).substring(2);
}

function attachFormListeners() {
    const registrationForm = document.getElementById('registrationForm');
    if (registrationForm) {
        registrationForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const formData = new FormData(registrationForm);
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
                alert('Patient registered successfully!');
                registrationForm.reset();

                if (window.location.hash.substring(1) === 'query') {
                    renderPatientsList();
                }
            } catch (error) {
                alert('Failed to register patient. Check console for details.');
            }
        });
    }
}

window.addEventListener('hashchange', () => {
    const route = window.location.hash.substring(1);
    loadContent(route);
});

navLinks.forEach(link => {
    link.addEventListener('click', (event) => {
        event.preventDefault();
        const route = event.target.dataset.route;
        window.location.hash = `#${route}`;
    });
});

window.addEventListener('DOMContentLoaded', () => {
    loadContent(window.location.hash.substring(1) || 'register');
});