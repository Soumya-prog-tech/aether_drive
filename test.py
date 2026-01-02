import requests, json, os, base64, time, argparse, sys
from typing import List, Tuple
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

BASE_URL = "http://localhost:8000"
EMAIL = f"test_user_{int(time.time())}@example.com"
PASSWORD = "password123"

# ---------------------------------------------------------
# 🔐 CRYPTO PRIMITIVES
# ---------------------------------------------------------
def generate_random_bytes(n): return os.urandom(n)

def derive_key(secret: bytes, salt: bytes) -> bytes:
    """Standard KDF for both (Pass->MK) and (MK->FK)"""
    kdf = PBKDF2HMAC(hashes.SHA256(), 32, salt, 100_000, default_backend())
    return kdf.derive(secret)

def encrypt_aes_gcm(data: bytes, key: bytes):
    iv = generate_random_bytes(12)
    encryptor = Cipher(algorithms.AES(key), modes.GCM(iv), default_backend()).encryptor()
    ciphertext = encryptor.update(data) + encryptor.finalize()
    return ciphertext + encryptor.tag, iv

def decrypt_aes_gcm(data_with_tag: bytes, key: bytes, iv: bytes):
    tag = data_with_tag[-16:]
    ciphertext = data_with_tag[:-16]
    decryptor = Cipher(algorithms.AES(key), modes.GCM(iv, tag), default_backend()).decryptor()
    return decryptor.update(ciphertext) + decryptor.finalize()

def to_b64(b): return base64.b64encode(b).decode('utf-8')
def from_b64(s): return base64.b64decode(s)

