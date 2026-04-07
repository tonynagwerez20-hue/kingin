import json
import sys
import os
import binascii

try:
    import MetaTrader5 as mt5
    MT5_AVAILABLE = True
except ImportError:
    MT5_AVAILABLE = False

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CREDS_FILE = os.path.join(BASE_DIR, "credentials.json")
RUNTIME_CREDS_FILE = os.path.join(BASE_DIR, "runtime_credentials.json")

def _save_credentials(account, password, server, save_password):
    try:
        data = {"login": account, "server": server, "save_password": save_password}
        
        # Encrypt password via DPAPI if user opted to save it
        if save_password and password:
            try:
                import win32crypt
                enc_bytes = win32crypt.CryptProtectData(password.encode("utf-8"), "ITS_MT5_Creds", None, None, None, 0)
                data["encrypted_password"] = binascii.hexlify(enc_bytes).decode("ascii")
            except ImportError:
                data["encrypted_password"] = ""
            except Exception:
                data["encrypted_password"] = ""
        else:
            data["encrypted_password"] = ""
            
        with open(CREDS_FILE, "w") as f:
            json.dump(data, f, indent=2)
    except Exception:
        pass

def _write_runtime_creds(account, password, server):
    import stat
    try:
        with open(RUNTIME_CREDS_FILE, "w") as f:
            json.dump({"login": account, "password": password, "server": server}, f, indent=2)
        try:
            os.chmod(RUNTIME_CREDS_FILE, stat.S_IRUSR | stat.S_IWUSR)
        except Exception:
            pass
    except Exception:
        pass

def main():
    if len(sys.argv) < 4:
        print(json.dumps({"error": "Missing arguments. Usage: mt5_auth.py <account> <password> <server> <save_password_bool>"}))
        sys.exit(1)

    try:
        account_int = int(sys.argv[1])
    except ValueError:
        print(json.dumps({"error": "Account must be an integer"}))
        sys.exit(1)

    password = sys.argv[2]
    server = sys.argv[3]
    save_password = sys.argv[4].lower() == "true" if len(sys.argv) > 4 else False

    if not MT5_AVAILABLE:
        # Demo mode if MT5 not installed
        session = {
            "success": True,
            "demo": True,
            "account": account_int,
            "server": server,
            "balance": 10000.0,
            "equity": 10000.0
        }
        print(json.dumps(session))
        sys.exit(0)

    try:
        if not mt5.initialize():
            err = mt5.last_error()
            print(json.dumps({"error": f"Failed to initialize MT5: {err[1] if err else 'Unknown error'}"}))
            sys.exit(1)

        authorized = mt5.login(account_int, password=password, server=server)
        if authorized:
            info = mt5.account_info()
            
            _save_credentials(account_int, password, server, save_password)
            _write_runtime_creds(account_int, password, server)
            
            session = {
                "success": True,
                "demo": False,
                "account": account_int,
                "server": server,
                "balance": info.balance if info else 0.0,
                "equity": info.equity if info else 0.0
            }
            print(json.dumps(session))
            sys.exit(0)
        else:
            err = mt5.last_error()
            print(json.dumps({"error": f"Authentication failed: {err[1] if err else 'Unknown error'}"}))
            sys.exit(1)
    except Exception as exc:
        print(json.dumps({"error": f"Connection error: {exc}"}))
        sys.exit(1)

if __name__ == "__main__":
    main()
