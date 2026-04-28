import paramiko
import os

hostname = '104.236.59.202'
username = 'root'
key_path = os.path.expanduser('~/.ssh/id_ed25519')
passphrase = '$Sdvsf1234567$'
local_dist = r'C:\sharkbyte\Sharkbyte\dist'
remote_base = '/var/www/sharkbyte-app'

print('Connecting to server...')
key = paramiko.Ed25519Key.from_private_key_file(key_path, password=passphrase)
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(hostname, username=username, pkey=key, look_for_keys=False, allow_agent=False)
print('Connected successfully.')

sftp = client.open_sftp()

def ensure_remote_dir(sftp, remote_path):
    parts = remote_path.split('/')
    current = ''
    for part in parts:
        if not part:
            current = '/'
            continue
        current = current.rstrip('/') + '/' + part
        try:
            sftp.stat(current)
        except FileNotFoundError:
            try:
                sftp.mkdir(current)
                print(f'  Created dir: {current}')
            except Exception:
                pass

uploaded = 0
errors = 0

for root, dirs, files in os.walk(local_dist):
    for filename in files:
        local_path = os.path.join(root, filename)
        rel_path = os.path.relpath(local_path, local_dist).replace(os.sep, '/')
        remote_path = remote_base.rstrip('/') + '/' + rel_path
        remote_dir = '/'.join(remote_path.split('/')[:-1])
        ensure_remote_dir(sftp, remote_dir)
        try:
            sftp.put(local_path, remote_path)
            print(f'  Uploaded: {rel_path}')
            uploaded += 1
        except Exception as e:
            print(f'  ERROR uploading {rel_path}: {e}')
            errors += 1

print(f'\nUpload complete: {uploaded} files uploaded, {errors} errors.')

# Verification
print('\n--- Verification ---')
stdin, stdout, stderr = client.exec_command('ls /var/www/sharkbyte-app/assets/ | wc -l')
result = stdout.read().decode().strip()
print(f'1. Total files in /assets/: {result}')

stdin, stdout, stderr = client.exec_command('ls /var/www/sharkbyte-app/assets/*.js 2>/dev/null | wc -l')
result = stdout.read().decode().strip()
print(f'2. JS files in /assets/: {result}')

stdin, stdout, stderr = client.exec_command('grep -rl "enterprise_annual" /var/www/sharkbyte-app/assets/ 2>/dev/null | wc -l')
result = stdout.read().decode().strip()
print(f'3. Files containing enterprise_annual: {result}')

sftp.close()
client.close()
print('\nDone.')
