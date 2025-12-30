# app/crypto_utils.py
import base64
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend

def decrypt_file_content(encrypted_bytes: bytes, key_b64: str, iv_b64: str) -> bytes:
    """
    Decrypts AES-GCM encrypted file content.
    Expects the auth tag to be the last 16 bytes of encrypted_bytes.
    """
    try:
        key = base64.b64decode(key_b64)
        iv = base64.b64decode(iv_b64)
        
        # GCM Mode typically appends the auth tag at the end of the ciphertext.
        # Ensure your frontend upload logic appends the tag.
        
        # Standard format: [Ciphertext ... | Tag (16 bytes)]
        tag = encrypted_bytes[-16:]
        ciphertext = encrypted_bytes[:-16]
        
        decryptor = Cipher(
            algorithms.AES(key),
            modes.GCM(iv, tag),
            backend=default_backend()
        ).decryptor()
        
        return decryptor.update(ciphertext) + decryptor.finalize()
    except Exception as e:
        raise ValueError(f"Decryption failed: {str(e)}")