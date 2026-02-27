"use client";

import { LucideIcon } from "lucide-react";

interface StatusCardProps {
    title: string;
    value: string;
    icon: LucideIcon;
    status: "success" | "warning" | "danger" | "neutral";
}

const statusColors = {
    success: "text-success",
    warning: "text-warning",
    danger: "text-danger",
    neutral: "text-textSecondary",
};

export default function StatusCard({ title, value, icon: Icon, status }: StatusCardProps) {
    return (
        <div className="card">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-textSecondary">{title}</h3>
                <Icon className={statusColors[status]} size={20} />
            </div>
            <p className="text-2xl font-bold">{value}</p>
        </div>
    );
}
