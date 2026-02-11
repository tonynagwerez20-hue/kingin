//+------------------------------------------------------------------+
//|                                                     HedgeEA.mq5  |
//|                                    Hedge Trading System MT5 EA   |
//|                                  Direct ZMQ DLL Implementation   |
//+------------------------------------------------------------------+
#property copyright "Hedge Trading System"
#property version   "2.01"
#property strict

//+------------------------------------------------------------------+
//| Log levels enum (Must be at the very top)                        |
//+------------------------------------------------------------------+
enum ENUM_LOG_LEVEL
{
   LOG_LEVEL_DEBUG = 0,
   LOG_LEVEL_INFO = 1,
   LOG_LEVEL_WARNING = 2,
   LOG_LEVEL_ERROR = 3
};

//+------------------------------------------------------------------+
//| Signal Data Structure                                            |
//+------------------------------------------------------------------+
struct SignalData
{
   string action;      // LONG, SHORT, CLOSE_LONG, CLOSE_SHORT, REVERSE_TO_LONG, REVERSE_TO_SHORT
   string symbol;      // Trading symbol
   double price;       // Signal price
   double sl;          // Stop loss
   double lots;        // Lot size
   string bias;        // Market bias
   long timestamp;     // Signal timestamp
};

//+------------------------------------------------------------------+
//| ZeroMQ DLL Imports (Direct)                                      |
//+------------------------------------------------------------------+
#import "libzmq.dll"
   long zmq_ctx_new();
   int zmq_ctx_destroy(long context);
   long zmq_socket(long context, int type);
   int zmq_close(long socket);
   int zmq_connect(long socket, const uchar &endpoint[]);
   int zmq_bind(long socket, const uchar &endpoint[]);
   int zmq_setsockopt(long socket, int option, const uchar &value[], int size);
   int zmq_recv(long socket, uchar &buffer[], int length, int flags);
   int zmq_send(long socket, const uchar &buffer[], int length, int flags);
#import

// ZMQ Constants
#define ZMQ_SUB 2
#define ZMQ_REP 4
#define ZMQ_SUBSCRIBE 6
#define ZMQ_RCVTIMEO 27
#define ZMQ_SNDTIMEO 28
#define ZMQ_DONTWAIT 1

//+------------------------------------------------------------------+
//| Function Prototypes                                              |
//+------------------------------------------------------------------+
bool InitZMQ();
void CheckForSignals();
void CheckHeartbeat();
void ProcessSignalQueue();
int ZmqSetSockOpt(long socket, int option, int value);
int ZmqSetSockOpt(long socket, int option, const uchar &value[]);
void ProcessSignal(string jsonSignal);
bool ParseSignal(string json, SignalData &signal);
bool ValidateSignal(SignalData &signal);
bool CheckRiskLimits(SignalData &signal);
void ExecuteTrade(SignalData &signal);
void ClosePosition(SignalData &signal);
void UpdateTrailingStops();
int CountOpenPositions();
double GetDailyPnL();
void CheckDailyReset();
double NormalizeLots(double lots);
string ExtractStringValue(string json, string key);
double ExtractDoubleValue(string json, string key);
void LogDebug(string message);
void LogInfo(string message);
void LogWarning(string message);
void LogError(string message);
string GetOpenPositionsJson();
string GetHistoryDealsJson(int days);
void CheckForOfflineSignals();

//+------------------------------------------------------------------+
//| Input Parameters                                                 |
//+------------------------------------------------------------------+

// ZeroMQ Settings
input string   ZMQ_HOST = "localhost";          // ZeroMQ Server Host
input int      ZMQ_PORT = 5555;                 // ZeroMQ Server Port
input int      ZMQ_HB_PORT = 5557;              // ZeroMQ Heartbeat Port
input string   ZMQ_TOPIC = "SIGNAL";            // Signal Topic

// Risk Management
input double   MAX_LOT_SIZE = 1.0;              // Maximum Lot Size
input int      MAX_OPEN_POSITIONS = 1;          // Maximum Open Positions (1 for dynamic exits)
input double   MAX_DAILY_DRAWDOWN_PCT = 2.5;    // Max Daily Drawdown %

// Trailing Stop Loss
input bool     ENABLE_TRAILING_SL = true;       // Enable Trailing Stop Loss
input double   TRAILING_STOP_PIPS = 20.0;       // Trailing Stop Distance (pips)
input double   TRAILING_STEP_PIPS = 5.0;        // Trailing Step (pips)

// Execution Settings
input int      SLIPPAGE_POINTS = 10;            // Maximum Slippage (points)
input int      MAGIC_NUMBER = 123456;           // Magic Number
input string   TRADE_COMMENT = "HedgeEA";       // Trade Comment
input int      REVERSAL_DELAY_MS = 500;         // Delay between close and reversal (ms)

// Backtesting / Replay Mode
input bool     BACKTEST_MODE = false;           // Enable Offline Signal Loading (CSV)
input string   BACKTEST_FILE = "backtest_signals.csv"; // Signal file in MQL5/Files

// Logging
input ENUM_LOG_LEVEL LOG_LEVEL = LOG_LEVEL_INFO;  // Log Level
input bool     ENABLE_FILE_LOG = false;         // Enable File Logging

//+------------------------------------------------------------------+
//| Global Variables                                                 |
//+------------------------------------------------------------------+

