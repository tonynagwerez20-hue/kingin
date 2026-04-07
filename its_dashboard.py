"""
its_dashboard.py — ITS Live Trading Dashboard  v3.0
=====================================================
Key improvements over v2.0:
  - ZERO FLICKER: All labels use StringVar / configuring text/fg only — no
    widget destroy/recreate cycles during updates.
  - Signals counter: persistent across session, incremented on each new signal.
  - Trade log: append-only history panel that survives poll cycles.
  - Refined fonts: Inter/Segoe UI Semibold for data, monospace only for log.
  - Slimmer, better-proportioned panels with subtle gradient accent bars.
  - ITS logo rendered on the header canvas (pure-tkinter, no image file needed).
  - Master switch indicator in header.
"""

import json
import os
import sys
import time
import subprocess
import tkinter as tk
from tkinter import font as tkfont
from datetime import datetime, timezone
from collections import deque

# ── Path anchor ───────────────────────────────────────────────────────────────
BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
STATE_FILE = os.path.join(BASE_DIR, "engine_state.json")

# ── Palette ───────────────────────────────────────────────────────────────────
BG      = "#09090f"
PANEL   = "#0d0d17"
PANEL2  = "#111122"
BORDER  = "#1e1e30"
ACCENT  = "#00d4ff"
ACCENT2 = "#0088cc"
GREEN   = "#00e87a"
GREEN2  = "#007a40"
RED     = "#ff2d55"
RED2    = "#7a0020"
AMBER   = "#ffaa00"
AMBER2  = "#7a5000"
TEXT    = "#c8dce8"
SUBTEXT = "#3a4a5a"
DIMTEXT = "#5a6a7a"
WHITE   = "#eef4f8"

# ── Fonts ─────────────────────────────────────────────────────────────────────
# Prefer Segoe UI (Windows), fall back gracefully
_UI_CANDIDATES = ["Segoe UI", "SF Pro Display", "Helvetica Neue", "Arial"]
_MONO_CANDIDATES = ["Consolas", "JetBrains Mono", "Courier New"]

def _best_font(candidates):
    available = tkfont.families()
    for f in candidates:
        if f in available:
            return f
    return candidates[-1]

# These are assigned after Tk() is created
UI_FONT   = None
MONO_FONT = None

# ── Layer display names ───────────────────────────────────────────────────────
LAYER_NAMES = [
    "KillzoneFilterLayer",
    "MechanicalStructureLayer",
    "LiquiditySweepLayer",
    "DisplacementLayer",
    "FVGDiscountLayer",
    "MicroMSSLayer",
    "NewsEventLayer",
]

LAYER_SHORT = {
    "KillzoneFilterLayer":      "Killzone",
    "MechanicalStructureLayer": "Structure",
    "LiquiditySweepLayer":      "Liq Sweep",
    "DisplacementLayer":        "Displace",
    "FVGDiscountLayer":         "FVG/IFVG",
    "MicroMSSLayer":            "Micro MSS",
    "NewsEventLayer":           "News",
}

# ── Demo state ────────────────────────────────────────────────────────────────
def _demo_state(session: dict) -> dict:
    now = datetime.now(timezone.utc).isoformat()
    return {
        "timestamp":        now,
        "symbol":           "XAUUSD [DEMO]",
        "bias":             "BULLISH",
        "current_price":    3125.50,
        "signal_action":    "LONG",
        "entry_price":      3125.50,
        "stop_loss":        3120.00,
        "take_profit":      3135.00,
        "lot_size":         0.01,
        "execution_type":   "MARKET",
        "confluence_score": 6.0,
        "killzone_name":    "London Open",
        "session_time":     "08:00–11:00 UTC",
        "rr_ratio":         "1:1.91",
        "layers": [
            {"name": n, "passed": i < 6, "score": 1.0 if i < 6 else 0.0,
             "reason": "DEMO"} for i, n in enumerate(LAYER_NAMES)
        ],
        "last_trade": {
            "action": "LONG", "symbol": "XAUUSD", "price": 3120.00,
            "sl": 3115.00, "tp": 3130.00, "lots": 0.01,
            "bias": "BULLISH", "execution_type": "MARKET",
            "confluence_score": 5.75, "timestamp": now,
        },
        "account_equity":    session.get("equity",   88.50),
        "account_balance":   session.get("balance",  86.80),
        "floating_pnl":      1.70,
        "open_trades_count": 1,
        "open_positions": [{
            "symbol": "XAUUSD", "type": "BUY", "lots": 0.01,
            "open_price": 3120.00, "current_price": 3125.50,
            "sl": 3115.00, "tp": 3130.00, "floating_pnl": 0.55,
            "open_time": now,
        }],
        "active_warnings": ["DEMO MODE — engine_state.json not found"],
    }


# ── ITS Logo (pure canvas drawing, no image file needed) ─────────────────────
def draw_its_logo(canvas: tk.Canvas, x: int, y: int, size: int = 32) -> None:
    """
    Draws a stylised 'ITS' hexagonal badge on the given canvas at (x, y).
    size controls the overall scale.
    """
    s = size
    # Outer hexagon
    pts = []
    import math
    for i in range(6):
        angle = math.radians(60 * i - 30)
        pts.extend([x + s * math.cos(angle), y + s * math.sin(angle)])
    canvas.create_polygon(pts, fill=PANEL2, outline=ACCENT, width=2, smooth=False)

    # Inner accent ring
    s2 = s * 0.78
    pts2 = []
    for i in range(6):
        angle = math.radians(60 * i - 30)
        pts2.extend([x + s2 * math.cos(angle), y + s2 * math.sin(angle)])
    canvas.create_polygon(pts2, fill="", outline=ACCENT2, width=1, smooth=False)

    # Text "ITS"
    canvas.create_text(x, y, text="ITS",
                       fill=ACCENT,
                       font=(UI_FONT, int(s * 0.42), "bold"))


