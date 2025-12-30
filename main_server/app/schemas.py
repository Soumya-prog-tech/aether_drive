from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict
from sqlmodel import SQLModel

# --- User Schemas ---
class UserBase(SQLModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str
    encrypted_master_key: str
    master_key_salt: str
    master_key_iv: str

class UserLogin(UserBase):
    password: str

class UserPublic(UserBase):
    id: int
    is_active: bool
    encrypted_master_key: str
    master_key_salt: str
    master_key_iv: str

# --- Token Schemas ---
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

# --- Folder Schemas ---
class FolderBase(SQLModel):
    name: str
    parent_id: Optional[str] = "root"

class FolderCreate(FolderBase):
    pass

class FolderPublic(FolderBase):
    id: str
    owner_id: int
    type: str = "folder" 

# --- File Schemas ---
class FileBase(SQLModel):
    encrypted_metadata: str
    metadata_iv: str
    file_iv: str
    file_salt: str
    folder_id: Optional[str] = "root" 

class FilePublic(FileBase):
    id: str
    owner_id: int
    type: str = "file"
    folder_id: Optional[str] = "root" 

class FileCreate(FileBase):
    stored_filename: str

class FileDownloadInfo(BaseModel):
    download_url: str
    encrypted_metadata: str
    metadata_iv: str
    file_iv: str

# --- Chat Schemas (RENAMED from ChatRequest) ---
class ChatQuery(BaseModel):  # <--- Renamed to match main.py
    query: str
    file_ids: List[str]
    file_keys: Dict[str, str]

class ChatResponse(BaseModel):
    answer: str
    sources: List[str]