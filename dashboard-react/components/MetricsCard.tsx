"use client";

import { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MetricsCardProps {
    title: string;
    value: string;
    icon?: LucideIcon;
    trend?: number;
    className?: string;
    label?: string; // Validation: kept for safety but not used in new design
    color?: string; // Validation: kept for safety
}

export default function MetricsCard({ title, value, icon: Icon, trend, className, label }: MetricsCardProps) {
    // Fallback for legacy prop usage if any
    const displayTitle = title || label;

    return (
        <Card className={cn("bg-card border-border", className)}>
            <CardHeader className="pb-2">
                <CardTitle className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-black flex items-center gap-2">
                    {Icon && <Icon size={12} className="text-primary" />}
                    {displayTitle}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-black tracking-tight">{value}</div>
                {trend !== undefined && trend !== 0 && (
                    <p className={cn(
                        "text-[10px] font-bold mt-1 tracking-tight",
                        trend > 0 ? "text-primary" : "text-destructive"
                    )}>
                        {trend > 0 ? "+" : ""}{trend}%
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
