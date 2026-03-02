"use client"

import { type ReactNode, useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase"
import { GlassCard } from "@/components/ui/glass-card"
import { AdminTable } from "@/components/ui/admin-table"
import { Button } from "@/components/ui/button"
import { ArrowUpRight, Download, RefreshCw, Loader2, XCircle, RotateCcw, ArrowRightLeft } from "lucide-react"
import { toast } from "sonner"

type StripeProduct = {
    productId: string
    priceId: string
    name: string
    amount: number
    currency: string
    interval: string
    metadata?: Record<string, string>
}

type SubscriptionRow = {
    id: string
    user_id: string
    plan_id: string | null
    plan_name: string | null
    status: string
    current_period_start: string | null
    current_period_end: string | null
    cancel_at_period_end: boolean
    created_at: string
    stripe_customer_id: string | null
    stripe_subscription_id: string | null
    user_name: string
    user_email: string
    user_tier: string
    catalog_plan_name: string | null
    catalog_amount: number | null
    catalog_currency: string | null
}

type DashboardStats = {
    mrr: number
    activeCount: number
    canceledCount: number
    churnRate: number
    ltv: number
}

type SubscriptionTier = "free" | "pro" | "club"
type PaidTier = Exclude<SubscriptionTier, "free">
type CatalogByTier = Partial<Record<PaidTier, StripeProduct>>
type CatalogByPriceId = Record<string, StripeProduct>

const ACTIVE_STATUSES = new Set(["active", "trialing"])
const CANCELED_STATUSES = new Set(["canceled", "cancelled", "unpaid", "incomplete_expired"])
const CANCELABLE_STATUSES = new Set(["active", "trialing", "past_due"])
const RESUMABLE_STATUSES = new Set(["active", "trialing", "past_due"])
const PLAN_CHANGEABLE_STATUSES = new Set(["active", "trialing", "past_due", "unpaid", "incomplete"])

const normalizeTier = (value: string | null | undefined): SubscriptionTier | null => {
    if (!value) return null
    const normalized = value.toLowerCase().trim()
    if (["club", "premium", "elite"].includes(normalized)) return "club"
    if (["pro", "plus", "monthly", "annual", "yearly", "anual"].includes(normalized)) return "pro"
    if (normalized === "free") return "free"
    return null
}

const inferTierFromText = (value: string | null | undefined): SubscriptionTier | null => {
    if (!value) return null
    const normalized = value.toLowerCase()
    if (normalized.includes("club") || normalized.includes("premium")) return "club"
    if (normalized.includes("pro")) return "pro"
    return null
}

const resolveTierForProduct = (product: StripeProduct): PaidTier | null => {
    const metadataTier =
        normalizeTier(product.metadata?.membership_tier) ||
        normalizeTier(product.metadata?.tier)

    if (metadataTier === "club" || metadataTier === "pro") {
        return metadataTier
    }

    const inferredTier = inferTierFromText(product.name) || inferTierFromText(product.priceId)
    if (inferredTier === "club" || inferredTier === "pro") {
        return inferredTier
    }

    return null
}

const resolveTierForSubscriptionRow = (item: SubscriptionRow): SubscriptionTier => {
    const directTier = normalizeTier(item.user_tier)
    if (directTier) return directTier

    const inferredTier =
        inferTierFromText(item.catalog_plan_name) ||
        inferTierFromText(item.plan_name) ||
        inferTierFromText(item.plan_id)

    return inferredTier || "free"
}

export default function SubscriptionPage() {
    const supabase = useMemo(() => createClient(), [])
    const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([])
    const [catalogByPriceId, setCatalogByPriceId] = useState<CatalogByPriceId>({})
    const [catalogByTier, setCatalogByTier] = useState<CatalogByTier>({})
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [mutatingByStripeSubscriptionId, setMutatingByStripeSubscriptionId] = useState<Record<string, boolean>>({})
    const [stats, setStats] = useState<DashboardStats>({
        mrr: 0,
        activeCount: 0,
        canceledCount: 0,
        churnRate: 0,
        ltv: 0,
    })

    useEffect(() => {
        void fetchSubscriptions()
    }, [])

    const formatMoney = (amount: number, currency = "EUR") =>
        new Intl.NumberFormat("en-IE", {
            style: "currency",
            currency: currency.toUpperCase(),
            maximumFractionDigits: 2,
        }).format(amount)

    const fetchSubscriptions = async () => {
        try {
            setLoading(true)

            const [subsResult, productsResult] = await Promise.all([
                supabase
                    .from("subscriptions")
                    .select(`
                        id,
                        user_id,
                        plan_id,
                        plan_name,
                        status,
                        current_period_start,
                        current_period_end,
                        cancel_at_period_end,
                        created_at,
                        updated_at,
                        stripe_customer_id,
                        stripe_subscription_id
                    `)
                    .order("updated_at", { ascending: false })
                    .order("created_at", { ascending: false }),
                supabase.functions.invoke("stripe-sync-products"),
            ])

            if (subsResult.error) {
                throw subsResult.error
            }

            const products: StripeProduct[] = Array.isArray(productsResult.data) ? productsResult.data : []
            const catalogByPriceIdRecord: CatalogByPriceId = {}
            const catalogByTierRecord: CatalogByTier = {}

            for (const product of products) {
                catalogByPriceIdRecord[product.priceId] = product

                const tier = resolveTierForProduct(product)
                if (tier) {
                    const existing = catalogByTierRecord[tier]
                    if (!existing || product.amount < existing.amount) {
                        catalogByTierRecord[tier] = product
                    }
                }
            }

            setCatalogByPriceId(catalogByPriceIdRecord)
            setCatalogByTier(catalogByTierRecord)
            const subs = subsResult.data ?? []

            const userIds = [...new Set(subs.map((s) => s.user_id).filter(Boolean))]
            let usersById = new Map<string, { full_name: string | null; email: string | null; membership_tier: string | null }>()

            if (userIds.length > 0) {
                const { data: usersData, error: usersError } = await supabase
                    .from("users")
                    .select("id, full_name, email, membership_tier")
                    .in("id", userIds)

                if (usersError) {
                    throw usersError
                }

                usersById = new Map((usersData ?? []).map((u) => [
                    u.id,
                    {
                        full_name: u.full_name,
                        email: u.email,
                        membership_tier: u.membership_tier,
                    },
                ]))
            }

            const mapped: SubscriptionRow[] = subs.map((s) => {
                const user = usersById.get(s.user_id)
                const product = s.plan_id ? catalogByPriceIdRecord[s.plan_id] : undefined

                return {
                    ...s,
                    user_name: user?.full_name || "Unknown User",
                    user_email: user?.email || "",
                    user_tier: user?.membership_tier || "free",
                    catalog_plan_name: product?.name || null,
                    catalog_amount: typeof product?.amount === "number" ? product.amount / 100 : null,
                    catalog_currency: product?.currency || null,
                }
            })

            setSubscriptions(mapped)
            setStats(buildStats(mapped))
        } catch (error) {
            console.error("Error fetching subscriptions:", error)
            toast.error("Failed to load subscriptions")
        } finally {
            setLoading(false)
        }
    }

    const buildStats = (rows: SubscriptionRow[]): DashboardStats => {
        const activeRows = rows.filter((r) => ACTIVE_STATUSES.has((r.status || "").toLowerCase()))
        const canceledRows = rows.filter((r) => CANCELED_STATUSES.has((r.status || "").toLowerCase()))

        const mrr = activeRows.reduce((acc, row) => acc + (row.catalog_amount || 0), 0)
        const churnBase = activeRows.length + canceledRows.length
        const churnRate = churnBase > 0 ? (canceledRows.length / churnBase) * 100 : 0
        const ltv = activeRows.length > 0 ? (mrr / activeRows.length) * 12 : 0

        return {
            mrr,
            activeCount: activeRows.length,
            canceledCount: canceledRows.length,
            churnRate: Number(churnRate.toFixed(2)),
            ltv: Math.round(ltv),
        }
    }

    const handleRefresh = async () => {
        setRefreshing(true)
        await fetchSubscriptions()
        setRefreshing(false)
        toast.success("Subscription data refreshed")
    }

    const canScheduleCancel = (item: SubscriptionRow) => {
        if (!item.stripe_subscription_id) return false
        if (item.cancel_at_period_end) return false
        return CANCELABLE_STATUSES.has((item.status || "").toLowerCase())
    }

    const handleScheduleCancel = async (item: SubscriptionRow) => {
        const subscriptionId = item.stripe_subscription_id
        if (!subscriptionId || !canScheduleCancel(item)) {
            return
        }

        setMutatingByStripeSubscriptionId((prev) => ({ ...prev, [subscriptionId]: true }))

        try {
            const response = await fetch("/api/admin/subscriptions/cancel", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ subscriptionId }),
            })

            const payload = await response.json() as {
                error?: string
                details?: string
                status?: string
                cancel_at_period_end?: boolean
                alreadyCanceled?: boolean
            }

            if (!response.ok) {
                throw new Error(payload.error || "Failed to schedule subscription cancellation")
            }

            const nextStatus = payload.status || item.status

            setSubscriptions((prev) => {
                const updated = prev.map((row) => {
                    if (row.stripe_subscription_id !== subscriptionId) {
                        return row
                    }

                    return {
                        ...row,
                        status: nextStatus,
                        cancel_at_period_end: payload.cancel_at_period_end ?? true,
                    }
                })

                setStats(buildStats(updated))
                return updated
            })

            if (payload.alreadyCanceled) {
                toast.success("Subscription is already scheduled to cancel at period end")
            } else {
                toast.success("Subscription scheduled to cancel at period end")
            }
        } catch (error) {
            console.error("Error scheduling cancellation:", error)
            toast.error(error instanceof Error ? error.message : "Failed to schedule cancellation")
        } finally {
            setMutatingByStripeSubscriptionId((prev) => {
                const next = { ...prev }
                delete next[subscriptionId]
                return next
            })
        }
    }

    const canResumeCancel = (item: SubscriptionRow) => {
        if (!item.stripe_subscription_id) return false
        if (!item.cancel_at_period_end) return false
        return RESUMABLE_STATUSES.has((item.status || "").toLowerCase())
    }

    const handleResumeCancellation = async (item: SubscriptionRow) => {
        const subscriptionId = item.stripe_subscription_id
        if (!subscriptionId || !canResumeCancel(item)) {
            return
        }

        setMutatingByStripeSubscriptionId((prev) => ({ ...prev, [subscriptionId]: true }))

        try {
            const response = await fetch("/api/admin/subscriptions/resume", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ subscriptionId }),
            })

            const payload = await response.json() as {
                error?: string
                details?: string
                status?: string
                cancel_at_period_end?: boolean
                alreadyResumed?: boolean
            }

            if (!response.ok) {
                throw new Error(payload.error || "Failed to resume subscription")
            }

            const nextStatus = payload.status || item.status

            setSubscriptions((prev) => {
                const updated = prev.map((row) => {
                    if (row.stripe_subscription_id !== subscriptionId) {
                        return row
                    }

                    return {
                        ...row,
                        status: nextStatus,
                        cancel_at_period_end: payload.cancel_at_period_end ?? false,
                    }
                })

                setStats(buildStats(updated))
                return updated
            })

            if (payload.alreadyResumed) {
                toast.success("Subscription is already active and not scheduled to cancel")
            } else {
                toast.success("Subscription cancellation has been resumed")
            }
        } catch (error) {
            console.error("Error resuming cancellation:", error)
            toast.error(error instanceof Error ? error.message : "Failed to resume subscription")
        } finally {
            setMutatingByStripeSubscriptionId((prev) => {
                const next = { ...prev }
                delete next[subscriptionId]
                return next
            })
        }
    }

    const canChangePlan = (item: SubscriptionRow) => {
        if (!item.stripe_subscription_id) return false
        const status = (item.status || "").toLowerCase()
        if (!PLAN_CHANGEABLE_STATUSES.has(status)) return false

        const currentTier = resolveTierForSubscriptionRow(item)
        if (currentTier === "club") {
            return Boolean(catalogByTier.pro)
        }

        return Boolean(catalogByTier.club || catalogByTier.pro)
    }

    const getPlanChangeTarget = (item: SubscriptionRow): { tier: PaidTier; product: StripeProduct } | null => {
        if (!canChangePlan(item)) return null

        const currentTier = resolveTierForSubscriptionRow(item)
        if (currentTier === "club" && catalogByTier.pro) {
            return { tier: "pro", product: catalogByTier.pro }
        }

        if (catalogByTier.club && currentTier !== "club") {
            return { tier: "club", product: catalogByTier.club }
        }

        if (catalogByTier.pro && currentTier !== "pro") {
            return { tier: "pro", product: catalogByTier.pro }
        }

        return null
    }

    const handleChangePlan = async (item: SubscriptionRow, target: { tier: PaidTier; product: StripeProduct }) => {
        const subscriptionId = item.stripe_subscription_id
        if (!subscriptionId) return

        setMutatingByStripeSubscriptionId((prev) => ({ ...prev, [subscriptionId]: true }))

        try {
            const response = await fetch("/api/admin/subscriptions/change-plan", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    subscriptionId,
                    priceId: target.product.priceId,
                }),
            })

            const payload = await response.json() as {
                error?: string
                details?: string
                status?: string
                cancel_at_period_end?: boolean
                plan_id?: string
                plan_name?: string
                user_tier?: string | null
                alreadyOnPlan?: boolean
            }

            if (!response.ok) {
                throw new Error(payload.error || "Failed to change plan")
            }

            const nextPlanId = payload.plan_id || target.product.priceId
            const nextProduct = catalogByPriceId[nextPlanId]

            setSubscriptions((prev) => {
                const updated = prev.map((row) => {
                    if (row.stripe_subscription_id !== subscriptionId) {
                        return row
                    }

                    return {
                        ...row,
                        status: payload.status || row.status,
                        cancel_at_period_end: payload.cancel_at_period_end ?? row.cancel_at_period_end,
                        plan_id: nextPlanId,
                        plan_name: payload.plan_name || nextProduct?.name || row.plan_name,
                        catalog_plan_name: nextProduct?.name || payload.plan_name || row.catalog_plan_name,
                        catalog_amount: typeof nextProduct?.amount === "number"
                            ? nextProduct.amount / 100
                            : row.catalog_amount,
                        catalog_currency: nextProduct?.currency || row.catalog_currency,
                        user_tier: payload.user_tier || row.user_tier,
                    }
                })

                setStats(buildStats(updated))
                return updated
            })

            if (payload.alreadyOnPlan) {
                toast.success("Subscriber is already on this plan")
            } else {
                toast.success(`Plan updated to ${payload.plan_name || target.product.name}`)
            }
        } catch (error) {
            console.error("Error changing plan:", error)
            toast.error(error instanceof Error ? error.message : "Failed to change plan")
        } finally {
            setMutatingByStripeSubscriptionId((prev) => {
                const next = { ...prev }
                delete next[subscriptionId]
                return next
            })
        }
    }

    const canRequestRefund = (item: SubscriptionRow) => {
        if (!item.stripe_subscription_id) return false
        const normalizedStatus = (item.status || "").toLowerCase()
        return normalizedStatus !== "free" && normalizedStatus !== "incomplete"
    }

    const handleRefundSubscription = async (item: SubscriptionRow) => {
        const subscriptionId = item.stripe_subscription_id
        if (!subscriptionId || !canRequestRefund(item)) {
            return
        }

        const confirmed = window.confirm(
            `Issue a refund for the latest successful charge of ${item.user_name || "this subscriber"}?`
        )
        if (!confirmed) {
            return
        }

        setMutatingByStripeSubscriptionId((prev) => ({ ...prev, [subscriptionId]: true }))

        try {
            const response = await fetch("/api/admin/subscriptions/refund", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ subscriptionId }),
            })

            const payload = await response.json() as {
                error?: string
                details?: string
                alreadyRefunded?: boolean
            }

            if (!response.ok) {
                throw new Error(payload.error || "Failed to refund subscription")
            }

            if (payload.alreadyRefunded) {
                toast.success("Latest subscription payment is already refunded")
            } else {
                toast.success("Refund requested successfully")
            }
        } catch (error) {
            console.error("Error refunding subscription:", error)
            toast.error(error instanceof Error ? error.message : "Failed to refund subscription")
        } finally {
            setMutatingByStripeSubscriptionId((prev) => {
                const next = { ...prev }
                delete next[subscriptionId]
                return next
            })
        }
    }

    const csvEscape = (value: string) => `"${String(value).replaceAll('"', '""')}"`

    const handleExportCSV = () => {
        const headers = [
            "User",
            "Email",
            "Tier",
            "Plan",
            "Price",
            "Status",
            "CancelAtPeriodEnd",
            "CurrentPeriodStart",
            "CurrentPeriodEnd",
            "StripeCustomerId",
            "StripeSubscriptionId",
        ]

        const rows = subscriptions.map((s) => [
            s.user_name,
            s.user_email,
            s.user_tier,
            s.catalog_plan_name || s.plan_name || s.plan_id || "Unknown",
            s.catalog_amount != null ? formatMoney(s.catalog_amount, s.catalog_currency || "EUR") : "N/A",
            s.status,
            s.cancel_at_period_end ? "true" : "false",
            s.current_period_start || "",
            s.current_period_end || "",
            s.stripe_customer_id || "",
            s.stripe_subscription_id || "",
        ])

        const csvBody = [
            headers.map(csvEscape).join(","),
            ...rows.map((r) => r.map(csvEscape).join(",")),
        ].join("\n")

        const blob = new Blob([csvBody], { type: "text/csv;charset=utf-8;" })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.download = `subscriptions_${new Date().toISOString().split("T")[0]}.csv`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)

        toast.success("Subscriptions exported successfully")
    }

    const getStatusStyle = (status: string) => {
        switch (status?.toLowerCase()) {
            case "active":
            case "trialing":
                return "bg-green-500/10 text-green-500 border-green-500/20"
            case "past_due":
            case "unpaid":
                return "bg-red-500/10 text-red-500 border-red-500/20"
            case "canceled":
            case "cancelled":
                return "bg-white/5 text-white/40 border-white/10"
            default:
                return "bg-white/5 text-white/40 border-white/10"
        }
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Subscriptions</h2>
                    <p className="text-white/40 text-sm mt-1">Live Stripe-backed subscription view from Supabase.</p>
                </div>
                <div className="flex flex-wrap gap-3 w-full md:w-auto">
                    <Button variant="outline" className="gap-2 flex-1 md:flex-none" onClick={handleExportCSV}>
                        <Download className="w-4 h-4" />
                        Export CSV
                    </Button>
                    <Button className="gap-2 flex-1 md:flex-none" onClick={handleRefresh} disabled={refreshing}>
                        {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        Refresh
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <GlassCard className="p-6">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">Monthly Recurring Revenue</h4>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-white">{formatMoney(stats.mrr)}</span>
                        <span className="text-xs font-medium text-green-500 flex items-center gap-1">
                            <ArrowUpRight className="w-3 h-3" />
                            Live
                        </span>
                    </div>
                </GlassCard>
                <GlassCard className="p-6">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">Active Subscribers</h4>
                    <span className="text-2xl font-bold text-white">{stats.activeCount}</span>
                </GlassCard>
                <GlassCard className="p-6">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">Churn Rate</h4>
                    <span className="text-2xl font-bold text-white">{stats.churnRate}%</span>
                </GlassCard>
                <GlassCard className="p-6">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">Lifetime Value</h4>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-white">{formatMoney(stats.ltv)}</span>
                        <span className="text-xs font-medium text-white/40">avg</span>
                    </div>
                </GlassCard>
            </div>

            <AdminTable
                title="Subscriber List"
                data={subscriptions}
                isLoading={loading}
                columns={[
                    {
                        header: "Subscriber",
                        cell: (item) => (
                            <div>
                                <p className="text-sm font-medium text-white">{item.user_name}</p>
                                <p className="text-[10px] text-white/40">{item.user_email || item.user_id}</p>
                            </div>
                        ),
                    },
                    {
                        header: "Plan",
                        cell: (item) => (
                            <span className="text-sm text-white/80">
                                {item.catalog_plan_name || item.plan_name || item.plan_id || "Unknown"}
                            </span>
                        ),
                    },
                    {
                        header: "Amount",
                        cell: (item) => (
                            <span className="font-mono text-sm font-medium text-white">
                                {item.catalog_amount != null
                                    ? formatMoney(item.catalog_amount, item.catalog_currency || "EUR")
                                    : "N/A"}
                            </span>
                        ),
                    },
                    {
                        header: "Next Billing",
                        cell: (item) => (
                            <span className="text-sm text-white/60 font-mono">
                                {item.current_period_end
                                    ? new Date(item.current_period_end).toLocaleDateString("en-IE")
                                    : "N/A"}
                            </span>
                        ),
                    },
                    {
                        header: "Status",
                        cell: (item) => (
                            <div className="flex flex-col items-start gap-1">
                                <span className={`px-2 py-1 rounded text-[10px] uppercase font-bold tracking-wider border ${getStatusStyle(item.status)}`}>
                                    {item.status}
                                </span>
                                {item.cancel_at_period_end ? (
                                    <span className="text-[10px] uppercase tracking-wider text-amber-300">
                                        Cancel at period end
                                    </span>
                                ) : null}
                            </div>
                        ),
                    },
                    {
                        header: "Actions",
                        cell: (item) => {
                            if (!item.stripe_subscription_id) {
                                return <span className="text-xs text-white/30">N/A</span>
                            }

                            const isMutating = !!mutatingByStripeSubscriptionId[item.stripe_subscription_id]
                            const actions: ReactNode[] = []
                            const planChangeTarget = getPlanChangeTarget(item)

                            if (item.cancel_at_period_end) {
                                if (!canResumeCancel(item)) {
                                    actions.push(
                                        <span key="scheduled" className="text-[10px] uppercase tracking-wider text-amber-300">
                                            Scheduled
                                        </span>
                                    )
                                } else {
                                    actions.push(
                                        <Button
                                            key="resume"
                                            variant="outline"
                                            size="sm"
                                            disabled={isMutating}
                                            onClick={(event) => {
                                                event.stopPropagation()
                                                void handleResumeCancellation(item)
                                            }}
                                            className="text-xs"
                                        >
                                            {isMutating ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                                            <span className="ml-1">Resume</span>
                                        </Button>
                                    )
                                }
                            } else if (canScheduleCancel(item)) {
                                actions.push(
                                    <Button
                                        key="cancel"
                                        variant="outline"
                                        size="sm"
                                        disabled={isMutating}
                                        onClick={(event) => {
                                            event.stopPropagation()
                                            void handleScheduleCancel(item)
                                        }}
                                        className="text-xs"
                                    >
                                        {isMutating ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                                        <span className="ml-1">Cancel At End</span>
                                    </Button>
                                )
                            }

                            if (planChangeTarget) {
                                actions.push(
                                    <Button
                                        key={`plan-${planChangeTarget.tier}`}
                                        variant="outline"
                                        size="sm"
                                        disabled={isMutating}
                                        onClick={(event) => {
                                            event.stopPropagation()
                                            void handleChangePlan(item, planChangeTarget)
                                        }}
                                        className="text-xs"
                                    >
                                        {isMutating ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowRightLeft className="w-3 h-3" />}
                                        <span className="ml-1">{planChangeTarget.tier === "club" ? "Move to Club" : "Move to Pro"}</span>
                                    </Button>
                                )
                            }

                            if (canRequestRefund(item)) {
                                actions.push(
                                    <Button
                                        key="refund"
                                        variant="outline"
                                        size="sm"
                                        disabled={isMutating}
                                        onClick={(event) => {
                                            event.stopPropagation()
                                            void handleRefundSubscription(item)
                                        }}
                                        className="text-xs"
                                    >
                                        {isMutating ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                                        <span className={isMutating ? "ml-1" : ""}>Refund</span>
                                    </Button>
                                )
                            }

                            if (actions.length === 0) {
                                return <span className="text-xs text-white/30">Unavailable</span>
                            }

                            return (
                                <div className="flex flex-wrap items-center gap-2">
                                    {actions}
                                </div>
                            )
                        },
                    },
                ]}
            />
        </div>
    )
}
