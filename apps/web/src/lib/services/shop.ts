import { createClient } from '@/lib/supabase';
import type { ShopItem } from '@/types';

const SHOP_TABLES = ['corre_shop_items', 'shop_items'] as const;
type ShopTableName = (typeof SHOP_TABLES)[number];

let preferredShopTable: ShopTableName | null = null;

function isRelationMissingError(error: unknown): boolean {
    const err = error as { code?: string; message?: string };
    const message = (err?.message || '').toLowerCase();
    return (
        err?.code === '42P01' ||
        err?.code === 'PGRST205' ||
        message.includes('relation') && message.includes('does not exist')
    );
}

function isMissingColumnError(error: unknown): boolean {
    const err = error as { code?: string; message?: string };
    const message = (err?.message || '').toLowerCase();
    return err?.code === '42703' || (message.includes('column') && message.includes('does not exist'));
}

function resolvePriceCents(item: Partial<ShopItem> & { points_price?: number | null }): number {
    if (typeof item.price_cents === 'number' && Number.isFinite(item.price_cents)) {
        return Math.max(0, Math.round(item.price_cents));
    }

    if (typeof item.points_price === 'number' && Number.isFinite(item.points_price)) {
        const legacy = Math.max(0, Math.round(item.points_price));
        return legacy < 1000 ? legacy * 100 : legacy;
    }

    return 0;
}

function normalizeShopItem(raw: Partial<ShopItem> & { points_price?: number | null }): ShopItem {
    const priceCents = resolvePriceCents(raw);

    return {
        id: String(raw.id || ''),
        title: String(raw.title || ''),
        description: raw.description ?? null,
        price_cents: priceCents,
        points_price: typeof raw.points_price === 'number' ? raw.points_price : null,
        allow_points_discount: raw.allow_points_discount ?? true,
        max_points_discount_percent: raw.max_points_discount_percent ?? 20,
        image_url: raw.image_url ?? null,
        stock: Number(raw.stock || 0),
        is_active: raw.is_active ?? true,
        created_at: String(raw.created_at || new Date().toISOString()),
        updated_at: String(raw.updated_at || raw.created_at || new Date().toISOString()),
    };
}

function stripUndefined<T extends Record<string, unknown>>(payload: T): T {
    return Object.fromEntries(
        Object.entries(payload).filter(([, value]) => value !== undefined)
    ) as T;
}

async function withShopTable<T>(operation: (table: ShopTableName) => Promise<T>): Promise<T> {
    const candidates: ShopTableName[] = preferredShopTable
        ? [preferredShopTable, ...SHOP_TABLES.filter((table) => table !== preferredShopTable)]
        : [...SHOP_TABLES];

    let lastError: unknown = null;

    for (const table of candidates) {
        try {
            const result = await operation(table);
            preferredShopTable = table;
            return result;
        } catch (error) {
            if (isRelationMissingError(error)) {
                lastError = error;
                continue;
            }
            throw error;
        }
    }

    throw lastError || new Error('No shop table available.');
}

/**
 * Get all shop items
 */
export async function getAllShopItems(): Promise<ShopItem[]> {
    const supabase = createClient();

    try {
        return await withShopTable(async (table) => {
            const { data, error } = await supabase
                .from(table)
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            return ((data || []) as Array<Partial<ShopItem> & { points_price?: number | null }>)
                .map(normalizeShopItem);
        });
    } catch (error) {
        console.warn('Error fetching shop items:', error);
        return [];
    }
}

/**
 * Create a new shop item
 */
export async function createShopItem(item: Omit<ShopItem, 'id' | 'created_at' | 'updated_at'>): Promise<ShopItem> {
    const supabase = createClient();

    return withShopTable(async (table) => {
        const priceCents = resolvePriceCents(item);
        const primaryPayload = stripUndefined({
            title: item.title,
            description: item.description ?? null,
            price_cents: priceCents,
            points_price: typeof item.points_price === 'number' ? item.points_price : priceCents,
            image_url: item.image_url ?? null,
            stock: item.stock,
            is_active: item.is_active ?? true,
            allow_points_discount: item.allow_points_discount ?? true,
            max_points_discount_percent: item.max_points_discount_percent ?? 20,
            updated_at: new Date().toISOString(),
        });

        let { data, error } = await supabase
            .from(table)
            .insert(primaryPayload)
            .select()
            .single();

        // Backward compatibility in case new columns are not yet migrated.
        if (error && isMissingColumnError(error)) {
            const legacyPayload = stripUndefined({
                title: item.title,
                description: item.description ?? null,
                points_price: typeof item.points_price === 'number' ? item.points_price : priceCents,
                image_url: item.image_url ?? null,
                stock: item.stock,
                is_active: item.is_active ?? true,
            });

            ({ data, error } = await supabase
                .from(table)
                .insert(legacyPayload)
                .select()
                .single());
        }

        if (error) throw error;
        return normalizeShopItem((data || {}) as Partial<ShopItem> & { points_price?: number | null });
    });
}

/**
 * Update a shop item
 */
export async function updateShopItem(id: string, updates: Partial<ShopItem>): Promise<ShopItem> {
    const supabase = createClient();

    return withShopTable(async (table) => {
        const patch: Record<string, unknown> = {};

        if (updates.title !== undefined) patch.title = updates.title;
        if (updates.description !== undefined) patch.description = updates.description ?? null;
        if (updates.image_url !== undefined) patch.image_url = updates.image_url ?? null;
        if (updates.stock !== undefined) patch.stock = updates.stock;
        if (updates.is_active !== undefined) patch.is_active = updates.is_active;
        if (updates.allow_points_discount !== undefined) patch.allow_points_discount = updates.allow_points_discount;
        if (updates.max_points_discount_percent !== undefined) {
            patch.max_points_discount_percent = updates.max_points_discount_percent;
        }

        if (updates.price_cents !== undefined || updates.points_price !== undefined) {
            const priceCents = resolvePriceCents(updates as Partial<ShopItem> & { points_price?: number | null });
            patch.price_cents = priceCents;
            patch.points_price = updates.points_price ?? priceCents;
        }

        patch.updated_at = new Date().toISOString();

        let { data, error } = await supabase
            .from(table)
            .update(stripUndefined(patch))
            .eq('id', id)
            .select()
            .single();

        // Backward compatibility in case new columns are not yet migrated.
        if (error && isMissingColumnError(error)) {
            const legacyPatch = { ...patch };
            delete legacyPatch.price_cents;
            delete legacyPatch.allow_points_discount;
            delete legacyPatch.max_points_discount_percent;
            delete legacyPatch.updated_at;

            ({ data, error } = await supabase
                .from(table)
                .update(stripUndefined(legacyPatch))
                .eq('id', id)
                .select()
                .single());
        }

        if (error) throw error;
        return normalizeShopItem((data || {}) as Partial<ShopItem> & { points_price?: number | null });
    });
}

/**
 * Delete a shop item
 */
export async function deleteShopItem(id: string): Promise<void> {
    const supabase = createClient();

    await withShopTable(async (table) => {
        const { error } = await supabase
            .from(table)
            .delete()
            .eq('id', id);

        if (error) throw error;
    });
}
