"use client";

interface MetricsCardProps {
    label: string;
    value: string;
    color: "success" | "danger" | "warning" | "primary";
}

const colorClasses = {
    success: "border-success text-success",
    danger: "border-danger text-danger",
    warning: "border-warning text-warning",
    primary: "border-primary text-primary",
};

export default function MetricsCard({ label, value, color }: MetricsCardProps) {
    return (
        <div className={`card border-l-4 ${colorClasses[color]}`}>
            <p className="text-sm text-textSecondary mb-1">{label}</p>
            <p className="text-2xl font-bold font-mono">{value}</p>
        </div>
    );
}
