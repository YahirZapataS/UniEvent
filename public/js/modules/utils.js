/**
 * js/modules/utils.js
 * Funciones de utilidad reutilizables para UniEvent
 */

// Formateo de fecha institucional
export const formatDateSpanish = (dateStr) => {
    if (!dateStr) return "Sin fecha";
    const [year, month, day] = dateStr.split("-");
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
};

// Conversión de HH:MM a minutos totales
export const toMinutes = (timeStr) => {
    const [hour, minute] = timeStr.split(":").map(Number);
    return hour * 60 + minute;
};

// Conversión de minutos totales a formato HH:MM
export const minutesToTimeStr = (totalMinutes) => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

// Mostrar error estándar con Swal
export const showError = (message) => {
    Swal.fire('Error', message, 'error');
};