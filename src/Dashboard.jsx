// Dashboard.jsx - Main trading dashboard with 8 floating panels
// Memory efficient - uses plain React without external libraries

import { useState, useEffect, useRef } from 'react';
import BrandLogo from './BrandLogo.jsx';

// Engine state schema interface:
// timestamp, symbol, bias, current_price, signal_action, entry_price, stop_loss, take_profit,
// lot_size, execution_type, confluence_score, killzone, session_time, rr_ratio,
// layers: [{name, passed, score, reason}],
// last_trade: {action, symbol, price, sl, tp, lots, bias, execution_type, confluence_score, timestamp},
// account_equity, account_balance, floating_pnl, open_trades_count,
// positions: [{symbol, type, lots, open_price, current_price, sl, tp, floating_pnl, open_time}],
// warnings: [string],
// pipeline_log: [string]

const Dashboard = ({ sessionToken, onLogout }) => {
  const [engineState, setEngineState] = useState(null);
  const [online, setOnline] = useState(false);
  const [panels, setPanels] = useState({
    bias: { visible: true, minimized: false, x: 20, y: 20 },
    signal: { visible: true, minimized: false, x: 280, y: 20 },
    lastTrade: { visible: true, minimized: false, x: 540, y: 20 },
    layers: { visible: true, minimized: false, x: 800, y: 20 },
    account: { visible: true, minimized: false, x: 20, y: 300 },
    positions: { visible: true, minimized: false, x: 360, y: 300 },
    warnings: { visible: true, minimized: false, x: 20, y: 500 },
    pipeline: { visible: true, minimized: false, x: 380, y: 500 },
  });
  const [activePanel, setActivePanel] = useState(null);
  const [utcTime, setUtcTime] = useState(new Date());
  const [panelToggle, setPanelToggle] = useState({
    bias: true, signal: true, lastTrade: true, layers: true,
    account: true, positions: true, warnings: true, pipeline: true,
  });

  // Read engine state every 2 seconds
  useEffect(() => {
    const fetchState = async () => {
      try {
        // Use Tauri command or fallback to direct file read
        let stateJson;
        try {
          const { invoke } = window.__TAURI__;
          if (invoke) {
            stateJson = await invoke('read_engine_state');
          } else {
            // Browser fallback - direct fetch
            const response = await fetch('engine_state.json');
            stateJson = await response.text();
          }
        } catch {
          // No Tauri - try direct file
          const response = await fetch('engine_state.json', { cache: 'no-store' });
          if (response.ok) {
            stateJson = await response.text();
          } else {
            throw new Error('File not found');
          }
        }
        
        const state = JSON.parse(stateJson);
        const timestamp = state.timestamp || 0;
        const now = Math.floor(Date.now() / 1000);
        
        if (now - timestamp <= 10) {
          setOnline(true);
        } else {
          setOnline(false);
        }
        
        setEngineState(state);
      } catch (err) {
        console.error('Engine state error:', err);
        setOnline(false);
      }
    };

    fetchState();
    const interval = setInterval(fetchState, 2000);
    return () => clearInterval(interval);
  }, []);

  // UTC clock
  useEffect(() => {
    const timer = setInterval(() => setUtcTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Panel drag handling
  const handleMouseDown = (panel, e) => {
    setActivePanel(panel);
  };

  const handleMouseMove = (e) => {
    if (!activePanel) return;
    // Simplified - would need mouse event handlers
  };

  const handleMouseUp = () => {
    setActivePanel(null);
  };

  // Toggle panel minimize
  const toggleMinimize = (panel) => {
    setPanels(prev => ({
      ...prev,
      [panel]: { ...prev[panel], minimized: !prev[panel].minimized }
    }));
  };

  // Toggle panel visibility
  const togglePanel = (panel) => {
    setPanelToggle(prev => ({ ...prev, [panel]: !prev[panel] }));
  };

  // Get data from engine state
  const state = engineState || {};
  const layers = state.layers || [];
  const positions = state.positions || [];
  const warnings = state.warnings || [];
  const pipelineLog = state.pipeline_log || [];

  // Format helpers
  const fmt = (n, decimals = 2) => n ? Number(n).toFixed(decimals) : '0.00';
  const fmtTime = (ts) => ts ? new Date(ts * 1000).toLocaleTimeString() : '--:--:--';

  return (
    <div style={styles.dashboard}>
      {/* Header bar */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <BrandLogo size={28} />
          <span style={styles.headerTitle}>INSTITUTIONAL TRADING SYSTEM</span>
        </div>
        <div style={styles.headerCenter}>
          <span style={styles.symbol}>{state.symbol || 'XAU/USD'}</span>
          <span style={styles.price}>${fmt(state.current_price)}</span>
        </div>
        <div style={styles.headerRight}>
          <span style={{
            ...styles.statusBadge,
            background: online ? '#00e87a' : '#ff2d4e',
          }}>
            {online ? 'LIVE' : 'OFFLINE'}
          </span>
          <span style={styles.clock}>{utcTime.toISOString().slice(11, 19)} UTC</span>
          <button style={styles.logoutBtn} onClick={onLogout}>LOGOUT</button>
        </div>
      </header>

      {/* Engine control bar */}
      <div style={styles.controlBar}>
        <div style={styles.controlButtons}>
          <button style={{...styles.controlBtn, borderColor: '#00e87a', color: '#00e87a'}}>START</button>
          <button style={{...styles.controlBtn, borderColor: '#ff2d4e', color: '#ff2d4e'}}>STOP</button>
          <button style={{...styles.controlBtn, borderColor: '#ffaa00', color: '#ffaa00'}}>RESTART</button>
        </div>
        <div style={styles.controlInfo}>
          <span>UpTime: {fmtTime(state.timestamp)}</span>
          <span>Last Signal: {fmtTime(state.last_trade?.timestamp)}</span>
          <span>Trades: {state.open_trades_count || 0}</span>
          <span>Status: {online ? 'RUNNING' : 'STOPPED'}</span>
        </div>
      </div>

      {/* Canvas */}
      <div style={styles.canvas}>
        {/* Panel 1 - Market Bias */}
        {panelToggle.bias && (
          <div style={{...styles.panel, ...styles.panelGreen, left: panels.bias.x, top: panels.bias.y}}>
            <div style={styles.panelTitle} onMouseDown={(e) => handleMouseDown('bias', e)}>
              <span>Market Bias</span>
              <button style={styles.minBtn} onClick={() => toggleMinimize('bias')}>_</button>
            </div>
            {!panels.bias.minimized && (
              <div style={styles.panelBody}>
                <div style={{
                  ...styles.biasDirection,
                  color: state.bias === 'BULLISH' ? '#00e87a' : '#ff2d4e'
                }}>
                  {state.bias || 'NEUTRAL'}
                </div>
                <div style={styles.biasSub}>{state.killzone || 'N/A'}</div>
                <div style={styles.biasSub}>{state.session_time || 'N/A'}</div>
                <div style={styles.biasScore}>
                  Confluence {fmt(state.confluence_score)} / 7.00
                </div>
              </div>
            )}
          </div>
        )}

        {/* Panel 2 - Active Signal */}
        {panelToggle.signal && (
          <div style={{...styles.panel, ...styles.panelBlue, left: panels.signal.x, top: panels.signal.y}}>
            <div style={styles.panelTitle} onMouseDown={(e) => handleMouseDown('signal', e)}>
              <span>Active Signal</span>
              <button style={styles.minBtn} onClick={() => toggleMinimize('signal')}>_</button>
            </div>
            {!panels.signal.minimized && (
              <div style={styles.panelBody}>
                <div style={{
                  ...styles.signalAction,
                  background: state.signal_action === 'BUY' ? '#00e87a' : 
                             state.signal_action === 'SELL' ? '#ff2d4e' : '#ffaa00'
                }}>
                  {state.signal_action || 'WAITING'}
                </div>
                <div style={styles.signalRow}>Entry: ${fmt(state.entry_price)}</div>
                <div style={{...styles.signalRow, color: '#ff2d4e'}}>SL: ${fmt(state.stop_loss)}</div>
                <div style={{...styles.signalRow, color: '#00e87a'}}>TP: ${fmt(state.take_profit)}</div>
                <div style={styles.signalRow}>Lot: {fmt(state.lot_size, 3)}</div>
                <div style={styles.signalRow}>{state.execution_type || 'MARKET'}</div>
                <div style={styles.signalRow}>R:R {state.rr_ratio || '0.00'}</div>
              </div>
            )}
          </div>
        )}

        {/* Panel 3 - Last Trade */}
        {panelToggle.lastTrade && (
          <div style={{...styles.panel, ...styles.panelBlue, left: panels.lastTrade.x, top: panels.lastTrade.y}}>
            <div style={styles.panelTitle} onMouseDown={(e) => handleMouseDown('lastTrade', e)}>
              <span>Last Trade to HedgeEA</span>
              <button style={styles.minBtn} onClick={() => toggleMinimize('lastTrade')}>_</button>
            </div>
            {!panels.lastTrade.minimized && (
              <div style={styles.panelBody}>
                <div style={styles.signalRow}>{state.last_trade?.action || 'N/A'}</div>
                <div style={styles.signalRow}>{state.last_trade?.symbol || 'N/A'}</div>
                <div style={styles.signalRow}>Price: ${fmt(state.last_trade?.price)}</div>
                <div style={{...styles.signalRow, color: '#ff2d4e'}}>SL: ${fmt(state.last_trade?.sl)}</div>
                <div style={{...styles.signalRow, color: '#00e87a'}}>TP: ${fmt(state.last_trade?.tp)}</div>
                <div style={styles.signalRow}>Lots: {fmt(state.last_trade?.lots, 3)}</div>
                <div style={styles.signalRow}>Bias: {state.last_trade?.bias || 'N/A'}</div>
                <div style={styles.signalRow}>Via ZMQBridge → Pipeline</div>
              </div>
            )}
          </div>
        )}

        {/* Panel 4 - 7-Layer Confluence */}
        {panelToggle.layers && (
          <div style={{...styles.panel, ...styles.panelBlue, left: panels.layers.x, top: panels.layers.y}}>
            <div style={styles.panelTitle} onMouseDown={(e) => handleMouseDown('layers', e)}>
              <span>7-Layer Confluence Board</span>
              <button style={styles.minBtn} onClick={() => toggleMinimize('layers')}>_</button>
            </div>
            {!panels.layers.minimized && (
              <div style={styles.panelBody}>
                {layers.map((layer, i) => (
                  <div key={i} style={styles.layerRow}>
                    <span style={{
                      color: layer.passed ? '#00e87a' : '#ff2d4e'
                    }}>
                      {layer.passed ? 'PASS' : 'FAIL'}
                    </span>
                    <span style={styles.layerName}>{layer.name}</span>
                    <span style={styles.layerScore}>{fmt(layer.score)}</span>
                  </div>
                ))}
                {layers.length === 7 && layers.every(l => l.passed) && (
                  <div style={styles.allPass}>ALL PASS</div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Panel 5 - Account Overview */}
        {panelToggle.account && (
          <div style={{...styles.panel, ...styles.panelBlue, left: panels.account.x, top: panels.account.y}}>
            <div style={styles.panelTitle} onMouseDown={(e) => handleMouseDown('account', e)}>
              <span>Account Overview</span>
              <button style={styles.minBtn} onClick={() => toggleMinimize('account')}>_</button>
            </div>
            {!panels.account.minimized && (
              <div style={styles.panelBody}>
                <div style={styles.accountGrid}>
                  <div style={styles.accountItem}>
                    <div style={styles.accountLabel}>Equity</div>
                    <div style={{...styles.accountValue, color: '#00e87a'}}>
                      ${fmt(state.account_equity)}
                    </div>
                  </div>
                  <div style={styles.accountItem}>
                    <div style={styles.accountLabel}>Floating PnL</div>
                    <div style={{...styles.accountValue, 
                      color: Number(state.floating_pnl) >= 0 ? '#00e87a' : '#ff2d4e'}}>
                      ${fmt(state.floating_pnl)}
                    </div>
                  </div>
                  <div style={styles.accountItem}>
                    <div style={styles.accountLabel}>Open Trades</div>
                    <div style={{...styles.accountValue, color: '#ffaa00'}}>
                      {state.open_trades_count || 0}
                    </div>
                  </div>
                  <div style={styles.accountItem}>
                    <div style={styles.accountLabel}>Balance</div>
                    <div style={{...styles.accountValue, color: '#00c8f0'}}>
                      ${fmt(state.account_balance)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Panel 6 - Current Open Trades */}
        {panelToggle.positions && (
          <div style={{...styles.panel, ...styles.panelAmber, left: panels.positions.x, top: panels.positions.y}}>
            <div style={styles.panelTitle} onMouseDown={(e) => handleMouseDown('positions', e)}>
              <span>Current Open Trades</span>
              <button style={styles.minBtn} onClick={() => toggleMinimize('positions')}>_</button>
            </div>
            {!panels.positions.minimized && (
              <div style={styles.panelBody}>
                {positions.length === 0 ? (
                  <div style={styles.emptyState}>NO OPEN POSITIONS</div>
                ) : (
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th>Symbol</th>
                        <th>Type</th>
                        <th>Lots</th>
                        <th>Open</th>
                        <th>Current</th>
                        <th>SL</th>
                        <th>TP</th>
                        <th>PnL</th>
                        <th>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {positions.map((pos, i) => (
                        <tr key={i}>
                          <td>{pos.symbol}</td>
                          <td style={{color: pos.type === 'BUY' ? '#00e87a' : '#ff2d4e'}}>
                            {pos.type}
                          </td>
                          <td>{fmt(pos.lots, 3)}</td>
                          <td>{fmt(pos.open_price)}</td>
                          <td>{fmt(pos.current_price)}</td>
                          <td>{fmt(pos.sl)}</td>
                          <td>{fmt(pos.tp)}</td>
                          <td style={{color: Number(pos.floating_pnl) >= 0 ? '#00e87a' : '#ff2d4e'}}>
                            ${fmt(pos.floating_pnl)}
                          </td>
                          <td>{fmtTime(pos.open_time)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        )}

        {/* Panel 7 - Active Warnings */}
        {panelToggle.warnings && (
          <div style={{...styles.panel, ...styles.panelAmber, left: panels.warnings.x, top: panels.warnings.y}}>
            <div style={styles.panelTitle} onMouseDown={(e) => handleMouseDown('warnings', e)}>
              <span>Active Warnings</span>
              <button style={styles.minBtn} onClick={() => toggleMinimize('warnings')}>_</button>
            </div>
            {!panels.warnings.minimized && (
              <div style={styles.panelBody}>
                {warnings.length === 0 ? (
                  <div style={styles.emptyState}>NO ACTIVE WARNINGS</div>
                ) : (
                  warnings.map((w, i) => (
                    <div key={i} style={styles.warningItem}>
                      <span style={styles.warningText}>{w}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* Panel 8 - Pipeline Log */}
        {panelToggle.pipeline && (
          <div style={{...styles.panel, ...styles.panelBlue, left: panels.pipeline.x, top: panels.pipeline.y}}>
            <div style={styles.panelTitle} onMouseDown={(e) => handleMouseDown('pipeline', e)}>
              <span>Pipeline Log</span>
              <button style={styles.minBtn} onClick={() => toggleMinimize('pipeline')}>_</button>
            </div>
            {!panels.pipeline.minimized && (
              <div style={styles.panelBody}>
                {pipelineLog.slice(0, 20).map((entry, i) => (
                  <div key={i} style={styles.logEntry}>
                    <span style={styles.logText}>{entry}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Panel toggle bar */}
      <div style={styles.toggleBar}>
        {Object.keys(panelToggle).map(panel => (
          <button
            key={panel}
            style={{
              ...styles.toggleBtn,
              background: panelToggle[panel] ? '#00c8f0' : 'transparent',
              color: panelToggle[panel] ? '#000000' : '#445566',
            }}
            onClick={() => togglePanel(panel)}
          >
            {panel.replace(/([A-Z])/g, ' $1').trim()}
          </button>
        ))}
      </div>
    </div>
  );
};

const styles = {
  dashboard: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    background: '#000000',
    fontFamily: "'JetBrains Mono', monospace",
    color: '#e8f0f8',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 16px',
    background: '#0a0a0a',
    borderBottom: '1px solid #1a1a1a',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  headerTitle: {
    fontFamily: "'Syne', sans-serif",
    fontWeight: '800',
    fontSize: '14px',
    color: '#00c8f0',
    letterSpacing: '2px',
  },
  headerCenter: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  symbol: {
    fontFamily: "'Syne', sans-serif",
    fontWeight: '700',
    fontSize: '16px',
  },
  price: {
    fontSize: '16px',
    color: '#00e87a',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  statusBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '10px',
    fontWeight: '700',
    color: '#000000',
  },
  clock: {
    fontSize: '12px',
    color: '#445566',
  },
  logoutBtn: {
    padding: '4px 16px',
    background: 'transparent',
    border: '1px solid #ff2d4e',
    borderRadius: '12px',
    color: '#ff2d4e',
    fontSize: '10px',
    cursor: 'pointer',
  },
  controlBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 16px',
    background: '#0a0a0a',
    borderBottom: '1px solid #1a1a1a',
  },
  controlButtons: {
    display: 'flex',
    gap: '8px',
  },
  controlBtn: {
    padding: '6px 20px',
    background: 'transparent',
    borderRadius: '16px',
    fontSize: '11px',
    fontWeight: '600',
    cursor: 'pointer',
    border: '1px solid',
  },
  controlInfo: {
    display: 'flex',
    gap: '24px',
    fontSize: '11px',
    color: '#445566',
  },
  canvas: {
    flex: 1,
    position: 'relative',
    overflow: 'auto',
    width: '1400px',
    height: '1000px',
  },
  panel: {
    position: 'absolute',
    width: '240px',
    background: '#0a0a0a',
    border: '1px solid #1a1a1a',
    borderRadius: '2px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
  },
  panelGreen: { borderTop: '2px solid #00e87a' },
  panelBlue: { borderTop: '2px solid #00c8f0' },
  panelAmber: { borderTop: '2px solid #ffaa00' },
  panelTitle: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    background: '#1a1a1a',
    fontSize: '11px',
    cursor: 'move',
  },
  minBtn: {
    background: 'transparent',
    border: 'none',
    color: '#445566',
    cursor: 'pointer',
  },
  panelBody: {
    padding: '12px',
    fontSize: '12px',
  },
  biasDirection: {
    fontFamily: "'Syne', sans-serif",
    fontWeight: '800',
    fontSize: '26px',
  },
  biasSub: {
    fontSize: '11px',
    color: '#445566',
  },
  biasScore: {
    marginTop: '8px',
    color: '#00c8f0',
  },
  signalAction: {
    padding: '8px 16px',
    borderRadius: '4px',
    textAlign: 'center',
    fontWeight: '700',
    fontSize: '14px',
    color: '#000000',
  },
  signalRow: {
    padding: '4px 0',
    fontSize: '11px',
  },
  layerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '4px 0',
    fontSize: '11px',
  },
  layerName: {
    flex: 1,
    padding: '0 8px',
    color: '#00c8f0',
  },
  layerScore: {
    color: '#b8ccd8',
  },
  allPass: {
    marginTop: '8px',
    padding: '8px',
    background: '#00e87a',
    color: '#000000',
    textAlign: 'center',
    fontWeight: '700',
    borderRadius: '4px',
  },
  accountGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  },
  accountItem: {},
  accountLabel: {
    fontSize: '10px',
    color: '#445566',
    marginBottom: '4px',
  },
  accountValue: {
    fontSize: '14px',
    fontWeight: '700',
  },
  table: {
    width: '100%',
    fontSize: '10px',
    borderCollapse: 'collapse',
  },
  emptyState: {
    textAlign: 'center',
    color: '#445566',
    padding: '20px',
  },
  warningItem: {
    padding: '8px 0',
    borderBottom: '1px solid #1a1a1a',
  },
  warningText: {
    fontSize: '11px',
    color: '#ffaa00',
  },
  logEntry: {
    padding: '4px 0',
    borderBottom: '1px solid #1a1a1a',
    fontSize: '10px',
  },
  logText: {
    color: '#00c8f0',
  },
  toggleBar: {
    display: 'flex',
    gap: '8px',
    padding: '8px 16px',
    background: '#0a0a0a',
    borderTop: '1px solid #1a1a1a',
  },
  toggleBtn: {
    padding: '6px 16px',
    borderRadius: '16px',
    border: 'none',
    fontSize: '11px',
    cursor: 'pointer',
  },
};

export default Dashboard;