long zmqContext = 0;
long zmqSubscriber = 0;
long zmqHeartbeat = 0;
bool zmqConnected = false;

// Signal Queue
string signalQueue[];
int queueHead = 0;
int queueTail = 0;
#define MAX_QUEUE_SIZE 50

double dailyStartBalance = 0.0;
datetime currentDay = 0;

// Position tracking
ulong currentPositionTicket = 0;
string currentPositionDirection = "";  // "LONG" or "SHORT"

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
{
   Print("=== HedgeEA Initialization (Direct ZMQ v2.01) ===");
   
   // Initialize daily tracking
   dailyStartBalance = AccountInfoDouble(ACCOUNT_BALANCE);
   currentDay = TimeCurrent();
   
   // Initialize ZeroMQ
   if(!InitZMQ())
   {
      Print("ERROR: Failed to initialize ZeroMQ connection");
      return(INIT_FAILED);
   }
   
   LogInfo("HedgeEA initialized successfully");
   LogInfo(StringFormat("Listening on %s:%d for topic '%s'", ZMQ_HOST, ZMQ_PORT, ZMQ_TOPIC));
   LogInfo(StringFormat("Risk Limits: MaxLots=%.2f, MaxPositions=%d, MaxDD=%.1f%%", 
           MAX_LOT_SIZE, MAX_OPEN_POSITIONS, MAX_DAILY_DRAWDOWN_PCT));
   
   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   LogInfo("HedgeEA shutting down...");
   
   // Cleanup ZeroMQ
   if(zmqConnected)
   {
      if(zmqSubscriber != 0)
         zmq_close(zmqSubscriber);
      if(zmqHeartbeat != 0)
         zmq_close(zmqHeartbeat);
      if(zmqContext != 0)
         zmq_ctx_destroy(zmqContext);
   }
   
   Print("=== HedgeEA Deinitialized ===");
}

//+------------------------------------------------------------------+
//| Expert tick function                                             |
//+------------------------------------------------------------------+
void OnTick()
{
   // Check if we need to reset daily tracking
   CheckDailyReset();
   
   // Update trailing stop loss for open positions
   if(ENABLE_TRAILING_SL)
      UpdateTrailingStops();
   
   // Check for new signals
   if(BACKTEST_MODE)
      CheckForOfflineSignals();
   else
      CheckForSignals();
   
   // Process queued signals
   ProcessSignalQueue();
   
   // Respond to heartbeats (skip in backtest)
   if(!BACKTEST_MODE)
      CheckHeartbeat();
}

//+------------------------------------------------------------------+
//| Initialize ZeroMQ Connection                                     |
//+------------------------------------------------------------------+
bool InitZMQ()
{
   // Create ZeroMQ context
   zmqContext = zmq_ctx_new();
   if(zmqContext == 0)
   {
      LogError("Failed to create ZMQ context");
      return false;
   }
   
   // Create subscriber socket
   zmqSubscriber = zmq_socket(zmqContext, ZMQ_SUB);
   if(zmqSubscriber == 0)
   {
      LogError("Failed to create ZMQ subscriber socket");
      return false;
   }
   
   // Set receive timeout to 0 (non-blocking)
   int timeout = 0;
   if(ZmqSetSockOpt(zmqSubscriber, ZMQ_RCVTIMEO, timeout) != 0)
   {
      LogError("Failed to set RCVTIMEO");
      return false;
   }
   
   // Connect to publisher
   string endpoint = StringFormat("tcp://%s:%d", ZMQ_HOST, ZMQ_PORT);
   uchar endpointBytes[];
   StringToCharArray(endpoint, endpointBytes);
   ArrayResize(endpointBytes, ArraySize(endpointBytes) - 1); // Remove null terminator
   
   if(zmq_connect(zmqSubscriber, endpointBytes) != 0)
   {
      LogError(StringFormat("Failed to connect to %s", endpoint));
      return false;
   }
   
   // Subscribe to topic
   uchar topicBytes[];
   StringToCharArray(ZMQ_TOPIC, topicBytes);
   ArrayResize(topicBytes, ArraySize(topicBytes) - 1); // Remove null terminator
   
   if(ZmqSetSockOpt(zmqSubscriber, ZMQ_SUBSCRIBE, topicBytes) != 0)
   {
      LogError(StringFormat("Failed to subscribe to topic '%s'", ZMQ_TOPIC));
      return false;
   }
   
   // Create heartbeat REP socket
   zmqHeartbeat = zmq_socket(zmqContext, ZMQ_REP);
   if(zmqHeartbeat == 0)
   {
      LogError("Failed to create heartbeat socket");
      return false;
   }
   
   ZmqSetSockOpt(zmqHeartbeat, ZMQ_RCVTIMEO, 1); // Fast non-blocking
   ZmqSetSockOpt(zmqHeartbeat, ZMQ_SNDTIMEO, 1000);
   
   string hbEndpoint = StringFormat("tcp://*:%d", ZMQ_HB_PORT);
   uchar hbBytes[];
   StringToCharArray(hbEndpoint, hbBytes);
   ArrayResize(hbBytes, ArraySize(hbBytes)-1);
   
   if(zmq_bind(zmqHeartbeat, hbBytes) != 0)
   {
      LogError(StringFormat("Failed to bind heartbeat to %s", hbEndpoint));
      return false;
   }
   
   LogInfo(StringFormat("Heartbeat server bound to %s", hbEndpoint));
   
   zmqConnected = true;
   ArrayResize(signalQueue, MAX_QUEUE_SIZE);
   return true;
}

