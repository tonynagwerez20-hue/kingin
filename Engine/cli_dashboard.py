import time
from datetime import datetime
from typing import Dict, List, Any, Optional
from rich.live import Live
from rich.layout import Layout
from rich.panel import Panel
from rich.table import Table
from rich.console import Console
from rich.text import Text
from rich.align import Align
from rich.columns import Columns
from rich.spinner import Spinner

class CLIDashboard:
    """
    HedgeEA Professional CLI Dashboard.
    Provides real-time institutional-grade visualization of the trading pipeline.
    """
    def __init__(self):
        self.console = Console()
        self.layout = Layout()
        self._setup_layout()
        self.start_time = datetime.now()
        
    def _setup_layout(self):
        """Initializes the multi-panel terminal layout."""
        self.layout.split(
            Layout(name="header", size=3),
            Layout(name="main", ratio=1),
            Layout(name="footer", size=3)
        )
        self.layout["main"].split_row(
            Layout(name="left", ratio=1),
            Layout(name="right", ratio=2)
        )
        self.layout["left"].split(
            Layout(name="account", ratio=1),
            Layout(name="market", ratio=1)
        )
        self.layout["right"].split(
            Layout(name="pipeline", ratio=1),
            Layout(name="signals", ratio=1)
        )

    def make_header(self, state: Dict = None) -> Panel:
        """Generates the system header with Master Switch status."""
        grid = Table.grid(expand=True)
        grid.add_column(justify="left", ratio=1)
        grid.add_column(justify="center", ratio=1)
        grid.add_column(justify="right", ratio=1)
        
        # Get master switch status from state
        master_on = True
        if state and "market" in state:
            master_on = state["market"].get("master_switch", True)
            
        status_text = Text("● ACTIVE", style="bold green") if master_on else Text("○ STANDBY", style="bold yellow")
        runtime = str(datetime.now() - self.start_time).split(".")[0]
        
        grid.add_row(
            Text("HedgeEA SMC v6.0", style="bold white"),
            Align.center(status_text),
            Text(f"Runtime: {runtime}", style="dim")
        )
        return Panel(grid, style="blue" if master_on else "yellow")

    def make_account_panel(self, data: Dict) -> Panel:
        """Generates the Account Metrics panel."""
        table = Table.grid(expand=True)
        table.add_column(style="cyan")
        table.add_column(justify="right", style="bold white")
        
        equity = data.get("equity", 0.0)
        balance = data.get("balance", 0.0)
        daily_pnl = data.get("daily_pnl", 0.0)
        daily_loss_pct = data.get("daily_loss_pct", 0.0)
        
        pnl_style = "green" if daily_pnl >= 0 else "red"
        
        table.add_row("Balance", f"${balance:,.2f}")
        table.add_row("Equity", f"${equity:,.2f}")
        table.add_row("Daily P&L", Text(f"${daily_pnl:+.2f}", style=pnl_style))
        table.add_row("Daily Loss %", f"{daily_loss_pct:.2f}%")
        
        return Panel(table, title="[bold]Account Metrics[/]", border_style="cyan")

    def make_market_panel(self, data: Dict) -> Panel:
        """Generates the Market Feed panel."""
        table = Table.grid(expand=True)
        table.add_column(style="magenta")
        table.add_column(justify="right", style="bold white")
        
        symbol = data.get("symbol", "XAUUSD")
        price = data.get("price", 0.0)
        spread = data.get("spread", 0.0)
        h4_bias = data.get("h4_bias", "NEUTRAL")
        h1_bias = data.get("h1_bias", "NEUTRAL")
        
        h4_style = "green" if h4_bias == "BULLISH" else "red" if h4_bias == "BEARISH" else "white"
        h1_style = "green" if h1_bias == "BULLISH" else "red" if h1_bias == "BEARISH" else "white"
        
        master_on = data.get("master_switch", True)
        switch_text = Text("ON", style="bold green") if master_on else Text("OFF", style="bold red")
        
        table.add_row("Symbol", symbol)
        table.add_row("Price", f"{price:.2f}")
        table.add_row("Spread", f"{spread:.1f}")
        table.add_row("H4 Bias", Text(h4_bias, style=h4_style))
        table.add_row("H1 Bias", Text(h1_bias, style=h1_style))
        table.add_row("Master Switch", switch_text)
        
        return Panel(table, title="[bold]Market Feed[/]", border_style="magenta")

    def make_pipeline_panel(self, layers: List[Dict]) -> Panel:
        """Generates the SMC Pipeline status panel."""
        table = Table(expand=True, box=None)
        table.add_column("Layer", style="dim")
        table.add_column("Status", justify="center")
        table.add_column("Confidence", justify="right")
        
        for layer in layers:
            status = layer.get("status", False)
            icon = "[bold green]PASS[/]" if status else "[bold red]FAIL[/]"
            score = layer.get("score", 0.0)
            table.add_row(layer.get("name", "Unknown"), icon, f"{score:.2f}")
            
        return Panel(table, title="[bold]Institutional SMC Pipeline[/]", border_style="yellow")

    def make_signals_panel(self, signals: List[Dict]) -> Panel:
        """Generates the Signal Audit panel."""
        table = Table(expand=True, box=None)
        table.add_column("Time", style="dim")
        table.add_column("Action", style="bold")
        table.add_column("Price", justify="right")
        table.add_column("SL/TP", justify="right")
        
        for sig in signals[-5:]: # Show last 5
            side = sig.get("action", "WAIT")
            style = "green" if "BUY" in side or "LONG" in side else "red" if "SELL" in side or "SHORT" in side else "white"
            
            table.add_row(
                sig.get("time", ""),
                Text(side, style=style),
                f"{sig.get('price', 0.0):.2f}",
                f"{sig.get('sl', 0.0):.2f}/{sig.get('tp', 0.0):.2f}"
            )
            
        return Panel(table, title="[bold]Signal Audit Log[/]", border_style="green")

    def make_footer(self) -> Panel:
        """Generates the footer/status bar."""
        return Panel(
            Align.center(Text("Trading Terminal | Press Ctrl+C to Shutdown Gracefully", style="dim white")),
            style="blue"
        )

    def update(self, state: Dict[str, Any]):
        """Refreshes the layout components with new state data."""
        self.layout["header"].update(self.make_header(state))
        self.layout["account"].update(self.make_account_panel(state.get("account", {})))
        self.layout["market"].update(self.make_market_panel(state.get("market", {})))
        self.layout["pipeline"].update(self.make_pipeline_panel(state.get("pipeline", [])))
        self.layout["signals"].update(self.make_signals_panel(state.get("signals", [])))
        self.layout["footer"].update(self.make_footer())

if __name__ == "__main__":
    # Test/Demo Mode
    dash = CLIDashboard()
    
    mock_state = {
        "account": {"equity": 1500.25, "balance": 1450.00, "daily_pnl": 50.25, "daily_loss_pct": 0.0},
        "market": {"symbol": "XAUUSD", "price": 2045.50, "spread": 2.5, "htf_bias": "BULLISH"},
        "pipeline": [
            {"name": "MechanicalStructure", "status": True, "score": 1.0},
            {"name": "LiquiditySweep", "status": True, "score": 1.0},
            {"name": "FVGDiscount", "status": False, "score": 0.0}
        ],
        "signals": [
            {"time": "12:00:01", "action": "LONG", "price": 2045.50, "sl": 2040.00, "tp": 2055.00}
        ]
    }
    
    with Live(dash.layout, refresh_per_second=4) as live:
        while True:
            dash.update(mock_state)
            time.sleep(1)
