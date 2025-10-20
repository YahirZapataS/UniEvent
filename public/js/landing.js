/**
 * js/landing.js
 * Funcionalidad para la Landing Page de UniEvent.
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Obtener todos los enlaces de la navegación
    const navLinks = document.querySelectorAll('.header nav ul li a');

    /**
     * Función para el desplazamiento suave al hacer clic en los enlaces de anclaje.
     * @param {Event} event - El evento de click.
     */
    function smoothScroll(event) {
        // Verificar si el enlace es un enlace de anclaje (comienza con #)
        const targetId = this.getAttribute('href');
        if (targetId.startsWith('#')) {
            event.preventDefault(); // Detiene el comportamiento predeterminado (salto)

            const targetElement = document.querySelector(targetId);

            if (targetElement) {
                // Utiliza el método scrollIntoView para un desplazamiento suave
                targetElement.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        }
    }

    // 2. Agregar el evento de click a cada enlace de navegación
    navLinks.forEach(link => {
        link.addEventListener('click', smoothScroll);
    });

    console.log('UniEvent Landing Page - Script cargado. Desplazamiento suave activado.');
});