//+------------------------------------------------------------------+
//| Check for incoming signals                                       |
//+------------------------------------------------------------------+
void CheckForSignals()
{
   if(!zmqConnected)
      return;
   
   uchar buffer[4096];
   ArrayInitialize(buffer, 0);
   
   // Non-blocking receive
   int bytesReceived = zmq_recv(zmqSubscriber, buffer, 4096, ZMQ_DONTWAIT);
   
   if(bytesReceived > 0)
   {
      string message = CharArrayToString(buffer, 0, bytesReceived);
      
      // Skip topic, extract JSON
      int spacePos = StringFind(message, " ");
      if(spacePos > 0)
      {
         string jsonData = StringSubstr(message, spacePos + 1);
         
         // Push to queue instead of processing immediately
         int nextTail = (queueTail + 1) % MAX_QUEUE_SIZE;
         if(nextTail != queueHead)
         {
            signalQueue[queueTail] = jsonData;
            queueTail = nextTail;
            LogDebug("Signal added to queue");
         }
         else
         {
            LogWarning("Signal queue full! Dropping signal.");
         }
      }
   }
}

//+------------------------------------------------------------------+
//| Respond to Heartbeat Pings and Handle REQ/REP Messages          |
//+------------------------------------------------------------------+
void CheckHeartbeat()
{
   if(!zmqConnected || zmqHeartbeat == 0) return;
   
   uchar hbBuf[4096];  // Increased buffer for JSON messages
   ArrayInitialize(hbBuf, 0);
   int rec = zmq_recv(zmqHeartbeat, hbBuf, 4096, ZMQ_DONTWAIT);
   if(rec > 0)
   {
      string msg = CharArrayToString(hbBuf, 0, rec);
      
      // Handle simple PING
      if(msg == "PING")
      {
         uchar resp[];
         StringToCharArray("PONG", resp);
         ArrayResize(resp, 4);
         zmq_send(zmqHeartbeat, resp, 4, 0);
         return;
      }
      
      // Try to parse as JSON request
      string requestType = ExtractStringValue(msg, "type");
      
      if(requestType == "SIGNAL")
      {
         // Handle signal execution request with acknowledgment
         SignalData signal;
         if(ParseSignal(msg, signal))
         {
            if(ValidateSignal(signal) && CheckRiskLimits(signal))
            {
               // Execute trade
               MqlTradeRequest request;
               MqlTradeResult result;
               ZeroMemory(request);
               ZeroMemory(result);
               
               request.action = TRADE_ACTION_DEAL;
               request.symbol = signal.symbol;
               request.volume = NormalizeLots(signal.lots);
               request.type = (signal.action == "LONG") ? ORDER_TYPE_BUY : ORDER_TYPE_SELL;
               request.price = (signal.action == "LONG") ? SymbolInfoDouble(signal.symbol, SYMBOL_ASK) : SymbolInfoDouble(signal.symbol, SYMBOL_BID);
               request.sl = signal.sl;
               request.tp = 0;
               request.deviation = SLIPPAGE_POINTS;
               request.magic = MAGIC_NUMBER;
               request.comment = TRADE_COMMENT;
               request.type_filling = ORDER_FILLING_IOC;
               
               if(OrderSend(request, result) && result.retcode == TRADE_RETCODE_DONE)
               {
                  // Success - send acknowledgment
                  string ack = StringFormat("{\"status\":\"SUCCESS\",\"ticket\":%d,\"execution_price\":%.5f,\"timestamp\":\"%s\"}",
                                          result.order, result.price, TimeToString(TimeCurrent(), TIME_DATE|TIME_SECONDS));
                  uchar ackBytes[];
                  StringToCharArray(ack, ackBytes);
                  ArrayResize(ackBytes, ArraySize(ackBytes) - 1);
                  zmq_send(zmqHeartbeat, ackBytes, ArraySize(ackBytes), 0);
                  
                  LogInfo(StringFormat("Signal executed with ack: Ticket %d", result.order));
               }
               else
               {
                  // Failure - send error
                  string ack = StringFormat("{\"status\":\"FAILED\",\"error\":\"%s\",\"retcode\":%d}",
                                          result.comment, result.retcode);
                  uchar ackBytes[];
                  StringToCharArray(ack, ackBytes);
                  ArrayResize(ackBytes, ArraySize(ackBytes) - 1);
                  zmq_send(zmqHeartbeat, ackBytes, ArraySize(ackBytes), 0);
                  
                  LogError(StringFormat("Signal execution failed: %s", result.comment));
               }
            }
            else
            {
               // Validation failed
               string ack = "{\"status\":\"FAILED\",\"error\":\"Validation or risk limit check failed\"}";
               uchar ackBytes[];
               StringToCharArray(ack, ackBytes);
               ArrayResize(ackBytes, ArraySize(ackBytes) - 1);
               zmq_send(zmqHeartbeat, ackBytes, ArraySize(ackBytes), 0);
            }
         }
         else
         {
            // Parse failed
            string ack = "{\"status\":\"FAILED\",\"error\":\"Failed to parse signal JSON\"}";
            uchar ackBytes[];
            StringToCharArray(ack, ackBytes);
            ArrayResize(ackBytes, ArraySize(ackBytes) - 1);
            zmq_send(zmqHeartbeat, ackBytes, ArraySize(ackBytes), 0);
         }
      }
      else if(requestType == "GET_BALANCE")
      {
         // Handle balance query
         double balance = AccountInfoDouble(ACCOUNT_BALANCE);
         double equity = AccountInfoDouble(ACCOUNT_EQUITY);
         double marginFree = AccountInfoDouble(ACCOUNT_MARGIN_FREE);
         
         string response = StringFormat("{\"status\":\"SUCCESS\",\"balance\":%.2f,\"equity\":%.2f,\"margin_free\":%.2f}",
                                       balance, equity, marginFree);
         uchar respBytes[];
         StringToCharArray(response, respBytes);
         ArrayResize(respBytes, ArraySize(respBytes) - 1);
         zmq_send(zmqHeartbeat, respBytes, ArraySize(respBytes), 0);
         
         LogDebug(StringFormat("Balance query: %.2f", balance));
      }
      else if(requestType == "GET_POSITIONS")
      {
         string response = GetOpenPositionsJson();
         uchar respBytes[];
         StringToCharArray(response, respBytes);
         ArrayResize(respBytes, ArraySize(respBytes) - 1);
         zmq_send(zmqHeartbeat, respBytes, ArraySize(respBytes), 0);
      }
      else if(requestType == "GET_HISTORY")
      {
         int days = (int)ExtractDoubleValue(msg, "days");
         if(days <= 0) days = 7;
         
         string response = GetHistoryDealsJson(days);
         uchar respBytes[];
         StringToCharArray(response, respBytes);
         ArrayResize(respBytes, ArraySize(respBytes) - 1);
         zmq_send(zmqHeartbeat, respBytes, ArraySize(respBytes), 0);
      }
      else
      {
         // Unknown request type
         string ack = "{\"status\":\"ERROR\",\"error\":\"Unknown request type\"}";
         uchar ackBytes[];
         StringToCharArray(ack, ackBytes);
         ArrayResize(ackBytes, ArraySize(ackBytes) - 1);
         zmq_send(zmqHeartbeat, ackBytes, ArraySize(ackBytes), 0);
      }
   }
}

