const contentArea = document.querySelector('.content-area');
const navLinks = document.querySelectorAll('.nav-link');

function loadContent(route) {
    let contentHtml = '';
    navLinks.forEach(link => link.classList.remove('active'));

    switch (route) {
        case 'register':
            contentHtml = `
                <div class="registration-container p-4 bg-bg-medium rounded-lg shadow-md">
                    <h2 class="text-text-white text-2xl font-semibold mb-4 text-center">Register Patient</h2>
                    <p class="text-text-white text-lg">Patient Registration form will go here.</p>
                    <p class="text-gray-400 mt-2">This is the default page content.</p>
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