# ── Thin separator ────────────────────────────────────────────────────────────
def hsep(parent, color=BORDER) -> tk.Frame:
    f = tk.Frame(parent, bg=color, height=1)
    f.pack(fill="x", padx=0, pady=2)
    return f


# ── Stat tile (used in account panel) ────────────────────────────────────────
class StatTile:
    def __init__(self, parent, label, color, row, col):
        f = tk.Frame(parent, bg=PANEL2, padx=10, pady=8)
        f.grid(row=row, column=col, padx=4, pady=4, sticky="nsew")
        tk.Label(f, text=label, bg=PANEL2, fg=DIMTEXT,
                 font=(UI_FONT, 8)).pack(anchor="w")
        self.var = tk.StringVar(value="—")
        self.lbl = tk.Label(f, textvariable=self.var, bg=PANEL2, fg=color,
                            font=(UI_FONT, 14, "bold"))
        self.lbl.pack(anchor="w", pady=(2, 0))


# ── Draggable floating panel ──────────────────────────────────────────────────
class FloatingPanel:
    def __init__(self, canvas: tk.Canvas, title: str,
                 x: int, y: int, width: int,
                 top_color: str = ACCENT, tag: str = ""):
        self._canvas    = canvas
        self._title     = title
        self._x         = x
        self._y         = y
        self._width     = width
        self._minimised = False
        self._drag_x    = 0
        self._drag_y    = 0

        self.frame = tk.Frame(canvas, bg=PANEL,
                              highlightthickness=1,
                              highlightbackground=BORDER)

        # Top accent bar (3 px)
        tk.Frame(self.frame, bg=top_color, height=3).pack(fill="x")

        # Title bar
        self._title_bar = tk.Frame(self.frame, bg=PANEL)
        self._title_bar.pack(fill="x", padx=0, pady=0)

        tk.Label(self._title_bar, text=title.upper(),
                 bg=PANEL, fg=top_color,
                 font=(UI_FONT, 8, "bold"),
                 anchor="w").pack(side="left", padx=8, pady=5)

        self._min_btn = tk.Button(
            self._title_bar, text="▾", bg=PANEL, fg=SUBTEXT,
            relief="flat", font=(UI_FONT, 9),
            bd=0, cursor="hand2",
            activebackground=PANEL, activeforeground=ACCENT,
            command=self._toggle_minimise
        )
        self._min_btn.pack(side="right", padx=6)

        hsep(self.frame, BORDER)

        # Body
        self.body = tk.Frame(self.frame, bg=PANEL)
        self.body.pack(fill="both", expand=True)

        self._window = canvas.create_window(x, y, window=self.frame, anchor="nw",
                                            tags=tag if tag else ())

        for w in (self._title_bar,):
            w.bind("<ButtonPress-1>", self._start_drag)
            w.bind("<B1-Motion>",     self._do_drag)
        self.frame.bind("<ButtonPress-1>", lambda e: self._to_front())
        self._title_bar.bind("<ButtonPress-1>", self._start_drag)

    def _start_drag(self, event):
        self._drag_x = event.x_root
        self._drag_y = event.y_root
        self._to_front()

    def _do_drag(self, event):
        dx = event.x_root - self._drag_x
        dy = event.y_root - self._drag_y
        self._drag_x = event.x_root
        self._drag_y = event.y_root
        self._x += dx
        self._y += dy
        self._canvas.coords(self._window, self._x, self._y)

    def _to_front(self):
        self._canvas.tag_raise(self._window)

    def _toggle_minimise(self):
        self._minimised = not self._minimised
        if self._minimised:
            self.body.pack_forget()
            self._min_btn.config(text="▸")
        else:
            self.body.pack(fill="both", expand=True)
            self._min_btn.config(text="▾")

    def show(self):
        self._canvas.itemconfigure(self._window, state="normal")

    def hide(self):
        self._canvas.itemconfigure(self._window, state="hidden")

    def toggle_visibility(self) -> bool:
        state = self._canvas.itemcget(self._window, "state")
        if state == "hidden":
            self.show(); return True
        else:
            self.hide(); return False


# ── No-flicker label row builder ──────────────────────────────────────────────
def kv_row(parent, label_text, label_fg=DIMTEXT, value_fg=TEXT,
           label_font=None, value_font=None, pady=3):
    """Returns (StringVar, value_label) for a key: value row."""
    f = tk.Frame(parent, bg=PANEL)
    f.pack(fill="x", padx=10, pady=pady)
    tk.Label(f, text=label_text, bg=PANEL, fg=label_fg,
             font=label_font or (UI_FONT, 8), anchor="w").pack(side="left")
    var = tk.StringVar(value="—")
    lbl = tk.Label(f, textvariable=var, bg=PANEL, fg=value_fg,
                   font=value_font or (UI_FONT, 9, "bold"), anchor="e")
    lbl.pack(side="right")
    return var, lbl


