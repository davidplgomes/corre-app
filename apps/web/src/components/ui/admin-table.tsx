"use client"

import React from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';

interface AdminTableProps<T> {
    data: T[]
    columns: {
        header: string
        accessorKey?: string
        cell?: (item: T) => React.ReactNode
        className?: string
    }[]
    isLoading?: boolean
    onRowClick?: (item: T) => void
    pagination?: {
        currentPage: number
        totalPages: number
        onPageChange: (page: number) => void
    }
    title?: string
    action?: React.ReactNode
    toolbar?: React.ReactNode
}

export function AdminTable<T extends { id: string | number }>({
    data,
    columns,
    isLoading,
    onRowClick,
    pagination,
    title,
    action,
    toolbar
}: AdminTableProps<T>) {

    if (isLoading) {
        return (
            <GlassCard className="w-full h-80 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-6 h-6 border-2 border-white/10 border-t-[#FF5722] animate-spin rounded-full" />
                    <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest animate-pulse">Loading Data...</p>
                </div>
            </GlassCard>
        );
    }

    return (
        <GlassCard className="w-full flex flex-col">
            {(title || action) && (
                <div className="p-6 border-b border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    {title && <h3 className="text-lg font-bold text-white tracking-tight">{title}</h3>}
                    {action}
                </div>
            )}

            {/* Toolbar Section */}
            {toolbar && (
                <div className="px-6 py-4 border-b border-white/5 bg-white/[0.01]">
                    {toolbar}
                </div>
            )}

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="border-b border-white/10 bg-white/[0.02]">
                            {columns.map((col, i) => (
                                <th key={i} className={`p-6 font-mono font-medium text-[10px] text-white/30 uppercase tracking-widest ${col.className || ''}`}>
                                    {col.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {data.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length} className="p-12 text-center text-white/30">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center mb-2">
                                            <div className="w-1 h-1 bg-white/20" />
                                        </div>
                                        <p className="font-mono text-xs uppercase tracking-wider">No records found</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            data.map((item) => (
                                <tr
                                    key={item.id}
                                    onClick={() => onRowClick?.(item)}
                                    className={`group transition-all duration-200 hover:bg-white/[0.03] ${onRowClick ? 'cursor-pointer' : ''}`}
                                >
                                    {columns.map((col, i) => (
                                        <td key={i} className={`p-6 text-white/70 group-hover:text-white transition-colors ${col.className || ''}`}>
                                            {col.cell ? col.cell(item) : (item[col.accessorKey as keyof T] as React.ReactNode)}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4 p-4">
                {data.length === 0 ? (
                    <div className="p-12 text-center text-white/30 flex flex-col items-center gap-2 border border-dashed border-white/10 rounded-xl">
                        <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center mb-2">
                            <div className="w-1 h-1 bg-white/20" />
                        </div>
                        <p className="font-mono text-xs uppercase tracking-wider">No records found</p>
                    </div>
                ) : (
                    data.map((item) => (
                        <div
                            key={item.id}
                            onClick={() => onRowClick?.(item)}
                            className={`bg-white/5 rounded-xl p-4 space-y-3 border border-white/5 ${onRowClick ? 'active:bg-white/10 active:scale-[0.98] transition-all' : ''}`}
                        >
                            {columns.map((col, i) => (
                                <div key={i} className="flex justify-between items-start gap-4">
                                    {/* Only show header label if it's not empty, otherwise it might look weird for action columns */}
                                    {col.header && (
                                        <span className="text-[10px] uppercase font-mono text-white/40 shrink-0 mt-1 tracking-wider">
                                            {col.header}
                                        </span>
                                    )}
                                    <div className={`text-right text-sm flex-1 flex justify-end ${col.className || ''}`}>
                                        {col.cell ? col.cell(item) : (item[col.accessorKey as keyof T] as React.ReactNode)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))
                )}
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
                <div className="p-4 border-t border-white/5 flex items-center justify-end gap-2 text-xs">
                    <span className="text-white/30 mr-4 font-mono">
                        PAGE {pagination.currentPage} / {pagination.totalPages}
                    </span>
                    <button
                        onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
                        disabled={pagination.currentPage === 1}
                        className="w-8 h-8 flex items-center justify-center rounded border border-white/10 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-white"
                    >
                        <ChevronLeft className="w-3 h-3" />
                    </button>
                    <button
                        onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
                        disabled={pagination.currentPage === pagination.totalPages}
                        className="w-8 h-8 flex items-center justify-center rounded border border-white/10 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-white"
                    >
                        <ChevronRight className="w-3 h-3" />
                    </button>
                </div>
            )}
        </GlassCard>
    );
}
