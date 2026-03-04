export type DashboardLocale = 'en' | 'pt' | 'es';

const SUPPORTED_LOCALES: DashboardLocale[] = ['en', 'pt', 'es'];

function normalizeLocale(raw: string | null | undefined): DashboardLocale | null {
    if (!raw) return null;
    const normalized = raw.toLowerCase().split('-')[0];
    return SUPPORTED_LOCALES.includes(normalized as DashboardLocale)
        ? (normalized as DashboardLocale)
        : null;
}

function readCookie(name: string): string | null {
    if (typeof document === 'undefined') return null;
    const value = document.cookie
        .split('; ')
        .find((entry) => entry.startsWith(`${name}=`))
        ?.split('=')[1];
    return value ? decodeURIComponent(value) : null;
}

export function detectDashboardLocale(): DashboardLocale {
    if (typeof window === 'undefined') return 'en';

    const candidates: Array<string | null | undefined> = [
        window.localStorage.getItem('NEXT_LOCALE'),
        window.localStorage.getItem('corre:locale'),
        readCookie('NEXT_LOCALE'),
        navigator.language,
    ];

    for (const candidate of candidates) {
        const locale = normalizeLocale(candidate);
        if (locale) return locale;
    }

    return 'en';
}

function getNestedValue(source: unknown, path: string): unknown {
    return path.split('.').reduce<unknown>((current, part) => {
        if (current && typeof current === 'object' && part in (current as Record<string, unknown>)) {
            return (current as Record<string, unknown>)[part];
        }
        return undefined;
    }, source);
}

export function translate(
    dictionary: Record<string, unknown>,
    path: string,
    values: Record<string, string | number> = {}
): string {
    const template = getNestedValue(dictionary, path);

    if (typeof template !== 'string') {
        return path;
    }

    return template.replace(/\{(\w+)\}/g, (_, key: string) => {
        const value = values[key];
        return value === undefined ? `{${key}}` : String(value);
    });
}
