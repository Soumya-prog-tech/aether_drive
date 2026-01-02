import uuid
from datetime import datetime, timedelta, timezone
from fastapi import UploadFile
from azure.storage.blob.aio import BlobServiceClient
from azure.storage.blob import generate_blob_sas, BlobSasPermissions
from app.config import settings

async def initialize_container():
    """
    Ensures the Azure Storage container exists, creating it if necessary.
    """
    if not settings.AZURE_STORAGE_CONNECTION_STRING:
        print("WARNING: Azure Storage connection string not set. File operations will fail.")
        return

    try:
        blob_service_client = BlobServiceClient.from_connection_string(settings.AZURE_STORAGE_CONNECTION_STRING)
        async with blob_service_client:
            container_client = blob_service_client.get_container_client(settings.AZURE_CONTAINER_NAME)
            if not await container_client.exists():
                await container_client.create_container()
                print(f"Container '{settings.AZURE_CONTAINER_NAME}' created and initialized.")
            else:
                print(f"Container '{settings.AZURE_CONTAINER_NAME}' initialized.")
    except Exception as e:
        print(f"Error initializing Azure container: {e}")

async def upload_file_to_azure(file: UploadFile) -> str:
    """
    Uploads a file to Azure Blob Storage and returns the unique blob name.
    """
    blob_service_client = BlobServiceClient.from_connection_string(settings.AZURE_STORAGE_CONNECTION_STRING)
    
    # Generate a unique name for the blob to prevent collisions.
    file_id = str(uuid.uuid4())
    unique_blob_name = f"{file_id}.enc"
    
    async with blob_service_client:
        blob_client = blob_service_client.get_blob_client(
            container=settings.AZURE_CONTAINER_NAME,
            blob=unique_blob_name
        )
        
        # Read the file content and upload
        file_content = await file.read()
        await blob_client.upload_blob(file_content, overwrite=True)
        
    return unique_blob_name

async def get_file_download_url(blob_name: str) -> str:
    """
    Generates a temporary, secure SAS URL to download a blob.
    """
    blob_service_client = BlobServiceClient.from_connection_string(settings.AZURE_STORAGE_CONNECTION_STRING)
    
    async with blob_service_client:
        blob_client = blob_service_client.get_blob_client(
            container=settings.AZURE_CONTAINER_NAME,
            blob=blob_name
        )
        
        # Generate a SAS token that is valid for 1 hour
        sas_token = generate_blob_sas(
            account_name=blob_client.account_name,
            container_name=blob_client.container_name,
            blob_name=blob_client.blob_name,
            account_key=blob_service_client.credential.account_key,
            permission=BlobSasPermissions(read=True),
            expiry=datetime.now(timezone.utc) + timedelta(hours=1)
        )
        
    return f"{blob_client.url}?{sas_token}"

# ✅ ADDED THIS FUNCTION
async def download_file_bytes(blob_name: str) -> bytes:
    """
    Downloads the raw bytes of a blob from Azure Storage into memory.
    Used for server-side processing (e.g., decryption before AI ingestion).
    """
    blob_service_client = BlobServiceClient.from_connection_string(settings.AZURE_STORAGE_CONNECTION_STRING)
    
    async with blob_service_client:
        blob_client = blob_service_client.get_blob_client(
            container=settings.AZURE_CONTAINER_NAME,
            blob=blob_name
        )
        
        # Download the blob stream and read all bytes
        download_stream = await blob_client.download_blob()
        data = await download_stream.readall()
        
    return data

async def delete_file_from_azure(blob_name: str):
    """
    Deletes a blob from Azure Blob Storage.
    Safe + idempotent (no error if blob doesn't exist).
    """
    if not settings.AZURE_STORAGE_CONNECTION_STRING:
        raise RuntimeError("Azure Storage connection string not set")

    blob_service_client = BlobServiceClient.from_connection_string(
        settings.AZURE_STORAGE_CONNECTION_STRING
    )

    async with blob_service_client:
        blob_client = blob_service_client.get_blob_client(
            container=settings.AZURE_CONTAINER_NAME,
            blob=blob_name
        )

        try:
            await blob_client.delete_blob()
        except Exception as e:
            # Azure throws if blob doesn't exist; you may ignore or log
            print(f"Azure delete warning for {blob_name}: {e}")
