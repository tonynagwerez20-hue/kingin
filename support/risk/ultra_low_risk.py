import logging
from typing import Dict
from Engine.base_interfaces import BaseRiskRule

logger = logging.getLogger("UltraLowAccountRisk")

class UltraLowAccountRiskRule(BaseRiskRule):
    """
    Risk rule specifically designed for accounts between $10 and $15.
    Focuses on extreme capital preservation and margin management.
    """
    
    def __init__(self, config: Dict):
        super().__init__(config)
        self.min_equity = config.get("min_equity_threshold", 7.50)
        self.base_daily_loss_pct = config.get("max_daily_loss_pct", 5.0)
        self.base_max_positions = config.get("max_concurrent_positions", 1)
        self.fixed_lot_size = config.get("enforced_lot_size", 0.01)
        self.seed_balance = config.get("seed_balance", 10.0) # Starting point for scaling
        self.profit_step = config.get("profit_step_for_scaling", 5.0) # Scale every $5

    def check_risk(self, trade_request: Dict) -> Dict:
        """
        Evaluates the trade request against dynamic small-account constraints.
        """
        current_equity = trade_request.get("current_equity", 0.0)
        daily_loss = trade_request.get("daily_loss", 0.0)
        daily_start_balance = trade_request.get("daily_start_balance", current_equity)
        
        # --- DYNAMIC RISK TIGHTENING ---
        # If we are in account-level drawdown (equity < seed), tighten risk
        current_daily_loss_limit = self.base_daily_loss_pct
        if current_equity < self.seed_balance:
            current_daily_loss_limit = self.base_daily_loss_pct / 2.0
            logger.info(f"Risk Tightening Active: Daily limit reduced to {current_daily_loss_limit}%")

        # --- DYNAMIC EXPOSURE SCALING ---
        # Scale positions based on profit: 1 pos for $10, 2 for $15, 3 for $20, etc.
        profit = max(0, current_equity - self.seed_balance)
        scaling_bonus = int(profit / self.profit_step)
        dynamic_max_positions = self.base_max_positions + scaling_bonus
        
        # 1. Equity Protection Check
        if current_equity < self.min_equity:
            logger.warning(f"Trade Denied: Equity (${current_equity:.2f}) is below safety floor (${self.min_equity:.2f})")
            return {
                "allowed": False,
                "reason": f"Equity safety floor reached: ${current_equity:.2f} < ${self.min_equity:.2f}",
                "dynamic_limit": current_daily_loss_limit,
                "dynamic_max_positions": dynamic_max_positions
            }

        # 2. Daily Loss Percentage Check
        loss_pct = (daily_loss / daily_start_balance) * 100 if daily_start_balance > 0 else 0
        if loss_pct >= current_daily_loss_limit:
            logger.warning(f"Trade Denied: Daily loss limit reached ({loss_pct:.2f}% >= {current_daily_loss_limit}%)")
            return {
                "allowed": False,
                "reason": f"Daily % loss limit reached: {loss_pct:.2f}% (Dynamic Limit: {current_daily_loss_limit}%)",
                "dynamic_limit": current_daily_loss_limit,
                "dynamic_max_positions": dynamic_max_positions
            }

        # 3. Dynamic Position Gating
        open_positions = trade_request.get("open_positions_count", 0)
        if open_positions >= dynamic_max_positions:
            logger.warning(f"Trade Denied: Max positions reached ({open_positions} >= {dynamic_max_positions})")
            return {
                "allowed": False,
                "reason": f"Exposure Limit: {dynamic_max_positions} positions allowed @ ${current_equity:.2f} equity.",
                "dynamic_limit": current_daily_loss_limit,
                "dynamic_max_positions": dynamic_max_positions
            }

        # 4. Mandatory Micro-Lot Enforcement
        trade_request["lots"] = self.fixed_lot_size

        return {
            "allowed": True,
            "reason": f"Safety checks passed. Scale: {dynamic_max_positions} positions allowed.",
            "enforced_lots": self.fixed_lot_size,
            "dynamic_limit": current_daily_loss_limit,
            "dynamic_max_positions": dynamic_max_positions
        }

        return {
            "allowed": True,
            "reason": "Account safety checks passed.",
            "enforced_lots": self.fixed_lot_size
        }
