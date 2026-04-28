import paramiko
import os
import sys

# Connection settings
HOSTNAME = "104.236.59.202"
USERNAME = "root"
KEY_PATH = os.path.expanduser("~/.ssh/id_ed25519")
PASSPHRASE = "$Sdvsf1234567$"
LOCAL_DIR = "C:/sharkbyte/Sharkbyte/dist"
REMOTE_DIR = "/var/www/sharkbyte-app"

print("=" * 60)
print("SFTP UPLOAD - SharkByte Frontend Build")
print("=" * 60)
print(f"Local:  {LOCAL_DIR}")
print(f"Remote: {HOSTNAME}:{REMOTE_DIR}")
print()

# Load private key
print("[1/4] Loading SSH private key...")
try:
    pkey = paramiko.Ed25519Key.from_private_key_file(KEY_PATH, password=PASSPHRASE)
    print("      Key loaded OK")
except Exception as e:
    print(f"      ERROR loading key: {e}")
    sys.exit(1)

# Connect
print("[2/4] Connecting to server...")
try:
    transport = paramiko.Transport((HOSTNAME, 22))
    transport.connect(username=USERNAME, pkey=pkey)
    sftp = paramiko.SFTPClient.from_transport(transport)
    print("      Connected OK")
except Exception as e:
    print(f"      ERROR connecting: {e}")
    sys.exit(1)

# Helper: ensure remote dir exists
def sftp_mkdir_p(sftp_client, remote_path):
    parts = remote_path.replace("\\", "/").split("/")
    current = ""
    for part in parts:
        if not part:
            current = "/"
            continue
        current = current.rstrip("/") + "/" + part
        try:
            sftp_client.stat(current)
        except FileNotFoundError:
            sftp_client.mkdir(current)

# Upload recursively
print("[3/4] Uploading files...")
uploaded = 0
errors = 0

for root, dirs, files in os.walk(LOCAL_DIR):
    # Calculate remote path
    rel_path = os.path.relpath(root, LOCAL_DIR).replace("\\", "/")
    if rel_path == ".":
        remote_root = REMOTE_DIR
    else:
        remote_root = REMOTE_DIR.rstrip("/") + "/" + rel_path

    # Ensure remote directory exists
    try:
        sftp_mkdir_p(sftp, remote_root)
    except Exception as e:
        print(f"      WARNING: Could not create dir {remote_root}: {e}")

    for filename in files:
        local_file = os.path.join(root, filename)
        remote_file = remote_root.rstrip("/") + "/" + filename
        try:
            sftp.put(local_file, remote_file)
            uploaded += 1
            print(f"      [{uploaded}] Uploaded: {rel_path}/{filename}" if rel_path != "." else f"      [{uploaded}] Uploaded: {filename}")
        except Exception as e:
            print(f"      ERROR uploading {filename}: {e}")
            errors += 1

print(f"\n      Upload complete: {uploaded} files uploaded, {errors} errors")

# Run verification commands
print()
print("[4/4] Running verification commands...")
print()

def run_cmd(label, cmd):
    print(f"--- {label} ---")
    chan = transport.open_session()
    chan.exec_command(cmd)
    stdout = chan.makefile("r").read()
    stderr = chan.makefile_stderr("r").read()
    output = (stdout + stderr).strip()
    print(output if output else "(no output)")
    print()

run_cmd(
    "ls -la /var/www/sharkbyte-app/assets/ | head -10",
    "ls -la /var/www/sharkbyte-app/assets/ | head -10"
)

run_cmd(
    'grep -c "enterprise_annual" in assets/*.js',
    'grep -c "enterprise_annual" /var/www/sharkbyte-app/assets/*.js 2>/dev/null || echo "CLEAN - no enterprise_annual found"'
)

run_cmd(
    "pm2 logs sharkbyte-api (errors/warnings/mercadopago)",
    'pm2 logs sharkbyte-api --nostream --lines 10 2>&1 | grep -iE "error|warn|mercadopago" | head -10'
)

sftp.close()
transport.close()
print("=" * 60)
print("DONE")
print("=" * 60)