//+------------------------------------------------------------------+
//| Process any signals in the queue                                 |
//+------------------------------------------------------------------+
void ProcessSignalQueue()
{
   while(queueHead != queueTail)
   {
      string jsonData = signalQueue[queueHead];
      queueHead = (queueHead + 1) % MAX_QUEUE_SIZE;
      
      LogInfo(StringFormat("Popped from queue: %s", jsonData));
      ProcessSignal(jsonData);
   }
}

//+------------------------------------------------------------------+
//| Process received signal                                          |
//+------------------------------------------------------------------+
void ProcessSignal(string jsonSignal)
{
   LogInfo(StringFormat("Processing signal: %s", jsonSignal));
   
   // Parse JSON signal
   SignalData signal;
   if(!ParseSignal(jsonSignal, signal))
   {
      LogError("Failed to parse signal JSON");
      return;
   }
   
   // Handle different signal types
   if(signal.action == "LONG" || signal.action == "SHORT")
   {
      // Entry signal - validate and execute
      if(!ValidateSignal(signal))
      {
         LogWarning("Signal validation failed");
         return;
      }
      
      if(!CheckRiskLimits(signal))
      {
         LogWarning("Signal rejected due to risk limits");
         return;
      }
      
      ExecuteTrade(signal);
   }
   else if(signal.action == "CLOSE_LONG" || signal.action == "CLOSE_SHORT")
   {
      // Exit signal - close position
      ClosePosition(signal);
   }
   else if(signal.action == "REVERSE_TO_LONG" || signal.action == "REVERSE_TO_SHORT")
   {
      // Reversal signal - close existing, then open new
      ClosePosition(signal);
      Sleep(REVERSAL_DELAY_MS);  // Brief delay
      
      // Convert reversal action to entry action
      signal.action = (signal.action == "REVERSE_TO_LONG") ? "LONG" : "SHORT";
      
      if(!ValidateSignal(signal))
      {
         LogWarning("Reversal signal validation failed");
         return;
      }
      
      ExecuteTrade(signal);
   }
   else
   {
      LogWarning(StringFormat("Unknown signal action: %s", signal.action));
   }
}


//+------------------------------------------------------------------+
//| Parse JSON signal to structure                                   |
//+------------------------------------------------------------------+
bool ParseSignal(string json, SignalData &signal)
{
   // Simple JSON parsing (in production, use a proper JSON library)
   // Expected format: {"action":"LONG","symbol":"XAUUSD","price":2045.50,"sl":2043.50,"lots":0.05}
   
   signal.action = ExtractStringValue(json, "action");
   signal.symbol = ExtractStringValue(json, "symbol");
   signal.price = ExtractDoubleValue(json, "price");
   signal.sl = ExtractDoubleValue(json, "sl");
   signal.lots = ExtractDoubleValue(json, "lots");
   signal.bias = ExtractStringValue(json, "bias");
   signal.timestamp = (long)ExtractDoubleValue(json, "timestamp");
   
   return (signal.action != "" && signal.symbol != "" && signal.price > 0);
}

