# main.py
import os
import json
import grpc
import base64
import time
from contextlib import asynccontextmanager
from typing import List

from fastapi import FastAPI, Depends, HTTPException, status, Request, Response, UploadFile, File, Form, Query
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from dotenv import load_dotenv

# App Config & Database
from app.config import settings
from app import crud, models, schemas, security, azure_handler, crypto_utils
from app.database import engine, get_db

# gRPC Imports
import cortex_pb2
import cortex_pb2_grpc

# =====================================================
# 🔹 Load Environment Variables & Config
# =====================================================
load_dotenv()

CORTEX_AI_HOST = os.getenv("CORTEX_AI_HOST", "cortex_ai:50051")
MAX_MESSAGE_LENGTH = 100 * 1024 * 1024 # 100MB Limit

# =====================================================
# 🔹 Global gRPC Stub
# =====================================================
grpc_stub = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global grpc_stub
    print("🚀 Starting Main Server...")
    await azure_handler.initialize_container()
    models.SQLModel.metadata.create_all(engine)
    
    print(f"🔗 Connecting to Cortex AI at {CORTEX_AI_HOST}...")
    options = [
        ('grpc.max_send_message_length', MAX_MESSAGE_LENGTH),
        ('grpc.max_receive_message_length', MAX_MESSAGE_LENGTH),
    ]
    channel = grpc.insecure_channel(CORTEX_AI_HOST, options=options)
    grpc_stub = cortex_pb2_grpc.AIServiceStub(channel)
    print("✅ gRPC Bridge Established.")
    yield
    print("🛑 Shutting down...")
    channel.close()

