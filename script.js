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
            break;
        case 'query':
            contentHtml = `
                <div class="query-container p-4 bg-bg-medium rounded-lg shadow-md">
                    <h2 class="text-text-white text-2xl font-semibold mb-4 text-center">Query Patient</h2>
                    <p class="text-text-white text-lg">Patient Query interface will go here.</p>
                    <p class="text-gray-400 mt-2">You can search for patient records here.</p>
                </div>
            `;
            document.querySelector('[data-route="query"]').classList.add('active');
            break;
        case 'about':
            contentHtml = `
                <div class="about-container p-4 bg-bg-medium rounded-lg shadow-md">
                    <h2 class="text-text-white text-2xl font-semibold mb-4 text-center">About PatientPortal</h2>
                    <p class="text-text-white text-lg">This is a demo application for patient data management using Pglite (to be integrated).</p>
                    <p class="text-gray-400 mt-2">Developed as per the requirements for Medblocks.</p>
                </div>
            `;
            document.querySelector('[data-route="about"]').classList.add('active');
            break;
        default:
            window.location.hash = '#register';
            return;
    }
    contentArea.innerHTML = contentHtml;
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

document.addEventListener('DOMContentLoaded', () => {
    if (window.location.hash === '') {
        window.location.hash = '#register';
    } else {
        const route = window.location.hash.substring(1);
        loadContent(route);
    }
});