//+------------------------------------------------------------------+
//| Validate signal data                                             |
//+------------------------------------------------------------------+
bool ValidateSignal(SignalData &signal)
{
   // Check action
   if(signal.action != "LONG" && signal.action != "SHORT")
   {
      LogError(StringFormat("Invalid action: %s", signal.action));
      return false;
   }
   
   // Check symbol
   if(signal.symbol != _Symbol)
   {
      LogWarning(StringFormat("Signal for different symbol: %s (current: %s)", signal.symbol, _Symbol));
      return false;
   }
   
   // Check if symbol is tradable
   if(!SymbolInfoInteger(signal.symbol, SYMBOL_TRADE_MODE))
   {
      LogError(StringFormat("Symbol %s is not tradable", signal.symbol));
      return false;
   }
   
   // Check lot size (only for entry signals)
   double minLot = SymbolInfoDouble(signal.symbol, SYMBOL_VOLUME_MIN);
   double maxLot = SymbolInfoDouble(signal.symbol, SYMBOL_VOLUME_MAX);
   
   if(signal.lots < minLot || signal.lots > maxLot)
   {
      LogError(StringFormat("Invalid lot size: %.2f (min: %.2f, max: %.2f)", signal.lots, minLot, maxLot));
      return false;
   }
   
   // Check stop loss (only for entry signals)
   if(signal.sl <= 0)
   {
      LogError("Invalid stop loss");
      return false;
   }
   
   return true;
}

//+------------------------------------------------------------------+
//| Check risk management limits                                     |
//+------------------------------------------------------------------+
bool CheckRiskLimits(SignalData &signal)
{
   // Check max lot size
   if(signal.lots > MAX_LOT_SIZE)
   {
      LogWarning(StringFormat("Lot size %.2f exceeds maximum %.2f", signal.lots, MAX_LOT_SIZE));
      return false;
   }
   
   // Check max open positions
   int openPositions = CountOpenPositions();
   if(openPositions >= MAX_OPEN_POSITIONS)
   {
      LogWarning(StringFormat("Max open positions reached: %d", openPositions));
      return false;
   }
   
   // Check daily drawdown
   double dailyPnL = GetDailyPnL();
   double maxLoss = dailyStartBalance * (MAX_DAILY_DRAWDOWN_PCT / 100.0);
   
   if(dailyPnL < -maxLoss)
   {
      LogWarning(StringFormat("Daily drawdown limit reached: %.2f (max: %.2f)", dailyPnL, -maxLoss));
      return false;
   }
   
   return true;
}

//+------------------------------------------------------------------+
//| Execute trade based on signal                                    |
//+------------------------------------------------------------------+
void ExecuteTrade(SignalData &signal)
{
   MqlTradeRequest request;
   MqlTradeResult result;
   ZeroMemory(request);
   ZeroMemory(result);
   
   // Prepare trade request
   request.action = TRADE_ACTION_DEAL;
   request.symbol = signal.symbol;
   request.volume = NormalizeLots(signal.lots);
   request.type = (signal.action == "LONG") ? ORDER_TYPE_BUY : ORDER_TYPE_SELL;
   request.price = (signal.action == "LONG") ? SymbolInfoDouble(signal.symbol, SYMBOL_ASK) : SymbolInfoDouble(signal.symbol, SYMBOL_BID);
   request.sl = signal.sl;
   request.tp = 0;  // No TP - dynamic exits only
   request.deviation = SLIPPAGE_POINTS;
   request.magic = MAGIC_NUMBER;
   request.comment = TRADE_COMMENT;
   request.type_filling = ORDER_FILLING_IOC;
   
   // Send order
   if(!OrderSend(request, result))
   {
      LogError(StringFormat("OrderSend failed: %d - %s", GetLastError(), result.comment));
      return;
   }
   
   if(result.retcode == TRADE_RETCODE_DONE)
   {
      // Track position
      currentPositionTicket = result.order;
      currentPositionDirection = signal.action;
      
      LogInfo(StringFormat("Trade executed: %s %.2f lots at %.5f, SL: %.5f, Ticket: %d",
              signal.action, request.volume, result.price, request.sl, result.order));
   }
   else
   {
      LogError(StringFormat("Trade failed: %d - %s", result.retcode, result.comment));
   }
}

