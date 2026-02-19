import { auth } from '../firebaseConfig.js';
import { signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

class MainSidebar extends HTMLElement {
    connectedCallback() {
        const activePage = this.getAttribute('active');
        this.innerHTML = `
        <aside class="sidebar">
            <div class="brand">Uni<span>Event</span></div>
            <nav>
                <ul>
                    <li class="${activePage === 'solicitudes' ? 'active' : ''}"><a href="dashboard.html">Solicitudes</a></li>
                    <li class="${activePage === 'calendario' ? 'active' : ''}"><a href="dashboard-calendar.html">Calendario</a></li>
                    <li class="${activePage === 'aprobadas' ? 'active' : ''}"><a href="dashboard-approved.html">Aprobadas</a></li>
                    <li class="${activePage === 'rechazadas' ? 'active' : ''}"><a href="dashboard-declined.html">Rechazadas</a></li>
                    <li class="${activePage === 'concluidas' ? 'active' : ''}"><a href="dashboard-finished.html">Concluidas</a></li>
                    <li class="separator"></li>
                    <li class="${activePage === 'reportes' ? 'active' : ''}"><a href="dashboard-reports.html">Reportes</a></li>
                    <li class="${activePage === 'configuracion' ? 'active' : ''}"><a href="dashboard-configuration.html">Configuración</a></li>
                </ul>
            </nav>
            <div class="sidebar-end">
                <a href="#" id="btnLogoutGlobal" class="btn-logout">Cerrar sesión</a>
            </div>
        </aside>
        `;

        this.querySelector('#btnLogoutGlobal').addEventListener('click', async (e) => {
            e.preventDefault();
            const result = await Swal.fire({
                title: '¿Cerrar sesión?',
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Sí, salir',
                confirmButtonColor: '#2563eb'
            });

            if (result.isConfirmed) {
                await signOut(auth);
                window.location.href = window.location.origin + './index.html';
            }
        });
    }
}
customElements.define('main-sidebar', MainSidebar);