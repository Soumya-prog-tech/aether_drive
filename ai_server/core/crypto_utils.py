import base64
import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

def encrypt_chunk(key_b64: str, plaintext: str) -> dict:
    """
    Encrypts a single chunk using a specific File Key.
    Returns: ciphertext, nonce (IV)
    """
    # 1. Decode Key
    key_bytes = base64.b64decode(key_b64)
    aesgcm = AESGCM(key_bytes)
    
    # 2. Generate random Nonce (12 bytes is standard for GCM)
    nonce = os.urandom(12)
    
    # 3. Encrypt
    ciphertext = aesgcm.encrypt(nonce, plaintext.encode('utf-8'), None)
    
    return {
        "ciphertext": base64.b64encode(ciphertext).decode('utf-8'),
        "nonce": base64.b64encode(nonce).decode('utf-8')
    }

def decrypt_chunk(key_b64: str, ciphertext_b64: str, nonce_b64: str) -> str:
    """
    Decrypts a chunk using its specific File Key.
    """
    key_bytes = base64.b64decode(key_b64)
    aesgcm = AESGCM(key_bytes)
    
    ciphertext = base64.b64decode(ciphertext_b64)
    nonce = base64.b64decode(nonce_b64)
    
    return aesgcm.decrypt(nonce, ciphertext, None).decode('utf-8')

