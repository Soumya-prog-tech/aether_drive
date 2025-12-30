import uuid
from typing import Optional, List
import sqlalchemy
from sqlmodel import Field, SQLModel, Relationship


# --- User Model ---
class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True)
    hashed_password: str
    is_active: bool = Field(default=True)

    encrypted_master_key: str
    master_key_salt: str
    master_key_iv: str
    
    files: List["File"] = Relationship(back_populates="owner")
    folders: List["Folder"] = Relationship(back_populates="owner")

# --- Folder Model ---
class Folder(SQLModel, table=True):
    id: str = Field(default_factory=lambda: f"folder_{uuid.uuid4()}", primary_key=True)
    name: str
    
    owner_id: int = Field(foreign_key="user.id")
    owner: User = Relationship(back_populates="folders")
    
    parent_id: Optional[str] = Field(default=None, foreign_key="folder.id")
    parent: Optional["Folder"] = Relationship(
        back_populates="subfolders",
        sa_relationship_kwargs={'remote_side': 'Folder.id'}
    )
    subfolders: List["Folder"] = Relationship(back_populates="parent")
    
    files: List["File"] = Relationship(back_populates="folder")

# --- File Model ---

class File(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), unique=True, index=True, primary_key=True)
    stored_filename: str = Field(unique=True, index=True)
    encrypted_metadata: str
    metadata_iv: str
    file_iv: str

    owner_id: int = Field(foreign_key="user.id")
    owner: "User" = Relationship(back_populates="files")

    file_salt: str

    folder_id: Optional[str] = Field(default=None, foreign_key="folder.id")  # ← make it optional
    folder: Optional["Folder"] = Relationship(back_populates="files")
