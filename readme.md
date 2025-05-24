# Patient Portal (Client-Side with PGlite)

This is a client-side web application for managing patient records, built using HTML, CSS (Tailwind CSS), and JavaScript. It leverages [PGlite](https://electric-sql.com/pglite/) to provide a fully functional PostgreSQL database directly within the user's browser, eliminating the need for a separate backend server.

## Features

* **Patient Registration:** A form to register new patients with details like name, date of birth, gender, contact number, and address.
* **Patient Query/List:** Displays a list of registered patients with search functionality (by name, contact, or address).
* **Raw SQL Query Executor:** Allows direct execution of SQL queries against the in-browser PGlite database, useful for debugging or advanced data manipulation.
* **Client-Side Routing:** Navigates between different sections (Register, Query, About) within a single HTML page using URL hashes.
* **Real-time Updates (via BroadcastChannel):** Utilizes `BroadcastChannel` to notify other open tabs of data modifications (e.g., new patient registrations, changes via raw SQL queries).
    * **Important Note for Multi-Tab Sync:** While `BroadcastChannel` notifies other tabs, to see the changes immediately, you might need to **refresh the page in the other tab**, especially if the data has been significantly modified.
    * **Developer Tip for Cache:** During development, if you are not seeing immediate changes, ensure your browser's developer tools are open and **"Disable cache"** is checked in the Network tab, or perform a hard refresh (`Ctrl + Shift + R` or `Cmd + Shift + R`). This helps ensure you're always loading the latest version of your `script.js` and other assets.
* **Toast Notifications:** Provides user feedback for actions (e.g., successful registration, errors).

## Technologies Used

* **HTML5:** For structuring the web content.
* **Tailwind CSS:** A utility-first CSS framework for rapid UI development.
* **JavaScript (ES6+):** For all application logic, DOM manipulation, and database interaction.
* **PGlite:** An in-browser PostgreSQL database compiled to WebAssembly. **It is imported directly into `script.js` via a CDN (Content Delivery Network)**, providing persistent data storage via IndexedDB.
## Deployment

This application is deployed as a static site due to its client-side nature.

**Live Demo:** (https://patient-portal-delta.vercel.app)

## Setup and Local Usage

To set up and run this project on your local machine, follow these simple steps:

1.  **Clone the Repository:**
    If you haven't already, clone the Git repository containing your project files:
    ```bash
    git clone <https://github.com/AbhiramMenon/Patient-Portal.git>
    cd patient-portal # Navigate into your project directory
    ```

2.  **Open in Browser:**
    Since this is a static site, you don't need a local server (like Node.js or Python SimpleHTTPServer) in most cases. You can simply open the `index.html` file directly in your web browser.

    * **Drag and Drop:** Drag the `index.html` file into your browser window.
    * **Double Click:** Double-click the `index.html` file.
    * **Via Live Server (Recommended for Development):** If you use Visual Studio Code, you can install the "Live Server" extension. Right-click on `index.html` and select "Open with Live Server" for automatic reloads on file changes.

3.  **Explore Features:**
    * Navigate through the "Register Patient," "Query Patients," and "About" sections using the navigation bar.
    * Register new patients using the form.
    * Observe how the patient list updates automatically (if you open another tab of the application, **you will need to refresh** to see the changes in that tab).
    * Experiment with the search bar to filter patients.
    * Use the "Raw SQL Query Executor" to run SQL commands (e.g., `SELECT * FROM patients;`, `DELETE FROM patients WHERE id = 'some_id';`).

## Challenges Faced During Development

Developing this client-side patient portal involved several interesting challenges and learning opportunities:

1.  **PGlite Integration and Data Persistence:**
    * The primary challenge was understanding how to effectively integrate PGlite, an in-browser database, and ensure reliable data persistence using IndexedDB. Initial setup involved verifying database readiness and schema creation.
    * Managing database initialization to prevent race conditions or multiple initialization attempts on page load was also crucial.

2.  **Client-Side Routing for Single-Page Application (SPA):**
    * Transitioning from multiple HTML files to a single `index.html` required a robust client-side routing mechanism. This involved listening for `hashchange` events and dynamically showing/hiding different `section` elements based on the URL hash, rather than fetching new HTML.
    * Ensuring that JavaScript listeners (like form submission and search input) were correctly attached and re-attached when sections became visible was key to preventing duplicate listeners and unexpected behavior.

3.  **Search Logic:**
    * Implementing an efficient search feature (`ILIKE` for case-insensitive partial matches) within the `getAllPatients` function required careful construction of SQL queries with dynamic `WHERE` clauses and parameters.

4.  **Inter-Tab Communication with `BroadcastChannel`:**
    * Synchronizing data updates (e.g., new patient registrations or raw SQL modifications) across multiple browser tabs required the use of `BroadcastChannel`. This involved setting up listeners and dispatching messages for specific events, then triggering UI refreshes in other tabs.
    * A minor challenge was ensuring that UI updates triggered by `BroadcastChannel` only occurred when the relevant section (e.g., the "Query Patients" section) was actually visible in the receiving tab. **Users need to refresh the page to see changes in other tabs.**

5.  **Robust UI Feedback and Error Handling:**
    * Implementing a custom `showToast` notification system was essential for providing clear, non-intrusive feedback to the user about successful operations or errors (e.g., database initialization failures, patient registration errors, SQL query errors).
    * Ensuring error messages from PGlite queries were correctly captured and displayed to the user in the raw SQL executor section improved usability for debugging.

6.  **Responsive Design and Tailwind CSS:**
    * While not a direct code logic challenge, ensuring the application was responsive and visually appealing across different screen sizes using Tailwind CSS required careful application of utility classes and consideration of layout for tables and forms.

These challenges highlight the considerations involved in building a full-featured client-side application that manages persistent data without a traditional server backend.