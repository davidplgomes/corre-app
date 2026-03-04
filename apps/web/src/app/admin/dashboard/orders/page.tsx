"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Loader2, RefreshCw, Search } from "lucide-react";
import { AdminTable } from "@/components/ui/admin-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase";
import { toast } from "sonner";

type OrderStatus =
    | "pending"
    | "paid"
    | "processing"
    | "ready_for_pickup"
    | "picked_up"
    | "payment_failed"
    | "refunded"
    | "disputed"
    | "cancelled"
    | "canceled";

type OrderUser = {
    id: string;
    full_name: string | null;
    email: string | null;
    membership_tier: string | null;
} | null;

type OrderItem = {
    id: string;
    order_id: string;
    item_type: "shop" | "marketplace";
    item_id: string;
    quantity: number;
    unit_price: number;
    title: string;
};

type OrderRow = {
    id: string;
    user_id: string | null;
    total_amount: number | null;
    points_used: number | null;
    cash_amount: number | null;
    status: OrderStatus | string;
    stripe_payment_intent_id: string | null;
    shipping_address: Record<string, unknown> | null;
    created_at: string;
    updated_at: string;
    paid_at: string | null;
    failure_reason: string | null;
    points_consumed_at: string | null;
    points_refunded_at: string | null;
    user: OrderUser;
    items: OrderItem[];
};

type OrdersSummary = {
    total: number;
    pending: number;
    paid: number;
    processing: number;
    ready_for_pickup: number;
    picked_up: number;
    payment_failed: number;
    refunded: number;
    disputed: number;
    cancelled: number;
};

type OrdersResponse = {
    orders: OrderRow[];
    summary: OrdersSummary;
    error?: string;
};

const STATUS_LABEL: Record<string, string> = {
    pending: "Pending",
    paid: "Paid",
    processing: "Preparing",
    ready_for_pickup: "Ready for Pickup",
    picked_up: "Picked Up",
    payment_failed: "Payment Failed",
    refunded: "Refunded",
    disputed: "Disputed",
    cancelled: "Cancelled",
    canceled: "Cancelled",
};

const STATUS_TARGETS: Array<{ value: Exclude<OrderStatus, "pending" | "paid" | "payment_failed" | "refunded">; label: string }> = [
    { value: "processing", label: "Mark as Preparing" },
    { value: "ready_for_pickup", label: "Mark as Ready for Pickup" },
    { value: "picked_up", label: "Mark as Picked Up" },
    { value: "disputed", label: "Flag as Disputed" },
    { value: "cancelled", label: "Mark as Cancelled" },
];

const DEFAULT_SUMMARY: OrdersSummary = {
    total: 0,
    pending: 0,
    paid: 0,
    processing: 0,
    ready_for_pickup: 0,
    picked_up: 0,
    payment_failed: 0,
    refunded: 0,
    disputed: 0,
    cancelled: 0,
};
const PAGE_SIZE = 25;

function normalizeStatus(status: string): OrderStatus | string {
    const normalized = status.toLowerCase();
    if (normalized === "canceled") return "cancelled";
    if (normalized === "shipped") return "ready_for_pickup";
    if (normalized === "delivered") return "picked_up";
    return normalized;
}

function formatMoney(value: number | null | undefined): string {
    return new Intl.NumberFormat("en-IE", {
        style: "currency",
        currency: "EUR",
        maximumFractionDigits: 2,
    }).format(Number(value || 0));
}

function formatDateTime(value: string | null): string {
    if (!value) return "—";
    return new Date(value).toLocaleString("en-IE");
}

function statusBadge(statusRaw: string) {
    const status = normalizeStatus(statusRaw);

    if (status === "paid" || status === "processing" || status === "ready_for_pickup") {
        return <Badge variant="info">{STATUS_LABEL[status] || status}</Badge>;
    }

    if (status === "picked_up") {
        return <Badge variant="success">{STATUS_LABEL[status] || status}</Badge>;
    }

    if (status === "payment_failed" || status === "disputed") {
        return <Badge variant="warning">{STATUS_LABEL[status] || status}</Badge>;
    }

    if (status === "refunded" || status === "cancelled") {
        return <Badge variant="destructive">{STATUS_LABEL[status] || status}</Badge>;
    }

    return <Badge variant="outline">{STATUS_LABEL[status] || status}</Badge>;
}