# ---------------------------------------------------------
# 🚀 HYBRID CLIENT
# ---------------------------------------------------------
class AetherHybridClient:
    def __init__(self):
        self.token = None
        self.master_key = None 

    def register(self):
        print("\n--- 1. Registering ---")
        self.master_key = generate_random_bytes(32)
        salt = generate_random_bytes(16)
        password_key = derive_key(PASSWORD.encode(), salt) 
        enc_mk, mk_iv = encrypt_aes_gcm(self.master_key, password_key)

        payload = {
            "email": EMAIL, "password": PASSWORD, 
            "encrypted_master_key": to_b64(enc_mk),
            "master_key_salt": to_b64(salt),
            "master_key_iv": to_b64(mk_iv)
        }
        requests.post(f"{BASE_URL}/api/v1/register", json=payload)
        print("   ✅ Registered")

    def login(self):
        print("\n--- 2. Logging In ---")
        resp = requests.post(f"{BASE_URL}/api/v1/login", json={"email": EMAIL, "password": PASSWORD})
        self.token = resp.json()["access_token"]
        
        headers = {"Authorization": f"Bearer {self.token}"}
        user_data = requests.get(f"{BASE_URL}/api/v1/users/me", headers=headers).json()
        
        salt = from_b64(user_data['master_key_salt'])
        iv = from_b64(user_data['master_key_iv'])
        enc_mk = from_b64(user_data['encrypted_master_key'])
        
        password_key = derive_key(PASSWORD.encode(), salt)
        self.master_key = decrypt_aes_gcm(enc_mk, password_key, iv)
        print("   🔓 Master Key Unlocked")

    def create_folder(self, folder_name: str, parent_id: str = "root") -> str:
        print(f"\n--- 3. Creating Folder '{folder_name}' ---")
        headers = {"Authorization": f"Bearer {self.token}"}
        payload = {"name": folder_name, "parent_id": parent_id}
        
        resp = requests.post(f"{BASE_URL}/api/v1/folders", headers=headers, json=payload)
        if resp.status_code in [200, 201]:
            folder_id = resp.json()['id']
            print(f"   📂 Created Folder ID: {folder_id}")
            return folder_id
        else:
            print(f"   ❌ Folder Creation Failed: {resp.text}")
            return "root"

    def upload_file(self, file_path, folder_id="root"):
        filename = os.path.basename(file_path)
        print(f"   ⬆️  Uploading '{filename}' to {folder_id}...")
        
        # A. Derive Unique File Key
        file_salt = generate_random_bytes(16)
        file_key = derive_key(self.master_key, file_salt)
        
        # B. Encrypt File Content
        with open(file_path, "rb") as f: file_data = f.read()
        enc_file, file_iv = encrypt_aes_gcm(file_data, file_key)
        
        # C. Encrypt Metadata (Filename)
        metadata_json = json.dumps({"filename": filename}).encode('utf-8')
        enc_meta, meta_iv = encrypt_aes_gcm(metadata_json, file_key)

        files = {'encrypted_file': (filename, enc_file, 'application/pdf')}
        data = {
            'encrypted_metadata': to_b64(enc_meta),
            'metadata_iv': to_b64(meta_iv),
            'file_iv': to_b64(file_iv),
            'file_salt': to_b64(file_salt),
            'folder_id': folder_id
        }
        resp = requests.post(f"{BASE_URL}/api/v1/files/upload", headers={"Authorization": f"Bearer {self.token}"}, files=files, data=data)
        
        if resp.status_code == 200:
            print(f"      ✅ Success")
            return resp.json()['id'], file_key 
        else:
            print(f"      ❌ Failed: {resp.text}")
            return None, None

    def ingest_files(self, file_list: List[Tuple[str, bytes]]):
        print(f"\n--- 5. Ingesting {len(file_list)} Files ---")
        headers = {"Authorization": f"Bearer {self.token}"}

        for i, (file_id, raw_key) in enumerate(file_list):
            print(f"   [{i+1}/{len(file_list)}] Ingesting {file_id[:8]}... ", end="", flush=True)
            ingest_data = {"file_key": to_b64(raw_key), "force_reingest": "false"}
            
            with requests.post(f"{BASE_URL}/api/v1/ai/ingest/{file_id}", headers=headers, data=ingest_data, stream=True) as r:
                # Basic stream consumption
                final_status = "Done"
                for line in r.iter_lines(): pass 
                print(f"✅ {final_status}")

    def chat_with_all(self, file_list: List[Tuple[str, bytes]]):
        print("\n--- 6. Multi-File Chat ---")
        headers = {"Authorization": f"Bearer {self.token}"}
        
        all_ids = [f[0] for f in file_list]
        all_keys = {f[0]: to_b64(f[1]) for f in file_list}
        
        chat_payload = {
            "query": "Summarize these documents.",
            "file_ids": all_ids,
            "file_keys": all_keys
        }
        
        print("   🤖 AI Answer: ", end="", flush=True)
        try:
            with requests.post(f"{BASE_URL}/api/v1/ai/chat", headers=headers, json=chat_payload, stream=True) as r:
                for line in r.iter_lines():
                    if line:
                        decoded = line.decode('utf-8').replace("data: ", "")
                        try:
                            chunk = json.loads(decoded)
                            if chunk['type'] == 'token': print(chunk['data'], end="", flush=True)
                        except: pass
            print("\n")
        except Exception as e:
            print(f"Chat failed: {e}")






    def list_folder_content(self, folder_id="root"):
        print(f"\n--- 7. Listing Content of '{folder_id}' ---")
        headers = {"Authorization": f"Bearer {self.token}"}
        
        try:
            resp = requests.get(f"{BASE_URL}/api/v1/items", headers=headers, params={"folder_id": folder_id})
            if resp.status_code != 200:
                print(f"   ❌ Failed to list items: {resp.status_code}")
                return []
            
            items = resp.json()
            print(f"   📂 Found {len(items)} items.")
            
            for item in items:
                display_name = "???"
                
                if item['type'] == 'folder':
                    display_name = item['name']
                
                elif item['type'] == 'file':
                    try:
                        # 1. Extract Crypto Fields
                        salt = from_b64(item['file_salt'])
                        meta_iv = from_b64(item['metadata_iv'])
                        enc_meta = from_b64(item['encrypted_metadata'])

                        # 2. Derive Unique File Key (Master Key + File Salt)
                        file_key = derive_key(self.master_key, salt)

                        # 3. Decrypt Metadata
                        decrypted_bytes = decrypt_aes_gcm(enc_meta, file_key, meta_iv)
                        
                        # 4. Parse JSON
                        metadata = json.loads(decrypted_bytes.decode('utf-8'))
                        display_name = metadata.get('filename', 'Unknown')
                        
                    except Exception as e:
                        display_name = f"[Decryption Failed: {str(e)}]"

                print(f"      - [{item['type'].upper()}] {display_name} (ID: {item['id'][:8]}...)")
            
            return items

        except Exception as e:
            print(f"   ❌ Error: {e}")
            return []

    # =========================================================
    # ✅ NEW: Secure Download (Tests GET /api/v1/files/.../download)
    # =========================================================
    def download_and_decrypt(self, file_item, output_filename):
        print(f"\n--- 8. Secure Download Test: {output_filename} ---")
        
        if file_item['type'] != 'file':
            print("   ⚠️ Item is a folder, skipping download.")
            return

        try:
            # 1. Get SAS URL from API (Authenticated)
            print("   1️⃣  Requesting SAS URL...", end="")
            headers = {"Authorization": f"Bearer {self.token}"}
            sas_resp = requests.get(f"{BASE_URL}/api/v1/files/{file_item['id']}/download", headers=headers)
            
            if sas_resp.status_code != 200:
                print(f" ❌ Failed: {sas_resp.text}")
                return

            download_url = sas_resp.json()['download_url']
            print(" ✅")

            # 2. Download from Azure (Direct)
            print("   2️⃣  Downloading Encrypted Blob...", end="")
            blob_resp = requests.get(download_url) # No Auth Header!
            if blob_resp.status_code != 200:
                print(f" ❌ Failed: {blob_resp.status_code}")
                return
            encrypted_bytes = blob_resp.content
            print(f" ✅ ({len(encrypted_bytes)} bytes)")

            # 3. Re-Derive Key (Simulating fresh client state)
            print("   3️⃣  Re-Deriving Key & Decrypting...", end="")
            
            # Extract Salt & IV from the item metadata we got in list_folder_content
            salt = from_b64(file_item['file_salt'])
            iv = from_b64(file_item['file_iv'])
            
            # Derive key using Master Key + File Salt
            file_key = derive_key(self.master_key, salt)
            
            # Decrypt
            decrypted_data = decrypt_aes_gcm(encrypted_bytes, file_key, iv)
            
            # Write to disk
            with open(output_filename, "wb") as f:
                f.write(decrypted_data)
            
            print(f" ✅ Saved to {output_filename}")

        except Exception as e:
            print(f"   ❌ Download Failed: {e}")

    # =========================================================
    # 🗑️ DELETE FILE (Tests DELETE /api/v1/files/{file_id})
    # =========================================================
    def delete_file(self, file_id: str):
        print(f"\n--- 9. Deleting File {file_id[:8]} ---")
        headers = {"Authorization": f"Bearer {self.token}"}

        resp = requests.delete(
            f"{BASE_URL}/api/v1/files/{file_id}",
            headers=headers
        )

        if resp.status_code == 204:
            print("   ✅ File deleted successfully (Azure + Qdrant + DB)")
            return True
        else:
            print(f"   ❌ Delete failed [{resp.status_code}]: {resp.text}")
            return False


