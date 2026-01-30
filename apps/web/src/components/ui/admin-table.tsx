import React from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';

interface Column<T> {
    header: string;
    accessorKey?: keyof T;
    cell?: (item: T) => React.ReactNode;
    className?: string;
}

interface AdminTableProps<T> {
    data: T[];
    columns: Column<T>[];
    isLoading?: boolean;
    onRowClick?: (item: T) => void;
    pagination?: {
        currentPage: number;
        totalPages: number;
        onPageChange: (page: number) => void;
    };
}

export function AdminTable<T extends { id: string | number }>({
    data,
    columns,
    isLoading,
    onRowClick,
    pagination,
}: AdminTableProps<T>) {
    if (isLoading) {
        return (
            <div className="w-full h-64 flex items-center justify-center border border-white/10 rounded-2xl bg-[#0A0A0A]">
                <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-[#FF5722] animate-spin" />
            </div>
        );
    }

    return (
        <div className="w-full space-y-4">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0A0A0A]">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-white/10 bg-white/5">
                                {columns.map((col, i) => (
                                    <th key={i} className={`p-4 font-mono text-xs font-bold text-white/40 uppercase tracking-wider ${col.className || ''}`}>
                                        {col.header}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {data.length === 0 ? (
                                <tr>
                                    <td colSpan={columns.length} className="p-8 text-center text-white/40 italic">
                                        No data found
                                    </td>
                                </tr>
                            ) : (
                                data.map((item) => (
                                    <tr
                                        key={item.id}
                                        onClick={() => onRowClick?.(item)}
                                        className={`group transition-colors hover:bg-white/5 ${onRowClick ? 'cursor-pointer' : ''}`}
                                    >
                                        {columns.map((col, i) => (
                                            <td key={i} className={`p-4 text-white/80 ${col.className || ''}`}>
                                                {col.cell ? col.cell(item) : (item[col.accessorKey as keyof T] as React.ReactNode)}
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-4">
                    <button
                        onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
                        disabled={pagination.currentPage === 1}
                        className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5 text-white" />
                    </button>
                    <span className="text-sm text-white/60 font-mono">
                        Page {pagination.currentPage} of {pagination.totalPages}
                    </span>
                    <button
                        onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
                        disabled={pagination.currentPage === pagination.totalPages}
                        className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronRight className="w-5 h-5 text-white" />
                    </button>
                </div>
            )}
        </div>
    );
}
