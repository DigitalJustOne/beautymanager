export const formatPrice = (price: number) => {
    return `$${price.toLocaleString('es-CO')}`;
};

export const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
};

export const parseDuration = (duration: string | undefined): number => {
    if (!duration) return 60;
    const hMatch = duration.match(/(\d+)h/);
    const mMatch = duration.match(/(\d+)m/);
    let total = 0;
    if (hMatch) total += parseInt(hMatch[1]) * 60;
    if (mMatch) total += parseInt(mMatch[1]);
    if (total === 0) {
        const digits = duration.match(/\d+/);
        return digits ? parseInt(digits[0]) : 60;
    }
    return total;
};
