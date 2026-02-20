import { db } from './services/firebaseConfig.js';
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { protectRoute } from './modules/authGuard.js';

const ADMIN_CONFIG_ID = 'adminSettings';
const configForm = document.getElementById('configForm');
const placesTableBody = document.getElementById('placesTableBody');
const btnAddPlace = document.getElementById('btnAddPlace');
const newPlaceName = document.getElementById('newPlaceName');

let placesList = [];

document.addEventListener('DOMContentLoaded', async () => {
    await protectRoute();
    loadConfiguration();
    loadPlaces();
});

async function loadConfiguration() {
    try {
        const docRef = doc(db, 'config', ADMIN_CONFIG_ID);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.ADMIN_EMAIL) document.getElementById('adminEmail').value = data.ADMIN_EMAIL;
            if (data.REMINDER_TIME) document.getElementById('reminderTime').value = data.REMINDER_TIME;
        }
    } catch (error) {
        console.error("Error al cargar configuración:", error);
    }
}

configForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newEmail = document.getElementById('adminEmail').value.trim();
    const newReminderTime = document.getElementById('reminderTime').value;

    try {
        await setDoc(doc(db, 'config', ADMIN_CONFIG_ID), {
            ADMIN_EMAIL: newEmail,
            REMINDER_TIME: newReminderTime,
            lastUpdated: new Date()
        }, { merge: true });

        Swal.fire('Guardado', 'Configuración actualizada correctamente.', 'success');
    } catch (error) {
        Swal.fire('Error', 'No se pudo guardar la configuración.', 'error');
    }
});

async function loadPlaces() {
    try {
        const docRef = doc(db, 'config', 'places');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            placesList = docSnap.data().list || [];
            placesList.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
        } else {
            placesList = [];
        }
        renderPlaces();
    } catch (error) {
        console.error("Error al cargar espacios: ", error);
    }
}

function renderPlaces() {
    if (!placesTableBody) return;
    placesTableBody.innerHTML = '';

    if (placesList.length === 0) {
        placesTableBody.innerHTML = `<tr><td colspan="3" class="empty-row" style="padding: 2rem; text-align: center;">No hay espacios registrados</td></tr>`;
        return;
    }

    placesList.forEach((place, index) => {
        const row = document.createElement('tr');
        const toggleClass = place.active ? 'btn-soft-danger' : 'btn-soft-primary';
        const toggleText = place.active ? 'Desactivar' : 'Activar';

        row.innerHTML = `
            <td class="text-left" style="padding: 1rem; border-bottom: 1px solid var(--border);">${place.name}</td>
            <td class="text-center" style="padding: 1rem; border-bottom: 1px solid var(--border); text-align: center;">
                <span class="status-badge ${place.active ? 'status-aceptada' : 'status-rechazada'}">
                    ${place.active ? 'Activo' : 'Inactivo'}
                </span>
            </td>
            <td class="flex-end-gap" style="padding: 1rem; border-bottom: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 0.5rem;">
                <button type="button" class="btn-action ${toggleClass}" onclick="togglePlace(${index})">
                    ${toggleText}
                </button>
                
                <button type="button" class="btn-action btn-soft-primary" onclick="editPlace(${index})" title="Editar espacio">
                    Editar
                </button>
                
                <button type="button" class="btn-action btn-soft-danger" onclick="deletePlace(${index})" title="Eliminar espacio">
                    Eliminar
                </button>
            </td>
        `;
        placesTableBody.appendChild(row);
    });
}

window.editPlace = async (index) => {
    const currentPlace = placesList[index];

    const { value: newName } = await Swal.fire({
        title: 'Editar Espacio',
        input: 'text',
        inputValue: currentPlace.name,
        showCancelButton: true,
        confirmButtonText: 'Guardar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#2563eb',
        inputValidator: (value) => {
            const trimmedValue = value.trim();
            if (!trimmedValue) {
                return 'El nombre no puede estar vacío';
            }
            const exists = placesList.some((p, i) => i !== index && p.name.toLowerCase() === trimmedValue.toLowerCase());
            if (exists) {
                return 'Este espacio ya existe en la lista';
            }
        }
    });

    if (newName && newName.trim() !== currentPlace.name) {
        placesList[index].name = newName.trim();
        placesList.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
        await savePlaces();
    }
};

btnAddPlace?.addEventListener('click', async () => {
    const name = newPlaceName.value.trim();
    if (!name) return;
    if (placesList.some(p => p.name.toLowerCase() === name.toLowerCase())) {
        Swal.fire('Error', 'Este espacio ya existe en la lista.', 'warning');
        return;
    }

    placesList.push({ id: Date.now().toString(), name: name, active: true });
    newPlaceName.value = '';
    await savePlaces();
});

window.togglePlace = async (index) => {
    placesList[index].active = !placesList[index].active;
    await savePlaces();
};

window.deletePlace = async (index) => {
    const result = await Swal.fire({
        title: '¿Eliminar espacio?',
        text: "Desaparecerá de las opciones de reservación.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        confirmButtonText: 'Sí, eliminar'
    });

    if (result.isConfirmed) {
        placesList.splice(index, 1);
        await savePlaces();
    }
};

async function savePlaces() {
    Swal.fire({ title: 'Guardando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    try {
        await setDoc(doc(db, 'config', 'places'), { list: placesList });
        renderPlaces();
        Swal.close();
    } catch (error) {
        Swal.fire('Error', 'No se pudieron guardar los cambios.', 'error');
    }
}