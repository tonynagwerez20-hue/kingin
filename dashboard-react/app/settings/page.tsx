"use client";

import { useEffect, useState } from "react";
import { Settings, Save, Shield, Database, TrendingUp, CheckCircle2, AlertCircle } from "lucide-react";

export default function SettingsPage() {
    const [settings, setSettings] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await fetch("http://localhost:8000/settings");
                const data = await res.json();
                setSettings(data);
            } catch (error) {
                console.error("Failed to fetch settings:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);
        try {
            const res = await fetch("http://localhost:8000/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(settings),
            });
            const result = await res.json();
            if (result.status === "SUCCESS") {
                setMessage({ type: "success", text: "Settings saved successfully" });
            } else {
                setMessage({ type: "error", text: result.message || "Failed to save settings" });
            }
        } catch (error) {
            setMessage({ type: "error", text: "Connection error. Could not save settings." });
        } finally {
            setSaving(false);
            setTimeout(() => setMessage(null), 3000);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!settings) {
        return (
            <div className="max-w-4xl mx-auto py-20 text-center space-y-4">
                <AlertCircle className="mx-auto text-danger" size={48} />
                <h1 className="text-2xl font-bold uppercase tracking-tight">Configuration Link Offline</h1>
                <p className="text-textSecondary">Unable to retrieve system settings. Please ensure the backend server is running.</p>
                <button
                    onClick={() => window.location.reload()}
                    className="btn btn-primary px-6 py-2 rounded-lg font-bold"
                >
                    Retry Connection
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-10">
            <div className="flex justify-between items-center border-b border-border pb-8">
                <div>
                    <h1 className="text-4xl font-black mb-2 tracking-tighter uppercase uppercase">System Settings</h1>
                    <p className="text-textSecondary font-mono text-xs uppercase tracking-widest">Global Configuration • v5.3</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="btn btn-primary flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                >
                    {saving ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                        <Save size={20} />
                    )}
                    {saving ? "Saving..." : "Save Changes"}
                </button>
            </div>

            {message && (
                <div className={`p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 ${message.type === "success" ? "bg-success/10 text-success border border-success/30" : "bg-danger/10 text-danger border border-danger/30"
                    }`}>
                    {message.type === "success" ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                    <span className="font-bold">{message.text}</span>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Trading Section */}
                <section className="card space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                        <TrendingUp className="text-primary" size={24} />
                        <h2 className="text-xl font-bold uppercase tracking-tight">Trading Parameters</h2>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-textSecondary uppercase tracking-widest">Target Symbol</label>
                            <input
                                type="text"
                                value={settings.trading.symbol}
                                onChange={(e) => setSettings({ ...settings, trading: { ...settings.trading, symbol: e.target.value } })}
                                className="w-full bg-black/50 border border-border rounded-lg p-3 font-mono text-sm focus:border-primary outline-none transition-colors"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-textSecondary uppercase tracking-widest">Default Lots</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={settings.trading.default_lot_size}
                                    onChange={(e) => setSettings({ ...settings, trading: { ...settings.trading, default_lot_size: parseFloat(e.target.value) } })}
                                    className="w-full bg-black/50 border border-border rounded-lg p-3 font-mono text-sm focus:border-primary outline-none transition-colors"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-textSecondary uppercase tracking-widest">Default SL (Pips)</label>
                                <input
                                    type="number"
                                    value={settings.trading.default_sl_pips}
                                    onChange={(e) => setSettings({ ...settings, trading: { ...settings.trading, default_sl_pips: parseInt(e.target.value) } })}
                                    className="w-full bg-black/50 border border-border rounded-lg p-3 font-mono text-sm focus:border-primary outline-none transition-colors"
                                />
                            </div>
                        </div>
                    </div>
                </section>

                {/* Risk Section */}
                <section className="card space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                        <Shield className="text-primary" size={24} />
                        <h2 className="text-xl font-bold uppercase tracking-tight">Risk Management</h2>
                    </div>

                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-textSecondary uppercase tracking-widest">Risk Per Trade (%)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={settings.risk.max_risk_per_trade_pct}
                                    onChange={(e) => setSettings({ ...settings, risk: { ...settings.risk, max_risk_per_trade_pct: parseFloat(e.target.value) } })}
                                    className="w-full bg-black/50 border border-border rounded-lg p-3 font-mono text-sm focus:border-primary outline-none transition-colors"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-textSecondary uppercase tracking-widest">Max Daily Loss (%)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={settings.risk.max_daily_loss_pct}
                                    onChange={(e) => setSettings({ ...settings, risk: { ...settings.risk, max_daily_loss_pct: parseFloat(e.target.value) } })}
                                    className="w-full bg-black/50 border border-border rounded-lg p-3 font-mono text-sm focus:border-primary outline-none transition-colors"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-textSecondary uppercase tracking-widest">Max Concurrent Trades</label>
                            <input
                                type="number"
                                value={settings.risk.max_concurrent_trades}
                                onChange={(e) => setSettings({ ...settings, risk: { ...settings.risk, max_concurrent_trades: parseInt(e.target.value) } })}
                                className="w-full bg-black/50 border border-border rounded-lg p-3 font-mono text-sm focus:border-primary outline-none transition-colors"
                            />
                        </div>
                    </div>
                </section>

                {/* Data Feed Section */}
                <section className="card space-y-6 md:col-span-2">
                    <div className="flex items-center gap-3 mb-2">
                        <Database className="text-primary" size={24} />
                        <h2 className="text-xl font-bold uppercase tracking-tight">Data Feed Connection</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-textSecondary uppercase tracking-widest">Protocol Type</label>
                            <select
                                value={settings.data_feed.mode}
                                onChange={(e) => setSettings({ ...settings, data_feed: { ...settings.data_feed, mode: e.target.value } })}
                                className="w-full bg-black/50 border border-border rounded-lg p-3 font-mono text-sm focus:border-primary outline-none transition-colors appearance-none"
                            >
                                <option value="DTC">Sierra Chart (DTC)</option>
                                <option value="CSV">Batch Poll (CSV)</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-textSecondary uppercase tracking-widest">Feed Host</label>
                            <input
                                type="text"
                                value={settings.data_feed.host}
                                onChange={(e) => setSettings({ ...settings, data_feed: { ...settings.data_feed, host: e.target.value } })}
                                className="w-full bg-black/50 border border-border rounded-lg p-3 font-mono text-sm focus:border-primary outline-none transition-colors"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-textSecondary uppercase tracking-widest">Feed Port</label>
                            <input
                                type="number"
                                value={settings.data_feed.port}
                                onChange={(e) => setSettings({ ...settings, data_feed: { ...settings.data_feed, port: parseInt(e.target.value) } })}
                                className="w-full bg-black/50 border border-border rounded-lg p-3 font-mono text-sm focus:border-primary outline-none transition-colors"
                            />
                        </div>
                    </div>
                </section>
            </div>

            <div className="flex justify-end gap-4 italic opacity-50 text-xs font-mono">
                <span>Changes require a system restart via UNIVERSAL_CONTROL.bat</span>
            </div>
        </div>
    );
}