//+------------------------------------------------------------------+
//| Close position based on signal                                   |
//+------------------------------------------------------------------+
void ClosePosition(SignalData &signal)
{
   bool positionClosed = false;
   
   // Find and close all positions with our magic number
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong ticket = PositionGetTicket(i);
      if(PositionSelectByTicket(ticket))
      {
         if(PositionGetInteger(POSITION_MAGIC) == MAGIC_NUMBER)
         {
            string posSymbol = PositionGetString(POSITION_SYMBOL);
            if(posSymbol != signal.symbol) continue; // Only close if symbol matches
            
            long posType = PositionGetInteger(POSITION_TYPE);
            double posVolume = PositionGetDouble(POSITION_VOLUME);
            
            // Prepare close request
            MqlTradeRequest request;
            MqlTradeResult result;
            ZeroMemory(request);
            ZeroMemory(result);
            
            request.action = TRADE_ACTION_DEAL;
            request.position = ticket;
            request.symbol = posSymbol;
            request.volume = posVolume;
            request.type = (posType == POSITION_TYPE_BUY) ? ORDER_TYPE_SELL : ORDER_TYPE_BUY;
            request.price = (posType == POSITION_TYPE_BUY) ? SymbolInfoDouble(posSymbol, SYMBOL_BID) : SymbolInfoDouble(posSymbol, SYMBOL_ASK);
            request.deviation = SLIPPAGE_POINTS;
            request.magic = MAGIC_NUMBER;
            request.comment = "Exit";
            request.type_filling = ORDER_FILLING_IOC;
            
            // Send close order
            if(OrderSend(request, result))
            {
               if(result.retcode == TRADE_RETCODE_DONE)
               {
                  LogInfo(StringFormat("Position closed: Ticket %d at %.5f", ticket, result.price));
                  positionClosed = true;
                  
                  // Clear position tracking
                  currentPositionTicket = 0;
                  currentPositionDirection = "";
               }
               else
               {
                  LogError(StringFormat("Close failed: %d - %s", result.retcode, result.comment));
               }
            }
            else
            {
               LogError(StringFormat("OrderSend (close) failed: %d", GetLastError()));
            }
         }
      }
   }
   
   if(!positionClosed)
   {
      LogWarning("No position found to close");
   }
}


//+------------------------------------------------------------------+
//| Update trailing stop loss for open positions                     |
//+------------------------------------------------------------------+
void UpdateTrailingStops()
{
   double point = SymbolInfoDouble(_Symbol, SYMBOL_POINT);
   int digits = (int)SymbolInfoInteger(_Symbol, SYMBOL_DIGITS);
   
   // Convert pips to price
   double trailingStop = TRAILING_STOP_PIPS * point * 10;  // For 5-digit brokers
   double trailingStep = TRAILING_STEP_PIPS * point * 10;
   
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong ticket = PositionGetTicket(i);
      if(!PositionSelectByTicket(ticket))
         continue;
      
      // Only manage our positions
      if(PositionGetInteger(POSITION_MAGIC) != MAGIC_NUMBER)
         continue;
      
      string symbol = PositionGetString(POSITION_SYMBOL);
      if(symbol != _Symbol)
         continue;
      
      long posType = PositionGetInteger(POSITION_TYPE);
      double currentSL = PositionGetDouble(POSITION_SL);
      double openPrice = PositionGetDouble(POSITION_PRICE_OPEN);
      double currentPrice = (posType == POSITION_TYPE_BUY) ? 
                            SymbolInfoDouble(symbol, SYMBOL_BID) : 
                            SymbolInfoDouble(symbol, SYMBOL_ASK);
      
      double newSL = 0;
      bool shouldUpdate = false;
      
      if(posType == POSITION_TYPE_BUY)
      {
         // For LONG positions: trail stop below current price
         newSL = NormalizeDouble(currentPrice - trailingStop, digits);
         
         // Only update if:
         // 1. New SL is higher than current SL (or no SL set)
         // 2. Price has moved enough (trailing step)
         if(newSL > currentSL + trailingStep || currentSL == 0)
         {
            // Don't move SL above entry (keep it profitable)
            if(newSL < openPrice)
               shouldUpdate = true;
         }
      }
      else if(posType == POSITION_TYPE_SELL)
      {
         // For SHORT positions: trail stop above current price
         newSL = NormalizeDouble(currentPrice + trailingStop, digits);
         
         // Only update if:
         // 1. New SL is lower than current SL (or no SL set)
         // 2. Price has moved enough (trailing step)
         if(newSL < currentSL - trailingStep || currentSL == 0)
         {
            // Don't move SL below entry (keep it profitable)
            if(newSL > openPrice)
               shouldUpdate = true;
         }
      }
      
      // Update stop loss
      if(shouldUpdate)
      {
         MqlTradeRequest request;
         MqlTradeResult result;
         ZeroMemory(request);
         ZeroMemory(result);
         
         request.action = TRADE_ACTION_SLTP;
         request.position = ticket;
         request.symbol = symbol;
         request.sl = newSL;
         request.tp = PositionGetDouble(POSITION_TP);  // Keep existing TP
         
         if(OrderSend(request, result))
         {
            if(result.retcode == TRADE_RETCODE_DONE)
            {
               LogDebug(StringFormat("Trailing SL updated: Ticket %d, New SL: %.5f", ticket, newSL));
            }
            else
            {
               LogDebug(StringFormat("Trailing SL update failed: %d - %s", result.retcode, result.comment));
            }
         }
      }
   }
}


//+------------------------------------------------------------------+
//| Count open positions with our magic number                       |
//+------------------------------------------------------------------+
int CountOpenPositions()
{
   int count = 0;
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong ticket = PositionGetTicket(i);
      if(PositionSelectByTicket(ticket))
      {
         if(PositionGetInteger(POSITION_MAGIC) == MAGIC_NUMBER)
            count++;
      }
   }
   return count;
}