# =====================================================
# 🔹 FastAPI App Config
# =====================================================
app = FastAPI(
    title="AetherDrive Core API",
    description="Secure File Storage & AI Orchestration Layer",
    version="5.0.0",
    lifespan=lifespan
)

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =====================================================
# 🔹 Authentication Routes
# =====================================================
@app.post("/api/v1/register", response_model=schemas.UserPublic, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
def register_user(request: Request, user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    return crud.create_user(db=db, user=user)

@app.post("/api/v1/login", response_model=schemas.Token)
@limiter.limit("10/minute")
def login_for_access_token(response: Response, request: Request, form_data: schemas.UserLogin, db: Session = Depends(get_db)):
    user = security.authenticate_user(db, email=form_data.email, password=form_data.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
    
    access_token = security.create_access_token(data={"sub": user.email})
    refresh_token = security.create_refresh_token(data={"sub": user.email})

    response.set_cookie(
        key="refresh_token", value=refresh_token, httponly=True, samesite="strict", secure=True,
        max_age=security.settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/v1/users/me", response_model=schemas.UserPublic)
def read_users_me(current_user: models.User = Depends(security.get_current_active_user)):
    return current_user

#=====================================================
# 🔹 File Management (Azure)
# =====================================================
@app.post("/api/v1/files/upload", response_model=schemas.FilePublic)
async def upload_encrypted_file(
    encrypted_file: UploadFile = File(...),
    encrypted_metadata: str = Form(...),
    metadata_iv: str = Form(...),
    file_iv: str = Form(...),
    file_salt: str = Form(...), 
    folder_id : str = Form("root"), # <--- Receives "root" string
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_active_user)
):
    try:
        # ✅ FIX: Convert "root" string to None (NULL) for database storage
        sanitized_folder_id = None if folder_id == "root" else folder_id

        stored_filename = await azure_handler.upload_file_to_azure(encrypted_file)
        
        file_create_schema = schemas.FileCreate(
            stored_filename=stored_filename,
            encrypted_metadata=encrypted_metadata,
            metadata_iv=metadata_iv,
            file_iv=file_iv,
            file_salt=file_salt,  
            folder_id=sanitized_folder_id # ✅ Use the sanitized version
        )
        return crud.create_file_record(db=db, file=file_create_schema, user_id=current_user.id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")
    
@app.post("/api/v1/folders", response_model=schemas.FolderPublic, status_code=status.HTTP_201_CREATED)
def create_new_folder(
    folder: schemas.FolderCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_active_user)
):
    try:
        return crud.create_folder(db=db, folder=folder, user_id=current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create folder: {str(e)}")
 
@app.get("/api/v1/files", response_model=List[schemas.FilePublic])
def list_user_files(db: Session = Depends(get_db), current_user: models.User = Depends(security.get_current_active_user)):
    return crud.get_files_by_user(db=db, user_id=current_user.id)

@app.get("/api/v1/items")
async def get_folder_items(
    folder_id: str = Query("root"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_active_user)
):
    # 1. Fetch the dictionary result from CRUD
    results = crud.get_items_by_folder(db=db, user_id=current_user.id, folder_id=folder_id)
    
    response = []

    # 2. Process Folders
    for folder in results["folders"]:
        response.append({
            "id": folder.id, 
            "name": folder.name, 
            "type": "folder", 
            "parent_id": folder.parent_id or "root"
        })

    # 3. Process Files
    for file in results["files"]:
        response.append({
            "id": file.id, 
            "type": "file", 
            "encrypted_metadata": file.encrypted_metadata, 
            "metadata_iv": file.metadata_iv, 
            "file_iv": file.file_iv,
            # ✅ Send the salt so frontend can derive the key
            "file_salt": file.file_salt,
            "folder_id": file.folder_id or "root"
        })

    return response

@app.get("/api/v1/files/{file_id}/download")
async def get_file_download_link(
    file_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_active_user)
):
    """
    Returns a secure, temporary SAS URL for the frontend to download the file directly from Azure.
    """
    # 1. Verify file existence and ownership
    file_record = crud.get_file_by_id(db=db, file_id=file_id, user_id=current_user.id)
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found")

    try:
        # 2. Use your existing helper from azure_handler.py
        download_url = await azure_handler.get_file_download_url(file_record.stored_filename)
        
        return {"download_url": download_url}

    except Exception as e:
        print(f"Error generating download URL: {e}")
        raise HTTPException(status_code=500, detail="Could not generate download link")

# =====================================================
# 🔹 AI Integration Routes (Bridge to Cortex AI)
# =====================================================

def ingest_stream_generator(request: cortex_pb2.IngestRequest):
    """
    Yields SSE formatted data from the gRPC stream.
    """
    try:
        response_stream = grpc_stub.IngestFile(request, timeout=300)
        for status_update in response_stream:
            data = {
                "status": status_update.status,
                "message": status_update.message,
                "chunks_count": getattr(status_update, "chunks_count", 0),
                "success": getattr(status_update, "success", False)
            }
            yield f"data: {json.dumps(data)}\n\n"
            
    except grpc.RpcError as e:
        error_data = {"status": "FAILED", "message": f"AI Server Error: {e.details()}"}
        yield f"data: {json.dumps(error_data)}\n\n"
    except Exception as e:
        error_data = {"status": "FAILED", "message": f"Internal Error: {str(e)}"}
        yield f"data: {json.dumps(error_data)}\n\n"


@app.delete("/api/v1/files/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_file(
    file_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_active_user)
):
    # 1. Verify ownership
    db_file = crud.get_file_by_id(db=db, file_id=file_id, user_id=current_user.id)
    if not db_file:
        raise HTTPException(status_code=404, detail="File not found")

    try:
        # 2. Delete from Cortex AI (Qdrant)
        grpc_req = cortex_pb2.DeleteFileRequest(
            file_id=file_id,
            user_id=str(current_user.id)
        )

        grpc_resp = grpc_stub.DeleteFile(grpc_req, timeout=30)

        if not grpc_resp.success:
            raise HTTPException(
                status_code=500,
                detail=f"Cortex deletion failed: {grpc_resp.message}"
            )

        # 3. Delete from Azure Blob Storage
        await azure_handler.delete_file_from_azure(db_file.stored_filename)

        # 4. Delete DB record
        crud.delete_file_record(db=db, file_id=file_id, user_id=current_user.id)

        return Response(status_code=status.HTTP_204_NO_CONTENT)

    except grpc.RpcError as e:
        raise HTTPException(
            status_code=502,
            detail=f"Cortex AI unavailable: {e.details()}"
        )

    except Exception as e:
        print(f"File deletion failed: {e}")
        raise HTTPException(status_code=500, detail="File deletion failed")


@app.post("/api/v1/ai/ingest/{file_id}")
async def ingest_file_for_ai(
    file_id: str,
    file_key: str = Form(...),
    force_reingest: bool = Form(False),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_active_user)
):
    """
    Decrypts file locally and streams clean bytes to Cortex AI.
    """
    db_file = crud.get_file_by_id(db=db, file_id=file_id, user_id=current_user.id)
    if not db_file:
        raise HTTPException(status_code=404, detail="File not found")

    try:
        # 1. Download Encrypted Bytes
        encrypted_bytes = await azure_handler.download_file_bytes(db_file.stored_filename)
        
        # 2. Decrypt locally using helper
        try:
            clean_bytes = crypto_utils.decrypt_file_content(
                encrypted_bytes=encrypted_bytes,
                key_b64=file_key,
                iv_b64=db_file.file_iv
            )
            enc_meta_bytes = base64.b64decode(db_file.encrypted_metadata)
                    
            decrypted_json_bytes = crypto_utils.decrypt_file_content(
                 encrypted_bytes=enc_meta_bytes, 
                 key_b64=file_key,
                 iv_b64=db_file.metadata_iv
)
                    
            # B. Parse JSON to get filename
            metadata = json.loads(decrypted_json_bytes.decode('utf-8'))
            real_name = metadata.get('filename', 'Unknown File')
        except ValueError:
             raise HTTPException(status_code=400, detail="Decryption failed. Invalid Key?")

        # 3. Prepare gRPC Request
        # ext = os.path.splitext(db_file.stored_filename)[1]
        
        grpc_request = cortex_pb2.IngestRequest(
            file_id=file_id,
            user_id=str(current_user.id),
            file_bytes=clean_bytes, # Sending DECRYPTED bytes
            filename=real_name,
            file_key=file_key, 
            enable_redaction=False,
            force_reingest=force_reingest
        )

        # 4. Return SSE Stream
        return StreamingResponse(
            ingest_stream_generator(grpc_request),
            media_type="text/event-stream"
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"Ingestion setup failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
def chat_stream_generator(grpc_req, timeout=60):
    """
    Wraps the Unary gRPC call and yields SSE events to the frontend.
    This simulates a streaming effect by splitting the answer into tokens.
    """
    try:
        # 1. Call gRPC (This waits until the AI finishes thinking completely)
        # Note: We increase timeout because RAG can take a few seconds
        response = grpc_stub.ChatWithDocument(grpc_req, timeout=timeout)
        
        # 2. Yield Sources Event First
        # The frontend needs this to render citations
        if response.sources:
            sources_data = {"type": "sources", "data": list(response.sources)}
            yield f"data: {json.dumps(sources_data)}\n\n"

        # 3. Simulate Streaming (The "Typing" Effect)
        # Since we have the whole text, we split it by spaces to mimic tokens
        if response.answer:
            tokens = response.answer.split(" ")
            for token in tokens:
                # We add the space back since split removed it
                chunk = {"type": "token", "data": token + " "}
                yield f"data: {json.dumps(chunk)}\n\n"
                
                # Tiny sleep creates the visual "typing" effect on the frontend
                time.sleep(0.02) 

        # 4. Yield End Event
        yield f"data: {json.dumps({'type': 'end'})}\n\n"

    except grpc.RpcError as e:
        # Handle gRPC specific errors (e.g., AI server down)
        error_msg = f"AI Server Error: {e.details()}"
        print(error_msg)
        yield f"data: {json.dumps({'type': 'error', 'data': error_msg})}\n\n"

    except Exception as e:
        # Handle general python errors
        error_msg = f"Internal Error: {str(e)}"
        print(error_msg)
        yield f"data: {json.dumps({'type': 'error', 'data': error_msg})}\n\n"


@app.post("/api/v1/ai/chat")
async def chat_with_documents(
    query_data: schemas.ChatQuery, 
    current_user: models.User = Depends(security.get_current_active_user),
    db: Session = Depends(get_db)
):
    try:
        # 1. Fetch File Records (Iteratively since we don't have batch fetch)
        files = []
        for fid in query_data.file_ids:
            # Check ownership implicitly by passing current_user.id
            db_file = crud.get_file_by_id(db, fid, current_user.id)
            if db_file:
                files.append(db_file)
        
        name_map = {}

        # 2. Decrypt Metadata for each file
        for db_file in files:
            # Get the key the user just sent for this specific file
            user_provided_key = query_data.file_keys.get(db_file.id)
            
            # Default fallback
            name_map[db_file.id] = "Untitled"

            if user_provided_key:
                try:
                    # A. Decrypt the metadata string
                    import base64
                    
                    # Validate if metadata exists and isn't just a placeholder
                    if not db_file.encrypted_metadata or "fake" in db_file.encrypted_metadata:
                        name_map[db_file.id] = db_file.stored_filename # Fallback to system name
                        continue

                    enc_meta_bytes = base64.b64decode(db_file.encrypted_metadata)
                    
                    decrypted_json_bytes = crypto_utils.decrypt_file_content(
                        encrypted_bytes=enc_meta_bytes, 
                        key_b64=user_provided_key,
                        iv_b64=db_file.metadata_iv
                    )
                    
                    # B. Parse JSON to get filename
                    metadata = json.loads(decrypted_json_bytes.decode('utf-8'))
                    real_name = metadata.get('filename', 'Unknown File')
                    
                    # C. Add to map
                    name_map[db_file.id] = real_name

                except Exception as e:
                    print(f"Failed to decrypt metadata for {db_file.id}: {e}")
                    name_map[db_file.id] = "Encrypted Document" 

        # 3. Send to AI Server
        grpc_req = cortex_pb2.ChatRequest(
            query=query_data.query,
            user_id=str(current_user.id),
            file_ids=query_data.file_ids,
            file_keys=query_data.file_keys,
            file_names=name_map # ✅ Sending the decrypted real names
        )

        return StreamingResponse(
            chat_stream_generator(grpc_req),
            media_type="text/event-stream"
        )

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))