document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.querySelectorAll('.header nav ul li a');

    /**
     * @param {Event} event
     */
    function smoothScroll(event) {
        const targetId = this.getAttribute('href');
        if (targetId.startsWith('#')) {
            event.preventDefault();

            const targetElement = document.querySelector(targetId);

            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        }
    }
    navLinks.forEach(link => {
        link.addEventListener('click', smoothScroll);
    });

    console.log('UniEvent Landing Page - Script cargado. Desplazamiento suave activado.');
});