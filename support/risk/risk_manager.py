import json
import os
from pathlib import Path
from typing import Dict, Any, Optional

class RiskManager:
    def __init__(self, state_path: str = "storage/risk_state/risk_state.json"):
        self.state_path = Path(state_path)
        self.state_path.parent.mkdir(parents=True, exist_ok=True)
        self.state = self._load_state()

    def _load_state(self) -> Dict[str, Any]:
        if self.state_path.exists():
            try:
                with open(self.state_path, "r") as f:
                    return json.load(f)
            except Exception:
                pass
        
        # Default state
        default_state = {
            "global_kill_switch": False,
            "current_regime": "STABLE",
            "last_audit_status": "PASS",
            "active_risk_vetos": []
        }
        self._save_state(default_state)
        return default_state

    def _save_state(self, state: Dict[str, Any]):
        with open(self.state_path, "w") as f:
            json.dump(state, f, indent=4)

    def check_execution_allowed(self) -> bool:
        """
        Aggregates all risk checks. Returns True if execution is allowed.
        """
        if self.state.get("global_kill_switch", False):
            print("[RiskManager] CRITICAL: Global Kill Switch is ACTIVE.")
            return False
            
        # Here we would also call sub-module checks (CRO, Regime, etc.)
        # For now, we check the state which can be updated by those modules.
        
        if self.state.get("last_audit_status") == "FAIL":
            print("[RiskManager] Execution blocked: Last audit failed.")
            return False

        return True

    def update_regime(self, regime: str):
        self.state["current_regime"] = regime
        self._save_state(self.state)

    def set_kill_switch(self, status: bool):
        self.state["global_kill_switch"] = status
        self._save_state(self.state)