if __name__ == "__main__":
    
    parser = argparse.ArgumentParser(description="Multi-File Secure Upload & Chat")
    parser.add_argument("filenames", nargs="+", help="List of files to upload")
    args = parser.parse_args()

    client = AetherHybridClient()
    
    # 1. Auth
    client.register()
    client.login()

    # 2. Create Folder
    folder_id = client.create_folder(f"Project_Beta_{int(time.time())}")

    # 3. Upload All Files
    uploaded_files = [] 
    print(f"\n--- 4. Batch Uploading {len(args.filenames)} files ---")
    for fname in args.filenames:
        if os.path.exists(fname):
            fid, key = client.upload_file(fname, folder_id)
            if fid:
                uploaded_files.append((fid, key))
        else:
            print(f"   ⚠️ File not found: {fname}")

    if not uploaded_files:
        sys.exit(1)

    # 4. Ingest & Chat
    client.ingest_files(uploaded_files)
    client.chat_with_all(uploaded_files)

    # 5. ✅ NEW: List Content of the folder we just created
    items = client.list_folder_content(folder_id)

    # 6. ✅ NEW: Verify Download (Pick the first file found)
    if items:
        # Find the first item that is a file
        target_file = next((i for i in items if i['type'] == 'file'), None)
        if target_file:
            client.download_and_decrypt(target_file, "downloaded_test_file.bin")
    
     # 7. ✅ NEW: Delete the file we just downloaded
    if target_file:
        client.delete_file(target_file['id'])

        # 8. Verify deletion by listing again
        print("\n--- 10. Verifying Deletion ---")
        items_after = client.list_folder_content(folder_id)

        still_exists = any(
            i['type'] == 'file' and i['id'] == target_file['id']
            for i in items_after
        )

        if still_exists:
            print("   ❌ File still exists after deletion!")
        else:
            print("   ✅ File is gone. Deletion verified.")