//+------------------------------------------------------------------+
//| Calculate daily P&L                                              |
//+------------------------------------------------------------------+
double GetDailyPnL()
{
   double pnl = 0.0;
   datetime todayStart = StringToTime(TimeToString(TimeCurrent(), TIME_DATE));
   
   // Sum closed trades for today
   HistorySelect(todayStart, TimeCurrent());
   for(int i = HistoryDealsTotal() - 1; i >= 0; i--)
   {
      ulong ticket = HistoryDealGetTicket(i);
      if(ticket > 0)
      {
         if(HistoryDealGetInteger(ticket, DEAL_MAGIC) == MAGIC_NUMBER)
         {
            pnl += HistoryDealGetDouble(ticket, DEAL_PROFIT);
         }
      }
   }
   
   // Add open positions P&L
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong ticket = PositionGetTicket(i);
      if(PositionSelectByTicket(ticket))
      {
         if(PositionGetInteger(POSITION_MAGIC) == MAGIC_NUMBER)
            pnl += PositionGetDouble(POSITION_PROFIT);
      }
   }
   
   return pnl;
}

//+------------------------------------------------------------------+
//| Check and reset daily tracking                                   |
//+------------------------------------------------------------------+
void CheckDailyReset()
{
   datetime today = StringToTime(TimeToString(TimeCurrent(), TIME_DATE));
   datetime lastDay = StringToTime(TimeToString(currentDay, TIME_DATE));
   
   if(today != lastDay)
   {
      LogInfo(StringFormat("New trading day. Previous day P&L: %.2f", GetDailyPnL()));
      dailyStartBalance = AccountInfoDouble(ACCOUNT_BALANCE);
      currentDay = TimeCurrent();
   }
}

//+------------------------------------------------------------------+
//| Normalize lot size to broker requirements                        |
//+------------------------------------------------------------------+
double NormalizeLots(double lots)
{
   double minLot = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);
   double maxLot = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MAX);
   double lotStep = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_STEP);
   
   lots = MathMax(minLot, MathMin(maxLot, lots));
   lots = MathFloor(lots / lotStep) * lotStep;
   
   return lots;
}


//+------------------------------------------------------------------+
//| Helper: Extract string value from JSON                           |
//+------------------------------------------------------------------+
string ExtractStringValue(string json, string key)
{
   string searchKey = "\"" + key + "\"";
   int start = StringFind(json, searchKey);
   if(start == -1) return "";
   
   start = StringFind(json, "\"", start + StringLen(searchKey));
   if(start == -1) return "";
   start++;
   
   int end = StringFind(json, "\"", start);
   if(end == -1) return "";
   
   return StringSubstr(json, start, end - start);
}

//+------------------------------------------------------------------+
//| Helper: Extract double value from JSON                           |
//+------------------------------------------------------------------+
double ExtractDoubleValue(string json, string key)
{
   string searchKey = "\"" + key + "\":";
   int start = StringFind(json, searchKey);
   if(start == -1) return 0.0;
   
   start += StringLen(searchKey);
   
   // Skip whitespace
   while(start < StringLen(json) && (StringGetCharacter(json, start) == ' ' || StringGetCharacter(json, start) == '\t'))
      start++;
   
   // Find end of number
   int end = start;
   while(end < StringLen(json))
   {
      ushort ch = StringGetCharacter(json, end);
      if(ch != '.' && ch != '-' && ch != 'e' && ch != 'E' && ch != '+' && (ch < '0' || ch > '9'))
         break;
      end++;
   }
   
   string numStr = StringSubstr(json, start, end - start);
   return StringToDouble(numStr);
}

//+------------------------------------------------------------------+
//| Logging Functions                                                |
//+------------------------------------------------------------------+
void LogDebug(string message)
{
   if(LOG_LEVEL <= LOG_LEVEL_DEBUG)
      Print("[DEBUG] ", message);
}

void LogInfo(string message)
{
   if(LOG_LEVEL <= LOG_LEVEL_INFO)
      Print("[INFO] ", message);
}

void LogWarning(string message)
{
   if(LOG_LEVEL <= LOG_LEVEL_WARNING)
      Print("[WARNING] ", message);
}

void LogError(string message)
{
   if(LOG_LEVEL <= LOG_LEVEL_ERROR)
      Print("[ERROR] ", message);
}

//+------------------------------------------------------------------+
//| ZMQ Wrapper for integer options                                  |
//+------------------------------------------------------------------+
int ZmqSetSockOpt(long socket, int option, int value)
{
   uchar bytes[4];
   bytes[0] = (uchar)(value & 0xFF);
   bytes[1] = (uchar)((value >> 8) & 0xFF);
   bytes[2] = (uchar)((value >> 16) & 0xFF);
   bytes[3] = (uchar)((value >> 24) & 0xFF);
   return zmq_setsockopt(socket, option, bytes, 4);
}

//+------------------------------------------------------------------+
//| ZMQ Wrapper for byte array options                               |
//+------------------------------------------------------------------+
int ZmqSetSockOpt(long socket, int option, const uchar &value[])
{
   return zmq_setsockopt(socket, option, value, ArraySize(value));
}

