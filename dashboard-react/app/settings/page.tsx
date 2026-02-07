"use client";

import { useEffect, useState } from "react";
import {
    Settings,
    Save,
    Shield,
    Database,
    TrendingUp,
    CheckCircle2,
    AlertCircle,
    RefreshCcw,
    Zap,
    Sliders
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <header className="flex items-center justify-between border-b border-border pb-6">
                <div>
                    <h2 className="text-3xl font-black tracking-tighter uppercase flex items-center gap-3">
                        Terminal Config <span className="text-primary/50 text-xl font-mono">v5.3</span>
                    </h2>
                    <p className="text-muted-foreground text-[10px] uppercase tracking-[0.2em] font-black flex items-center gap-2 mt-1">
                        <Settings size={12} className="text-primary" />
                        Global Parameter Orchestration
                    </p>
                </div>
                <button className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-md text-xs font-black uppercase tracking-widest hover:scale-105 transition-all shadow-[0_0_15px_rgba(0,255,255,0.3)]">
                    <Save size={16} /> Save Changes
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                            <TrendingUp size={14} className="text-primary" /> Trading Matrix
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <ConfigInput label="Target Symbol" value="XAU/USD" />
                        <div className="grid grid-cols-2 gap-4">
                            <ConfigInput label="Default Lots" value="0.50" />
                            <ConfigInput label="Default SL" value="50 Pips" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                            <Shield size={14} className="text-primary" /> Risk Sentinel
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <ConfigInput label="Risk/Trade %" value="1.0" />
                            <ConfigInput label="Max Daily %" value="3.0" />
                        </div>
                        <ConfigInput label="Max Positions" value="5" />
                    </CardContent>
                </Card>

                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                            <Database size={14} className="text-primary" /> Feed Pipeline
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Protocol</label>
                                <div className="p-2.5 bg-accent/30 rounded border border-border/50 text-foreground font-mono text-xs font-bold flex items-center justify-between">
                                    Sierra Chart (DTC)
                                    <Sliders size={12} className="text-primary" />
                                </div>
                            </div>
                            <ConfigInput label="Feed Host" value="127.0.0.1" />
                            <ConfigInput label="Feed Port" value="11099" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="p-4 bg-accent/10 border border-border/50 rounded-lg flex items-start gap-4">
                <div className="p-2 bg-yellow-500/20 rounded">
                    <AlertCircle className="text-yellow-500" size={18} />
                </div>
                <div>
                    <p className="text-xs font-black uppercase tracking-tight text-foreground">Hot-Swap Unavailable</p>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">Changes committed here require a full system lifecycle restart via UNIVERSAL_CONTROL.bat</p>
                </div>
            </div>
        </div>
    );
}

function ConfigInput({ label, value }: { label: string; value: string }) {
    return (
        <div className="space-y-1.5">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{label}</label>
            <input
                type="text"
                defaultValue={value}
                className="w-full bg-accent/30 border border-border/50 rounded p-2.5 font-mono text-xs font-bold text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
            />
        </div>
    );
}
