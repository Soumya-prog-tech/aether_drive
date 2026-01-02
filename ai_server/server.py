import grpc
from concurrent import futures
import logging
import cortex_pb2
import cortex_pb2_grpc
from core.service import CortexService

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 1. Define a large enough limit (e.g., 100 MB) for handling large file uploads
MAX_MESSAGE_LENGTH = 100 * 1024 * 1024 

class CortexGRPCHandler(cortex_pb2_grpc.AIServiceServicer):
    def __init__(self):
        # Initialize the business logic layer
        self.service = CortexService()

    def IngestFile(self, request, context):
        """
        Receives a file upload and streams back status updates (SSE-style) via gRPC.
        """
        filename=request.filename
        logger.info(f"Received ingestion request for file: {filename}")

        try:
            # Call the generator from the service layer
            progress_generator = self.service.ingest_file(
                file_bytes=request.file_bytes, 
                filename=request.filename,
                file_id=request.file_id, 
                user_id=request.user_id, 
                enable_redaction=request.enable_redaction, 
                file_key=request.file_key, 
                force_reindex=request.force_reingest
            )

            # Iterate over the updates yielded by the service
            for update in progress_generator:
                # Handle flexible unpacking: 
                # Service yields (status, message) normally, but (status, message, count) on completion
                if len(update) == 3:
                    status_code, message, count = update
                else:
                    status_code, message = update
                    count = 0

                logger.debug(f"Streaming status: [{status_code}] {message}")
                
                # Construct and yield the gRPC status message with all fields
                yield cortex_pb2.IngestStatus(
                    status=status_code,
                    message=message,
                    success=(status_code == "SUCCESS"),  # Set True only on success
                    chunks_count=count
                )

        except Exception as e:
            logger.error(f"❌ Ingestion Error for {filename}: {e}")
            # Send a final 'FAILED' status so the client stops listening
            yield cortex_pb2.IngestStatus(
                status="FAILED",
                message=str(e),
                success=False,
                chunks_count=0
            )

    def ChatWithDocument(self, request, context):
        """
        Standard Request-Response for Chat (Non-streaming)
        """
        try:
            answer, sources = self.service.chat(
                request.query, request.user_id, request.file_ids, request.file_keys, request.file_names
            )
            return cortex_pb2.ChatResponse(answer=answer, sources=sources)
        except Exception as e:
            logger.error(f"❌ Chat Error: {e}")
            return cortex_pb2.ChatResponse(answer=f"Error: {str(e)}", sources=[])
        
    def DeleteFile(self, request, context):
        """
        Deletes all vectors for a file from Qdrant.
        """
        logger.info(
            f"🗑️ Delete request received | file_id={request.file_id} user_id={request.user_id}"
        )

        try:
            result = self.service.delete_file(
                file_id=request.file_id,
                user_id=request.user_id
            )

            return cortex_pb2.DeleteFileResponse(
                success=result["success"],
                message=result["message"]
            )

        except Exception as e:
            logger.error(f"❌ DeleteFile error: {e}")
            return cortex_pb2.DeleteFileResponse(
                success=False,
                message=str(e)
            )

    

def serve():
    # 2. Add options to handle large messages (important for PDF uploads)
    options = [
        ('grpc.max_send_message_length', MAX_MESSAGE_LENGTH),
        ('grpc.max_receive_message_length', MAX_MESSAGE_LENGTH),
    ]

    server = grpc.server(
        futures.ThreadPoolExecutor(max_workers=10),
        options=options
    )
    
    # Register the handler
    cortex_pb2_grpc.add_AIServiceServicer_to_server(CortexGRPCHandler(), server)
    
    # Listen on port 50051
    server.add_insecure_port('[::]:50051')
    print("🚀 Cortex AI Server (Streaming) running on port 50051 (Limit: 100MB)")
    
    try:
        server.start()
        server.wait_for_termination()
    except KeyboardInterrupt:
        print("🛑 Shutting down Cortex AI Server...")
        server.stop(0)

if __name__ == '__main__':
    serve()