//+------------------------------------------------------------------+
//|   Get Open Positions as JSON                                     |
//+------------------------------------------------------------------+
//+------------------------------------------------------------------+
//|   Get Open Positions as JSON (String Concatenation Version)      |
//+------------------------------------------------------------------+
string GetOpenPositionsJson()
{
      string json = "{\"status\":\"SUCCESS\",\"positions\":[";
      bool first = true;
      
      for(int i = PositionsTotal() - 1; i >= 0; i--)
      {
            ulong ticket = PositionGetTicket(i);
            if(PositionSelectByTicket(ticket))
            {
                  if(PositionGetInteger(POSITION_MAGIC) == MAGIC_NUMBER)
                  {
                        if(!first) json += ",";
                        
                        long type = PositionGetInteger(POSITION_TYPE);
                        string typeStr = (type == POSITION_TYPE_BUY) ? "LONG" : "SHORT";
                        
                        string posJson = "{" + 
                              "\"ticket\":" + (string)ticket + "," +
                              "\"symbol\":\"" + PositionGetString(POSITION_SYMBOL) + "\"," +
                              "\"type\":\"" + typeStr + "\"," +
                              "\"lots\":" + DoubleToString(PositionGetDouble(POSITION_VOLUME), 2) + "," +
                              "\"entry_price\":" + DoubleToString(PositionGetDouble(POSITION_PRICE_OPEN), 5) + "," +
                              "\"sl\":" + DoubleToString(PositionGetDouble(POSITION_SL), 5) + "," +
                              "\"profit\":" + DoubleToString(PositionGetDouble(POSITION_PROFIT), 2) + 
                        "}";
                        
                        json += posJson;
                        first = false;
                  }
            }
      }
      
      json += "]}";
      return json;
}
 
//+------------------------------------------------------------------+
//|   Get History as JSON (String Concatenation Version)             |
//+------------------------------------------------------------------+
string GetHistoryDealsJson(int days)
{
      datetime end = TimeCurrent();
      datetime start = end - (days * 24 * 3600);
      HistorySelect(start, end);
      
      string json = "{\"status\":\"SUCCESS\",\"history\":[";
      bool first = true;
      
      int total = HistoryDealsTotal();
      for(int i = total - 1; i >= 0; i--)
      {
            ulong ticket = HistoryDealGetTicket(i);
            if(HistoryDealGetInteger(ticket, DEAL_MAGIC) == MAGIC_NUMBER)
            {
                  long entry = HistoryDealGetInteger(ticket, DEAL_ENTRY);
                  if(entry == DEAL_ENTRY_OUT)
                  {
                        if(!first) json += ",";
                        
                        long type = HistoryDealGetInteger(ticket, DEAL_TYPE);
                        string typeStr = (type == DEAL_TYPE_BUY) ? "BUY" : "SELL";
                        
                        string dealJson = "{" +
                              "\"ticket\":" + (string)ticket + "," +
                              "\"symbol\":\"" + HistoryDealGetString(ticket, DEAL_SYMBOL) + "\"," +
                              "\"type\":\"" + typeStr + "\"," +
                              "\"lots\":" + DoubleToString(HistoryDealGetDouble(ticket, DEAL_VOLUME), 2) + "," +
                              "\"exit_price\":" + DoubleToString(HistoryDealGetDouble(ticket, DEAL_PRICE), 5) + "," +
                              "\"profit\":" + DoubleToString(HistoryDealGetDouble(ticket, DEAL_PROFIT), 2) + "," +
                              "\"exit_time\":\"" + TimeToString((datetime)HistoryDealGetInteger(ticket, DEAL_TIME), TIME_DATE|TIME_SECONDS) + "\"" +
                        "}";
                        
                        json += dealJson;
                        first = false;
                  }
            }
      }
      
      json += "]}";
      return json;
}

//+------------------------------------------------------------------+
//| Check for signals in a local CSV file (Backtest/Replay Mode)     |
//+------------------------------------------------------------------+
int lastProcessedLine = 0;

void CheckForOfflineSignals()
{
   int fileHandle = FileOpen(BACKTEST_FILE, FILE_READ|FILE_CSV|FILE_ANSI, ',');
   if(fileHandle == INVALID_HANDLE)
   {
      static bool warned = false;
      if(!warned) { LogWarning("Offline signal file not found: " + BACKTEST_FILE); warned = true; }
      return;
   }

   int currentLine = 0;
   while(!FileIsEnding(fileHandle))
   {
      string line = FileReadString(fileHandle);
      if(line == "") continue;
      
      currentLine++;
      
      // Skip headers and already processed lines
      if(currentLine <= 1 || currentLine <= lastProcessedLine)
      {
         // Skip remaining columns in this line
         while(!FileIsLineEnding(fileHandle)) FileReadString(fileHandle);
         continue;
      }

      // Parse columns: Time, Symbol, Action, Price, SL, Lots, Desc, MagicNumber
      string sTime = line;
      string sSymbol = FileReadString(fileHandle);
      string sAction = FileReadString(fileHandle);
      double dPrice = StringToDouble(FileReadString(fileHandle));
      double dSL = StringToDouble(FileReadString(fileHandle));
      double dLots = StringToDouble(FileReadString(fileHandle));
      string sDesc = FileReadString(fileHandle);
      long nMagic = (long)StringToInteger(FileReadString(fileHandle));

      // Quick JSON-like wrap to reuse existing ProcessSignal logic
      string pseudoJson = StringFormat("{\"action\":\"%s\",\"symbol\":\"%s\",\"price\":%.5f,\"sl\":%.5f,\"lots\":%.2f,\"desc\":\"%s\",\"magic\":%d}",
                                       sAction, sSymbol, dPrice, dSL, dLots, sDesc, nMagic);
      
      LogInfo("Offline Signal Detected: " + sAction);
      ProcessSignal(pseudoJson);
      
      lastProcessedLine = currentLine;
   }
   
   FileClose(fileHandle);
}

//+------------------------------------------------------------------+