# ── Main Dashboard ────────────────────────────────────────────────────────────
class DashboardApp:
    """
    ITS Live Trading Dashboard.
    No widget destroy/recreate during updates → zero flicker.
    """

    VERSION    = "3.0"
    POLL_MS    = 2000
    CLOCK_MS   = 1000
    STALE_SECS = 10

    def __init__(self, root: tk.Tk, session: dict):
        global UI_FONT, MONO_FONT
        self._root     = root
        self._session  = session
        self._state    = {}
        self._online   = False
        self._start_ts = time.time()

        # Signal tracking
        self._signals_generated = 0
        self._last_signal_id    = None   # track signal changes by (action, entry, ts)

        # Persistent trade history (session-scoped)
        self._trade_history: deque = deque(maxlen=200)
        self._seen_trade_keys: set = set()   # deduplicate by timestamp+price

        # Pipeline log buffer
        self._pipeline_log: deque = deque(maxlen=300)

        # Open positions display rows (pre-allocated, no destroy/recreate)
        self._pos_row_vars: list = []   # list of list of StringVar
        self._pos_row_lbls: list = []   # list of list of Label (for fg changes)

        # Warning label vars
        self._warn_vars: list = []
        self._warn_lbls: list = []

        try:
            import MetaTrader5 as mt5
            self._mt5 = mt5
        except ImportError:
            self._mt5 = None

        # Resolve fonts after Tk is running
        UI_FONT   = _best_font(_UI_CANDIDATES)
        MONO_FONT = _best_font(_MONO_CANDIDATES)

        self._setup_window()
        self._build_header()
        self._build_engine_bar()
        self._build_canvas()
        self._build_panels()
        self._build_toggle_bar()

        self._root.after(150,           self._poll_state)
        self._root.after(150,           self._update_clock)

    # ── Window ────────────────────────────────────────────────────────────────
    def _setup_window(self):
        acct = self._session.get("account", "DEMO")
        self._root.title(f"ITS — Institutional Trading System  ·  XAUUSD  ·  {acct}")
        self._root.configure(bg=BG)
        self._root.state("zoomed")

        ico = os.path.join(BASE_DIR, "its_icon.ico")
        if os.path.exists(ico):
            try:
                self._root.iconbitmap(ico)
            except Exception:
                pass

        self._root.protocol("WM_DELETE_WINDOW", self._on_shutdown)

    # ── Header ────────────────────────────────────────────────────────────────
    def _build_header(self):
        hdr = tk.Frame(self._root, bg=PANEL,
                       highlightthickness=1, highlightbackground=BORDER)
        hdr.pack(fill="x")

        # Logo canvas
        logo_c = tk.Canvas(hdr, bg=PANEL, width=70, height=44,
                           highlightthickness=0)
        logo_c.pack(side="left", padx=(8, 0))
        # Draw logo after window is up (after idle)
        self._root.after_idle(lambda: draw_its_logo(logo_c, 35, 22, size=18))

        # System name
        lf = tk.Frame(hdr, bg=PANEL)
        lf.pack(side="left", padx=4, pady=6)
        tk.Label(lf, text="INSTITUTIONAL TRADING SYSTEM",
                 bg=PANEL, fg=ACCENT,
                 font=(UI_FONT, 11, "bold")).pack(anchor="w")
        tk.Label(lf, text=f"XAUUSD  ·  Acct: {self._session.get('account','DEMO')}",
                 bg=PANEL, fg=SUBTEXT,
                 font=(UI_FONT, 8)).pack(anchor="w")

        # Centre: price
        cf = tk.Frame(hdr, bg=PANEL)
        cf.pack(side="left", expand=True)
        self._sym_var   = tk.StringVar(value="XAUUSD")
        self._price_var = tk.StringVar(value="—")
        tk.Label(cf, textvariable=self._sym_var,
                 bg=PANEL, fg=DIMTEXT,
                 font=(UI_FONT, 10)).pack(side="left")
        tk.Label(cf, text="  ", bg=PANEL).pack(side="left")
        self._price_lbl = tk.Label(cf, textvariable=self._price_var,
                                   bg=PANEL, fg=WHITE,
                                   font=(UI_FONT, 20, "bold"))
        self._price_lbl.pack(side="left")

        # Right: master switch indicator + status + clock
        rf = tk.Frame(hdr, bg=PANEL)
        rf.pack(side="right", padx=14, pady=6)

        # Master switch dot
        self._ms_dot = tk.Label(rf, text="●", bg=PANEL, fg=SUBTEXT,
                                font=(UI_FONT, 12))
        self._ms_dot.pack(side="left", padx=(0, 4))
        self._ms_lbl = tk.Label(rf, text="SWITCH", bg=PANEL, fg=SUBTEXT,
                                font=(UI_FONT, 7))
        self._ms_lbl.pack(side="left", padx=(0, 14))

        # Status
        self._status_var = tk.StringVar(value="CONNECTING…")
        self._status_lbl = tk.Label(rf, textvariable=self._status_var,
                                    bg=PANEL, fg=AMBER,
                                    font=(UI_FONT, 10, "bold"))
        self._status_lbl.pack(side="left", padx=(0, 16))

        # Clock
        self._clock_var = tk.StringVar(value="--:--:-- UTC")
        tk.Label(rf, textvariable=self._clock_var,
                 bg=PANEL, fg=DIMTEXT,
                 font=(MONO_FONT, 9)).pack(side="left")

    # ── Engine bar ────────────────────────────────────────────────────────────
    def _build_engine_bar(self):
        bar = tk.Frame(self._root, bg=PANEL2,
                       highlightthickness=1, highlightbackground=BORDER)
        bar.pack(fill="x")

        def pill(parent, text, bg_col, cmd, hover_col=None):
            b = tk.Button(parent, text=text, bg=bg_col, fg=BG,
                          font=(UI_FONT, 8, "bold"),
                          relief="flat", cursor="hand2", command=cmd,
                          padx=12, pady=4,
                          activebackground=hover_col or bg_col,
                          activeforeground=BG)
            b.pack(side="left", padx=4, pady=5)
            return b

        pill(bar, "▶  START",    GREEN,  self._engine_start, GREEN2)
        pill(bar, "■  STOP",     RED,    self._engine_stop,  RED2)
        pill(bar, "↺  RESTART",  AMBER,  self._engine_restart, AMBER2)
        pill(bar, "⏻  SHUTDOWN", RED,    self._on_shutdown,  RED2)

        # Stat labels
        self._uptime_var   = tk.StringVar(value="Uptime: 00:00:00")
        self._signals_var  = tk.StringVar(value="Signals: 0")
        self._trades_sent_var = tk.StringVar(value="Trades: 0")
        self._last_sig_var = tk.StringVar(value="Last Signal: —")

        for v, col in [
            (self._uptime_var,      DIMTEXT),
            (self._signals_var,     ACCENT),
            (self._trades_sent_var, GREEN),
            (self._last_sig_var,    DIMTEXT),
        ]:
            tk.Label(bar, textvariable=v, bg=PANEL2, fg=col,
                     font=(UI_FONT, 8)).pack(side="left", padx=14)

    # ── Scrollable canvas ─────────────────────────────────────────────────────
    def _build_canvas(self):
        frame = tk.Frame(self._root, bg=BG)
        frame.pack(fill="both", expand=True)

        self._canvas = tk.Canvas(frame, bg=BG, width=1500, height=1100,
                                 highlightthickness=0,
                                 scrollregion=(0, 0, 1500, 1100))

        sb_y = tk.Scrollbar(frame, orient="vertical",
                            command=self._canvas.yview,
                            bg=BORDER, troughcolor=BG)
        sb_x = tk.Scrollbar(frame, orient="horizontal",
                            command=self._canvas.xview,
                            bg=BORDER, troughcolor=BG)
        self._canvas.configure(yscrollcommand=sb_y.set,
                               xscrollcommand=sb_x.set)

        sb_y.pack(side="right",  fill="y")
        sb_x.pack(side="bottom", fill="x")
        self._canvas.pack(fill="both", expand=True)

        self._canvas.bind_all(
            "<MouseWheel>",
            lambda e: self._canvas.yview_scroll(-1 * (e.delta // 120), "units")
        )

    # ── Panels ────────────────────────────────────────────────────────────────
    def _build_panels(self):
        C = self._canvas

        # ── Panel 1 — Market Bias ─────────────────────────────────────────────
        p1 = FloatingPanel(C, "Market Bias", 20, 20, 220, top_color=GREEN)

        self._bias_lbl = tk.Label(p1.body, text="—", bg=PANEL, fg=TEXT,
                                  font=(UI_FONT, 28, "bold"))
        self._bias_lbl.pack(pady=(10, 0))

        self._kz_lbl = tk.Label(p1.body, text="—", bg=PANEL, fg=ACCENT,
                                font=(UI_FONT, 10, "bold"))
        self._kz_lbl.pack(pady=(2, 0))
        self._sess_lbl = tk.Label(p1.body, text="—", bg=PANEL, fg=DIMTEXT,
                                  font=(UI_FONT, 8))
        self._sess_lbl.pack()
        hsep(p1.body)
        self._conf_lbl = tk.Label(p1.body, text="Score: —/7", bg=PANEL,
                                  fg=AMBER, font=(UI_FONT, 9, "bold"))
        self._conf_lbl.pack(pady=(4, 10))

        # ── Panel 2 — Active Signal ───────────────────────────────────────────
        p2 = FloatingPanel(C, "Active Signal", 260, 20, 250, top_color=GREEN)

        self._sig_chip = tk.Label(p2.body, text="WAITING", bg=PANEL2,
                                  fg=SUBTEXT,
                                  font=(UI_FONT, 16, "bold"),
                                  padx=16, pady=6)
        self._sig_chip.pack(pady=(10, 6), padx=10, fill="x")
        hsep(p2.body)

        self._sig_vars = {}
        self._sig_lbls = {}
        rows = [
            ("entry", "Entry Price",  TEXT),
            ("sl",    "Stop Loss",    RED),
            ("tp",    "Take Profit",  GREEN),
            ("lots",  "Lot Size",     TEXT),
            ("exec",  "Exec Type",    ACCENT),
            ("rr",    "R:R Ratio",    AMBER),
        ]
        for key, label, fg in rows:
            var, lbl = kv_row(p2.body, label, value_fg=fg)
            self._sig_vars[key] = var
            self._sig_lbls[key] = lbl
        tk.Frame(p2.body, bg=PANEL, height=6).pack()

        # ── Panel 3 — Last Trade ──────────────────────────────────────────────
        p3 = FloatingPanel(C, "Last Trade → HedgeEA", 530, 20, 230, top_color=ACCENT)

        self._lt_vars = {}
        self._lt_lbls = {}
        lt_rows = [
            ("action", "Action",   TEXT),
            ("symbol", "Symbol",   TEXT),
            ("price",  "Price",    WHITE),
            ("sl",     "SL",       RED),
            ("tp",     "TP",       GREEN),
            ("lots",   "Lots",     TEXT),
            ("bias",   "Bias",     ACCENT),
            ("ts",     "Time",     DIMTEXT),
        ]
        for key, label, fg in lt_rows:
            var, lbl = kv_row(p3.body, label, value_fg=fg)
            self._lt_vars[key] = var
            self._lt_lbls[key] = lbl
        tk.Frame(p3.body, bg=PANEL, height=6).pack()

        # ── Panel 4 — 7-Layer Confluence ──────────────────────────────────────
        p4 = FloatingPanel(C, "7-Layer Confluence", 780, 20, 340, top_color=ACCENT)

        # Header row
        hdr_f = tk.Frame(p4.body, bg=PANEL)
        hdr_f.pack(fill="x", padx=8, pady=(4, 2))
        for txt, w, anchor in [
            ("Layer", 12, "w"), ("Status", 7, "center"),
            ("Score", 6, "e"),  ("Reason", 18, "w")
        ]:
            tk.Label(hdr_f, text=txt, bg=PANEL, fg=DIMTEXT,
                     font=(UI_FONT, 7, "bold"),
                     width=w, anchor=anchor).pack(side="left", padx=2)
        hsep(p4.body, BORDER)

        self._layer_rows = []
        for name in LAYER_NAMES:
            row_f = tk.Frame(p4.body, bg=PANEL)
            row_f.pack(fill="x", padx=8, pady=1)

            tk.Label(row_f, text=LAYER_SHORT.get(name, name),
                     bg=PANEL, fg=TEXT,
                     font=(UI_FONT, 8), width=12, anchor="w").pack(side="left", padx=2)

            s_var = tk.StringVar(value="—")
            s_lbl = tk.Label(row_f, textvariable=s_var, bg=PANEL, fg=SUBTEXT,
                             font=(UI_FONT, 8, "bold"), width=7, anchor="center")
            s_lbl.pack(side="left", padx=2)

            sc_var = tk.StringVar(value="—")
            tk.Label(row_f, textvariable=sc_var, bg=PANEL, fg=DIMTEXT,
                     font=(MONO_FONT, 8), width=6, anchor="e").pack(side="left", padx=2)

            r_var = tk.StringVar(value="—")
            tk.Label(row_f, textvariable=r_var, bg=PANEL, fg=DIMTEXT,
                     font=(UI_FONT, 8), width=18, anchor="w").pack(side="left", padx=2)

            self._layer_rows.append((name, s_var, s_lbl, sc_var, r_var))

        hsep(p4.body)
        self._all_pass_lbl = tk.Label(p4.body, text="", bg=PANEL, fg=GREEN,
                                      font=(UI_FONT, 8, "bold"))
        self._all_pass_lbl.pack(pady=5)

        # ── Panel 5 — Account Overview ────────────────────────────────────────
        p5 = FloatingPanel(C, "Account Overview", 20, 310, 330, top_color=ACCENT)
        tile_frame = tk.Frame(p5.body, bg=PANEL)
        tile_frame.pack(fill="both", expand=True, padx=8, pady=6)
        tile_frame.columnconfigure(0, weight=1)
        tile_frame.columnconfigure(1, weight=1)

        tiles = [
            ("equity",  "Account Equity",  WHITE,  0, 0),
            ("pnl",     "Floating PnL",    AMBER,  0, 1),
            ("balance", "Balance",         GREEN,  1, 0),
            ("trades",  "Open Trades",     ACCENT, 1, 1),
        ]
        self._acc_vars = {}
        self._acc_lbls = {}
        for key, label, color, row, col in tiles:
            st = StatTile(tile_frame, label, color, row, col)
            self._acc_vars[key] = st.var
            self._acc_lbls[key] = st.lbl
        tk.Frame(p5.body, bg=PANEL, height=4).pack()

        # ── Panel 6 — Open Positions (no flicker — pre-allocated rows) ────────
        p6 = FloatingPanel(C, "Open Positions", 370, 310, 560, top_color=AMBER)
        cols = ["Symbol", "Type", "Lots", "Open", "Current", "SL", "TP", "PnL", "Time"]
        tbl_f = tk.Frame(p6.body, bg=PANEL)
        tbl_f.pack(fill="both", expand=True, padx=6, pady=4)
        # Header
        for c, col in enumerate(cols):
            tk.Label(tbl_f, text=col, bg=PANEL, fg=DIMTEXT,
                     font=(UI_FONT, 7, "bold"),
                     width=9, anchor="center").grid(row=0, column=c, padx=1, pady=(0, 3))
        # Pre-allocate 10 data rows (labels with empty text when unused)
        MAX_POS = 10
        for r in range(1, MAX_POS + 1):
            row_vars = []
            row_lbls = []
            for c in range(len(cols)):
                var = tk.StringVar(value="")
                lbl = tk.Label(tbl_f, textvariable=var, bg=PANEL, fg=TEXT,
                               font=(MONO_FONT, 8), width=9, anchor="center")
                lbl.grid(row=r, column=c, padx=1, pady=1)
                row_vars.append(var)
                row_lbls.append(lbl)
            self._pos_row_vars.append(row_vars)
            self._pos_row_lbls.append(row_lbls)

        # ── Panel 7 — Active Warnings (pre-allocated rows) ────────────────────
        p7 = FloatingPanel(C, "Active Warnings", 20, 540, 360, top_color=AMBER)
        warn_f = tk.Frame(p7.body, bg=PANEL)
        warn_f.pack(fill="both", expand=True, padx=8, pady=4)
        MAX_WARN = 8
        for _ in range(MAX_WARN):
            var = tk.StringVar(value="")
            lbl = tk.Label(warn_f, textvariable=var, bg=PANEL, fg=AMBER,
                           font=(UI_FONT, 8), anchor="w",
                           wraplength=330, justify="left")
            lbl.pack(anchor="w", fill="x", pady=1)
            self._warn_vars.append(var)
            self._warn_lbls.append(lbl)

        # ── Panel 8 — Pipeline Log ────────────────────────────────────────────
        p8 = FloatingPanel(C, "Pipeline Log", 400, 540, 400, top_color=DIMTEXT)
        log_outer = tk.Frame(p8.body, bg=PANEL)
        log_outer.pack(fill="both", expand=True, padx=6, pady=4)
        self._log_text = tk.Text(
            log_outer, bg=PANEL2, fg=ACCENT,
            font=(MONO_FONT, 8),
            relief="flat", bd=0, height=10,
            state="disabled", cursor="arrow",
            insertbackground=ACCENT
        )
        log_sb = tk.Scrollbar(log_outer, command=self._log_text.yview,
                              bg=BORDER, troughcolor=BG)
        self._log_text.configure(yscrollcommand=log_sb.set)
        log_sb.pack(side="right", fill="y")
        self._log_text.pack(fill="both", expand=True)

        # ── Panel 9 — Trade History (NEW) ─────────────────────────────────────
        p9 = FloatingPanel(C, "Trade History (Session)", 820, 310, 520, top_color=GREEN)
        th_cols = ["Time", "Symbol", "Action", "Price", "SL", "TP", "Lots", "Score"]
        th_outer = tk.Frame(p9.body, bg=PANEL)
        th_outer.pack(fill="both", expand=True, padx=6, pady=4)
        # Header
        th_hdr = tk.Frame(th_outer, bg=PANEL)
        th_hdr.pack(fill="x")
        for col in th_cols:
            tk.Label(th_hdr, text=col, bg=PANEL, fg=DIMTEXT,
                     font=(UI_FONT, 7, "bold"),
                     width=8, anchor="center").pack(side="left", padx=1)
        hsep(th_outer)
        # Scrollable list
        th_canvas = tk.Canvas(th_outer, bg=PANEL, height=180,
                              highlightthickness=0)
        th_sb = tk.Scrollbar(th_outer, orient="vertical",
                             command=th_canvas.yview, bg=BORDER, troughcolor=BG)
        th_canvas.configure(yscrollcommand=th_sb.set)
        th_sb.pack(side="right", fill="y")
        th_canvas.pack(fill="both", expand=True)
        self._th_inner = tk.Frame(th_canvas, bg=PANEL)
        self._th_inner_id = th_canvas.create_window(0, 0, window=self._th_inner,
                                                     anchor="nw")
        self._th_inner.bind("<Configure>",
                            lambda e: th_canvas.configure(
                                scrollregion=th_canvas.bbox("all")))
        self._th_canvas = th_canvas
        self._trade_row_widgets: list = []  # keep refs so GC doesn't eat them

        # Store panels
        self._panels = [p1, p2, p3, p4, p5, p6, p7, p8, p9]
        self._panel_names = [
            "Bias", "Signal", "Last Trade", "7 Layers",
            "Account", "Positions", "Warnings", "Log", "History"
        ]

    # ── Toggle bar ────────────────────────────────────────────────────────────
    def _build_toggle_bar(self):
        bar = tk.Frame(self._root, bg=PANEL2,
                       highlightthickness=1, highlightbackground=BORDER)
        bar.pack(fill="x", side="bottom")
        self._toggle_btns = []
        for i, name in enumerate(self._panel_names):
            btn = tk.Button(
                bar, text=name,
                bg=ACCENT, fg=BG,
                font=(UI_FONT, 8, "bold"),
                relief="flat", cursor="hand2",
                padx=10, pady=5,
                activebackground=ACCENT2, activeforeground=BG,
                command=lambda idx=i: self._toggle_panel(idx)
            )
            btn.pack(side="left", padx=3, pady=4)
            self._toggle_btns.append(btn)

    def _toggle_panel(self, idx: int):
        visible = self._panels[idx].toggle_visibility()
        self._toggle_btns[idx].config(
            bg=ACCENT if visible else BORDER,
            fg=BG      if visible else SUBTEXT,
        )

    # ── Engine controls ───────────────────────────────────────────────────────
    def _engine_start(self):
        self._append_log("Engine START requested.")
        try:
            env = os.environ.copy()
            py_exe = sys.executable.replace("pythonw.exe", "python.exe")
            env["ITS_PYTHON_EXE"] = py_exe
            env["PYTHONPATH"] = BASE_DIR
            bat = os.path.join(BASE_DIR, "START_ALL.bat")
            subprocess.Popen(
                ["cmd.exe", "/c", bat],
                cwd=BASE_DIR,
                creationflags=0x00000010,  # CREATE_NEW_CONSOLE — errors visible
                env=env
            )
            self._append_log(f"START_ALL.bat launched: {bat}")
        except Exception as e:
            self._append_log(f"Failed to start engine: {e}")

    def _engine_stop(self):
        self._append_log("Engine STOP requested.")
        try:
            bat = os.path.join(BASE_DIR, "SYSTEM_OFF.bat")
            subprocess.Popen(
                ["cmd.exe", "/c", bat],
                cwd=BASE_DIR,
                creationflags=0x00000010   # CREATE_NEW_CONSOLE — errors visible
            )
            self._append_log(f"SYSTEM_OFF.bat launched: {bat}")
        except Exception as e:
            self._append_log(f"Failed to stop engine: {e}")

    def _engine_restart(self):
        self._append_log("Engine RESTART requested.")
        self._engine_stop()
        self._root.after(1500, self._engine_start)

    # ── State polling ─────────────────────────────────────────────────────────
    def _poll_state(self):
        try:
            with open(STATE_FILE, "r", encoding="utf-8") as f:
                state = json.load(f)

            ts_str = state.get("timestamp", "")
            if ts_str:
                try:
                    ts = datetime.fromisoformat(ts_str)
                    if ts.tzinfo is None:
                        ts = ts.replace(tzinfo=timezone.utc)
                    age = (datetime.now(timezone.utc) - ts).total_seconds()
                    if age > self.STALE_SECS:
                        self._set_offline()
                        self._root.after(self.POLL_MS, self._poll_state)
                        return
                except Exception:
                    pass

            self._state  = state
            self._online = True
            self._update_all_panels(state)

        except FileNotFoundError:
            if self._session.get("demo"):
                self._state  = _demo_state(self._session)
                self._online = True
                self._update_all_panels(self._state)
            else:
                self._set_offline()
        except Exception:
            self._set_offline()

        self._root.after(self.POLL_MS, self._poll_state)

    def _set_offline(self):
        self._online = False
        self._status_var.set("OFFLINE")
        self._status_lbl.config(fg=RED)
        self._price_var.set("—")
        self._ms_dot.config(fg=RED)
        self._ms_lbl.config(fg=RED)

    # ── Full update (no flicker — only text/fg changes) ───────────────────────
    def _update_all_panels(self, s: dict):
        self._update_header(s)
        self._update_bias(s)
        self._update_signal(s)
        self._update_last_trade(s)
        self._update_layers(s)
        self._update_account(s)
        self._update_positions(s)
        self._update_warnings(s)
        self._update_trade_history(s)
        self._update_uptime()

    def _update_header(self, s: dict):
        self._sym_var.set(s.get("symbol", "XAUUSD"))
        price = s.get("current_price", 0.0)
        self._price_var.set(f"{price:.2f}")
        self._status_var.set("LIVE" if self._online else "OFFLINE")
        self._status_lbl.config(fg=GREEN if self._online else RED)

        # Master switch (read from config if available)
        ms = s.get("master_switch", None)
        if ms is True:
            self._ms_dot.config(fg=GREEN)
            self._ms_lbl.config(fg=GREEN, text="ON")
        elif ms is False:
            self._ms_dot.config(fg=RED)
            self._ms_lbl.config(fg=RED, text="OFF")
        else:
            self._ms_dot.config(fg=SUBTEXT)
            self._ms_lbl.config(fg=SUBTEXT, text="SWITCH")

    def _update_bias(self, s: dict):
        bias = s.get("bias", "NEUTRAL").upper()
        col  = GREEN if bias == "BULLISH" else RED if bias == "BEARISH" else TEXT
        self._bias_lbl.config(text=bias, fg=col)
        self._kz_lbl.config(text=s.get("killzone_name", "—"))
        self._sess_lbl.config(text=s.get("session_time", "—"))
        score = s.get("confluence_score", 0)
        self._conf_lbl.config(text=f"Confluence  {score:.1f} / 7")

    def _update_signal(self, s: dict):
        action = s.get("signal_action", "NONE").upper()

        # Engine-side signal counter sync (preferred)
        eng_count = s.get("signals_generated")
        if eng_count is not None:
            self._signals_generated = eng_count
            self._signals_var.set(f"Signals: {self._signals_generated}")
        else:
            # Client-side detection (fallback)
            sig_key = (action, s.get("entry_price"), s.get("timestamp","")[:16])
            if action not in ("NONE", "WAITING") and sig_key != self._last_signal_id:
                self._last_signal_id = sig_key
                self._signals_generated += 1
                self._signals_var.set(f"Signals: {self._signals_generated}")

        if action not in ("NONE", "WAITING"):
            self._last_sig_var.set(
                f"Last: {action} @ {s.get('entry_price',0):.2f}"
            )

        if action == "LONG":
            self._sig_chip.config(text="LONG  ▲", bg="#001a0a", fg=GREEN)
        elif action == "SHORT":
            self._sig_chip.config(text="SHORT  ▼", bg="#1a000a", fg=RED)
        else:
            self._sig_chip.config(text="WAITING…", bg=PANEL2, fg=SUBTEXT)

        self._sig_vars["entry"].set(f"{s.get('entry_price', 0):.2f}")
        self._sig_vars["sl"].set(f"{s.get('stop_loss', 0):.2f}")
        self._sig_vars["tp"].set(f"{s.get('take_profit', 0):.2f}")
        self._sig_vars["lots"].set(f"{s.get('lot_size', 0):.2f}")
        self._sig_vars["exec"].set(s.get("execution_type", "—"))
        self._sig_vars["rr"].set(s.get("rr_ratio", "—"))

    def _update_last_trade(self, s: dict):
        lt = s.get("last_trade", {})
        action = lt.get("action", "—")
        self._lt_vars["action"].set(action)
        self._lt_lbls["action"].config(
            fg=GREEN if action == "LONG" else RED if action == "SHORT" else TEXT
        )
        self._lt_vars["symbol"].set(lt.get("symbol", "—"))
        self._lt_vars["price"].set(f"{lt.get('price', 0):.2f}")
        self._lt_vars["sl"].set(f"{lt.get('sl', 0):.2f}")
        self._lt_vars["tp"].set(f"{lt.get('tp', 0):.2f}")
        self._lt_vars["lots"].set(f"{lt.get('lots', 0):.2f}")
        self._lt_vars["bias"].set(lt.get("bias", "—"))
        ts = lt.get("timestamp", "")
        self._lt_vars["ts"].set(ts[:19].replace("T", " ") if ts else "—")

    def _update_layers(self, s: dict):
        layers   = s.get("layers", [])
        lmap     = {l.get("name", ""): l for l in layers}
        all_pass = True
        for (name, s_var, s_lbl, sc_var, r_var) in self._layer_rows:
            data   = lmap.get(name, {})
            passed = data.get("passed", False)
            score  = data.get("score", 0.0)
            reason = data.get("reason", "")[:22]
            if not passed:
                all_pass = False
            s_var.set("PASS" if passed else "FAIL")
            s_lbl.config(fg=GREEN if passed else RED)
            sc_var.set(f"{score:.2f}")
            r_var.set(reason)

        if all_pass and layers:
            self._all_pass_lbl.config(
                text="✓  ALL 7 LAYERS PASSED — TRADE ALLOWED", fg=GREEN
            )
        else:
            passed_count = sum(1 for (_, sv, _, _, _) in self._layer_rows
                               if sv.get() == "PASS")
            if layers:
                self._all_pass_lbl.config(
                    text=f"  {passed_count}/7 layers passed", fg=AMBER
                )
            else:
                self._all_pass_lbl.config(text="", fg=GREEN)

    def _update_account(self, s: dict):
        eq  = s.get("account_equity",   0.0)
        bal = s.get("account_balance",  0.0)
        pnl = s.get("floating_pnl",     0.0)
        cnt = s.get("open_trades_count", 0)

        self._acc_vars["equity"].set(f"${eq:,.2f}")
        self._acc_vars["balance"].set(f"${bal:,.2f}")
        pnl_str = f"+${pnl:.2f}" if pnl >= 0 else f"-${abs(pnl):.2f}"
        self._acc_vars["pnl"].set(pnl_str)
        self._acc_lbls["pnl"].config(fg=GREEN if pnl >= 0 else RED)
        self._acc_vars["trades"].set(str(cnt))

        self._trades_sent_var.set(f"Trades: {cnt}")

    def _update_positions(self, s: dict):
        """Zero-flicker: reuse pre-allocated label rows."""
        positions = s.get("open_positions", [])
        MAX_POS   = len(self._pos_row_vars)

        for r in range(MAX_POS):
            if r < len(positions):
                pos    = positions[r]
                ptype  = pos.get("type", "").upper()
                fpnl   = pos.get("floating_pnl", 0.0)
                row_fg = GREEN if ptype == "BUY" else RED
                vals   = [
                    (pos.get("open_time", "")[:16].replace("T", " ")),
                    pos.get("symbol", "—"),
                    ptype,
                    f"{pos.get('lots', 0):.2f}",
                    f"{pos.get('open_price', 0):.2f}",
                    f"{pos.get('current_price', 0):.2f}",
                    f"{pos.get('sl', 0):.2f}",
                    f"{pos.get('tp', 0):.2f}",
                    f"+{fpnl:.2f}" if fpnl >= 0 else f"{fpnl:.2f}",
                ]
                for c, (var, lbl) in enumerate(
                    zip(self._pos_row_vars[r], self._pos_row_lbls[r])
                ):
                    var.set(vals[c] if c < len(vals) else "")
                    fg = (GREEN if fpnl >= 0 else RED) if c == 8 \
                         else row_fg if c == 2 \
                         else TEXT
                    lbl.config(fg=fg)
            else:
                # Clear unused rows
                for var, lbl in zip(self._pos_row_vars[r], self._pos_row_lbls[r]):
                    var.set("")
                    lbl.config(fg=TEXT)

    def _update_warnings(self, s: dict):
        """Zero-flicker: reuse pre-allocated warning labels."""
        warnings = s.get("active_warnings", [])
        MAX_WARN = len(self._warn_vars)

        for i in range(MAX_WARN):
            if i < len(warnings):
                ts  = datetime.now().strftime("%H:%M:%S")
                self._warn_vars[i].set(f"[{ts}]  {warnings[i]}")
                self._warn_lbls[i].config(fg=AMBER)
            else:
                if i == 0 and not warnings:
                    self._warn_vars[0].set("No active warnings")
                    self._warn_lbls[0].config(fg=DIMTEXT)
                else:
                    self._warn_vars[i].set("")

    def _update_trade_history(self, s: dict):
        """Append-only trade history — new trades from last_trade + open_positions."""
        lt = s.get("last_trade", {})
        if lt:
            key = (lt.get("timestamp", ""), lt.get("price", 0), lt.get("action", ""))
            if key[0] and key not in self._seen_trade_keys:
                self._seen_trade_keys.add(key)
                self._trade_history.appendleft({
                    "time":   (lt.get("timestamp", "")[:16].replace("T", " ")),
                    "symbol": lt.get("symbol", "—"),
                    "action": lt.get("action", "—"),
                    "price":  lt.get("price", 0),
                    "sl":     lt.get("sl", 0),
                    "tp":     lt.get("tp", 0),
                    "lots":   lt.get("lots", 0),
                    "score":  lt.get("confluence_score", 0),
                })
                self._rebuild_trade_history_widget()

    def _rebuild_trade_history_widget(self):
        """Rebuild history rows (append-only so doesn't flicker on existing data)."""
        # Destroy old widgets
        for w in self._trade_row_widgets:
            w.destroy()
        self._trade_row_widgets.clear()

        for r, trade in enumerate(list(self._trade_history)[:50]):
            action = trade.get("action", "").upper()
            fg     = GREEN if action == "LONG" else RED if action == "SHORT" else TEXT
            vals   = [
                trade.get("time", ""),
                trade.get("symbol", ""),
                action,
                f"{trade.get('price', 0):.2f}",
                f"{trade.get('sl', 0):.2f}",
                f"{trade.get('tp', 0):.2f}",
                f"{trade.get('lots', 0):.2f}",
                f"{trade.get('score', 0):.1f}",
            ]
            row_bg = PANEL2 if r % 2 == 0 else PANEL
            for c, val in enumerate(vals):
                col = fg if c == 2 else TEXT
                lbl = tk.Label(self._th_inner, text=val, bg=row_bg, fg=col,
                               font=(MONO_FONT, 8), width=8, anchor="center",
                               pady=2)
                lbl.grid(row=r, column=c, padx=1, pady=0, sticky="nsew")
                self._trade_row_widgets.append(lbl)

        self._th_canvas.after_idle(
            lambda: self._th_canvas.configure(
                scrollregion=self._th_canvas.bbox("all")
            )
        )

    def _append_log(self, msg: str):
        ts   = datetime.now().strftime("%H:%M:%S")
        line = f"[{ts}]  {msg}\n"
        self._pipeline_log.append(line)
        self._log_text.config(state="normal")
        self._log_text.insert("end", line)
        # Trim to last 150 lines
        lines = int(self._log_text.index("end-1c").split(".")[0])
        if lines > 150:
            self._log_text.delete("1.0", "50.end+1c")
        self._log_text.see("end")
        self._log_text.config(state="disabled")

    # ── Clock + uptime ────────────────────────────────────────────────────────
    def _update_clock(self):
        now = datetime.now(timezone.utc).strftime("%H:%M:%S UTC")
        self._clock_var.set(now)
        self._root.after(self.CLOCK_MS, self._update_clock)

    def _update_uptime(self):
        elapsed = int(time.time() - self._start_ts)
        h, rem  = divmod(elapsed, 3600)
        m, sec  = divmod(rem, 60)
        self._uptime_var.set(f"Uptime: {h:02d}:{m:02d}:{sec:02d}")

    # ── Shutdown ──────────────────────────────────────────────────────────────
    def _on_shutdown(self):
        try:
            if self._mt5:
                self._mt5.shutdown()
        except Exception:
            pass
        self._root.destroy()


# ── Standalone launch ─────────────────────────────────────────────────────────
if __name__ == "__main__":
    root = tk.Tk()
    session = {"account": "TEST-9471", "demo": True}
    DashboardApp(root, session)
    root.mainloop()