function getAllowedStatusTargets(currentStatusRaw: string) {
    const currentStatus = normalizeStatus(currentStatusRaw);
    if (currentStatus === "refunded" || currentStatus === "payment_failed" || currentStatus === "cancelled") {
        return [];
    }
    if (currentStatus === "picked_up") {
        return STATUS_TARGETS.filter((option) => option.value === "disputed");
    }
    return STATUS_TARGETS.filter((option) => option.value !== currentStatus);
}

function canRefund(statusRaw: string): boolean {
    const status = normalizeStatus(statusRaw);
    return ["paid", "processing", "ready_for_pickup", "picked_up", "disputed"].includes(status);
}

export default function OrdersPage() {
    const supabase = useMemo(() => createClient(), []);
    const realtimeRefreshTimeoutRef = useRef<number | null>(null);
    const [orders, setOrders] = useState<OrderRow[]>([]);
    const [summary, setSummary] = useState<OrdersSummary>(DEFAULT_SUMMARY);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [statusDrafts, setStatusDrafts] = useState<Record<string, string>>({});
    const [mutatingByOrderId, setMutatingByOrderId] = useState<Record<string, boolean>>({});
    const [currentPage, setCurrentPage] = useState(1);

    const fetchOrders = useCallback(async (options?: { silent?: boolean }) => {
        const silent = options?.silent === true;
        try {
            if (!silent) {
                setLoading(true);
            }

            const response = await fetch("/api/admin/orders", {
                method: "GET",
                headers: { "Content-Type": "application/json" },
                cache: "no-store",
            });

            const payload = (await response.json()) as OrdersResponse;
            if (!response.ok) {
                throw new Error(payload.error || "Failed to load orders");
            }

            setOrders(payload.orders || []);
            setSummary(payload.summary || DEFAULT_SUMMARY);
        } catch (error) {
            console.error("Error fetching orders:", error);
            toast.error(error instanceof Error ? error.message : "Failed to load orders");
        } finally {
            if (!silent) {
                setLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        void fetchOrders();
    }, [fetchOrders]);

    const scheduleRealtimeRefresh = useCallback(() => {
        if (realtimeRefreshTimeoutRef.current) return;
        realtimeRefreshTimeoutRef.current = window.setTimeout(() => {
            realtimeRefreshTimeoutRef.current = null;
            void fetchOrders({ silent: true });
        }, 700);
    }, [fetchOrders]);

    useEffect(() => {
        const channel = supabase
            .channel("admin-orders-live")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "orders" },
                scheduleRealtimeRefresh
            )
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "order_items" },
                scheduleRealtimeRefresh
            )
            .subscribe();

        return () => {
            if (realtimeRefreshTimeoutRef.current) {
                window.clearTimeout(realtimeRefreshTimeoutRef.current);
                realtimeRefreshTimeoutRef.current = null;
            }
            void supabase.removeChannel(channel);
        };
    }, [scheduleRealtimeRefresh, supabase]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchOrders({ silent: true });
        setRefreshing(false);
        toast.success("Orders refreshed");
    };

    const setOrderMutating = (orderId: string, value: boolean) => {
        setMutatingByOrderId((prev) => ({ ...prev, [orderId]: value }));
    };

    const handleUpdateStatus = async (orderId: string) => {
        const nextStatus = (statusDrafts[orderId] || "").trim();
        if (!nextStatus) return;

        setOrderMutating(orderId, true);
        try {
            const response = await fetch("/api/admin/orders/status", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderId, status: nextStatus }),
            });

            const payload = (await response.json()) as { success?: boolean; error?: string };
            if (!response.ok || !payload.success) {
                throw new Error(payload.error || "Failed to update order status");
            }

            setStatusDrafts((prev) => ({ ...prev, [orderId]: "" }));
            await fetchOrders({ silent: true });
            toast.success("Order status updated");
        } catch (error) {
            console.error("Error updating order status:", error);
            toast.error(error instanceof Error ? error.message : "Failed to update order status");
        } finally {
            setOrderMutating(orderId, false);
        }
    };

    const handleRefund = async (orderId: string) => {
        const confirmed = window.confirm(
            "Issue a Stripe refund for this order and sync points refund if needed?"
        );
        if (!confirmed) return;

        setOrderMutating(orderId, true);
        try {
            const response = await fetch("/api/admin/orders/refund", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderId }),
            });

            const payload = (await response.json()) as {
                success?: boolean;
                alreadyRefunded?: boolean;
                refundedPoints?: boolean;
                error?: string;
            };

            if (!response.ok || !payload.success) {
                throw new Error(payload.error || "Failed to refund order");
            }

            await fetchOrders({ silent: true });
            if (payload.alreadyRefunded) {
                toast.success("Order was already refunded");
            } else if (payload.refundedPoints) {
                toast.success("Order refunded and points returned");
            } else {
                toast.success("Order refunded");
            }
        } catch (error) {
            console.error("Error refunding order:", error);
            toast.error(error instanceof Error ? error.message : "Failed to refund order");
        } finally {
            setOrderMutating(orderId, false);
        }
    };

    const filteredOrders = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();

        return orders.filter((order) => {
            const normalizedStatus = normalizeStatus(order.status);
            if (statusFilter !== "all" && normalizedStatus !== statusFilter) {
                return false;
            }

            if (!query) {
                return true;
            }

            const haystack = [
                order.id,
                order.user?.full_name || "",
                order.user?.email || "",
                order.stripe_payment_intent_id || "",
                ...order.items.map((item) => item.title),
            ]
                .join(" ")
                .toLowerCase();

            return haystack.includes(query);
        });
    }, [orders, searchQuery, statusFilter]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, statusFilter]);

    const totalPages = useMemo(
        () => Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE)),
        [filteredOrders.length]
    );

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    const paginatedOrders = useMemo(() => {
        const start = (currentPage - 1) * PAGE_SIZE;
        return filteredOrders.slice(start, start + PAGE_SIZE);
    }, [currentPage, filteredOrders]);

    const statusesInData = useMemo(() => {
        const set = new Set<string>();
        for (const order of orders) {
            set.add(normalizeStatus(order.status));
        }
        return Array.from(set);
    }, [orders]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Order Operations</h2>
                    <p className="text-sm text-white/40 mt-1">
                        Review checkout outcomes and handle refunds, disputes, and fulfillment transitions.
                    </p>
                </div>
                <Button className="gap-2 w-full md:w-auto" onClick={handleRefresh} disabled={refreshing}>
                    {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    Refresh
                </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <GlassCard className="p-4">
                    <p className="text-xs text-white/40 uppercase font-bold">All Orders</p>
                    <p className="text-2xl font-bold text-white mt-1">{summary.total}</p>
                </GlassCard>
                <GlassCard className="p-4">
                    <p className="text-xs text-white/40 uppercase font-bold">Paid / In Progress</p>
                    <p className="text-2xl font-bold text-[#68b2ff] mt-1">
                        {summary.paid + summary.processing + summary.ready_for_pickup}
                    </p>
                </GlassCard>
                <GlassCard className="p-4">
                    <p className="text-xs text-white/40 uppercase font-bold">Picked Up</p>
                    <p className="text-2xl font-bold text-green-400 mt-1">{summary.picked_up}</p>
                </GlassCard>
                <GlassCard className="p-4">
                    <p className="text-xs text-white/40 uppercase font-bold">Failed / Disputed</p>
                    <p className="text-2xl font-bold text-yellow-400 mt-1">
                        {summary.payment_failed + summary.disputed}
                    </p>
                </GlassCard>
                <GlassCard className="p-4">
                    <p className="text-xs text-white/40 uppercase font-bold">Refunded</p>
                    <p className="text-2xl font-bold text-red-400 mt-1">{summary.refunded}</p>
                </GlassCard>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                        className="pl-10"
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="Search order id, user, payment intent, or item title"
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                    className="h-10 rounded-lg border border-white/10 bg-[#0A0A0A] px-3 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5722]"
                >
                    <option value="all">All statuses</option>
                    {statusesInData.map((status) => (
                        <option key={status} value={status}>
                            {STATUS_LABEL[status] || status}
                        </option>
                    ))}
                </select>
            </div>

            <AdminTable
                title="Orders"
                data={paginatedOrders}
                isLoading={loading}
                pagination={{
                    currentPage,
                    totalPages,
                    onPageChange: (page) => {
                        setCurrentPage(Math.max(1, Math.min(page, totalPages)));
                    },
                }}
                columns={[
                    {
                        header: "Order",
                        cell: (order) => (
                            <div className="space-y-1">
                                <p className="font-mono text-xs text-white break-all">{order.id}</p>
                                <p className="text-[10px] text-white/50">
                                    {formatDateTime(order.created_at)}
                                </p>
                            </div>
                        ),
                    },
                    {
                        header: "Customer",
                        cell: (order) => (
                            <div className="space-y-1">
                                <p className="text-sm text-white">{order.user?.full_name || "Unknown user"}</p>
                                <p className="text-[11px] text-white/45">{order.user?.email || "—"}</p>
                            </div>
                        ),
                    },
                    {
                        header: "Items",
                        cell: (order) => (
                            <div className="space-y-1">
                                {order.items.slice(0, 2).map((item) => (
                                    <p key={item.id} className="text-xs text-white/80">
                                        {item.quantity}x {item.title}
                                    </p>
                                ))}
                                {order.items.length > 2 && (
                                    <p className="text-[11px] text-white/50">+{order.items.length - 2} more items</p>
                                )}
                            </div>
                        ),
                    },
                    {
                        header: "Amount",
                        cell: (order) => (
                            <div className="space-y-1">
                                <p className="text-sm font-semibold text-white">
                                    {formatMoney(order.cash_amount ?? order.total_amount)}
                                </p>
                                <p className="text-[11px] text-white/45">
                                    Subtotal {formatMoney(order.total_amount)} · Points {order.points_used || 0}
                                </p>
                            </div>
                        ),
                    },
                    {
                        header: "Status",
                        cell: (order) => (
                            <div className="space-y-2">
                                {statusBadge(order.status)}
                                {order.failure_reason ? (
                                    <p className="text-[11px] text-yellow-300/80 max-w-[240px] break-words">
                                        {order.failure_reason}
                                    </p>
                                ) : null}
                            </div>
                        ),
                    },
                    {
                        header: "Actions",
                        cell: (order) => {
                            const isMutating = Boolean(mutatingByOrderId[order.id]);
                            const options = getAllowedStatusTargets(order.status);
                            const selectedStatus = statusDrafts[order.id] || "";

                            return (
                                <div className="flex flex-col gap-2 min-w-[240px]">
                                    <div className="flex items-center gap-2">
                                        <select
                                            value={selectedStatus}
                                            onChange={(event) =>
                                                setStatusDrafts((prev) => ({
                                                    ...prev,
                                                    [order.id]: event.target.value,
                                                }))
                                            }
                                            className="h-9 flex-1 rounded-md border border-white/10 bg-[#0A0A0A] px-2 text-xs text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5722]"
                                            disabled={isMutating || options.length === 0}
                                        >
                                            <option value="">Select status...</option>
                                            {options.map((option) => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            disabled={!selectedStatus || isMutating}
                                            onClick={() => void handleUpdateStatus(order.id)}
                                        >
                                            {isMutating ? <Loader2 className="w-3 h-3 animate-spin" /> : "Apply"}
                                        </Button>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="destructive"
                                        disabled={isMutating || !canRefund(order.status)}
                                        onClick={() => void handleRefund(order.id)}
                                    >
                                        {isMutating ? (
                                            <>
                                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                                Working...
                                            </>
                                        ) : (
                                            "Refund"
                                        )}
                                    </Button>
                                </div>
                            );
                        },
                    },
                ]}
            />

            <GlassCard className="p-4 flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
                <p className="text-xs text-white/55 leading-relaxed">
                    Refunding triggers Stripe refund creation and attempts points rollback only when points were consumed and not refunded yet.
                    Failed or refunded orders are blocked from manual status transitions.
                </p>
            </GlassCard>
        </div>
    );
}
