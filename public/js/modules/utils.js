import { db } from '../services/firebaseConfig.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export const formatDateSpanish = (dateStr) => {
    if (!dateStr) return "Sin fecha";
    const [year, month, day] = dateStr.split("-");
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
};

export const toMinutes = (timeStr) => {
    const [hour, minute] = timeStr.split(":").map(Number);
    return hour * 60 + minute;
};

export const minutesToTimeStr = (totalMinutes) => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

export const showError = (message) => {
    Swal.fire('Error', message, 'error');
};

export const getActivePlaces = async () => {
    try {
        const docRef = doc(db, 'config', 'places');
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            return data.list
                .filter(place => place.active)
                .map(place => place.name)
                .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
        }
        return [];
    } catch (error) {
        console.error("Error obteniendo lugares:", error);
        return [];
    }
};

export const populatePlacesSelect = async (selectElement, defaultText = "Seleccione una opción") => {
    if (!selectElement) return;
    selectElement.innerHTML = `<option value="">Cargando espacios...</option>`;
    
    const places = await getActivePlaces();
    
    selectElement.innerHTML = `<option value="">${defaultText}</option>`;
    places.forEach(place => {
        const option = document.createElement("option");
        option.value = place;
        option.textContent = place;
        selectElement.appendChild(option);
    });
};