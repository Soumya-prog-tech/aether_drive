import grpc
import sys
import base64
import os
import cortex_pb2
import cortex_pb2_grpc

# 1. Configuration for Large Files
MAX_MESSAGE_LENGTH = 100 * 1024 * 1024  # 100 MB

# HARDCODED IDs for testing
TEST_FILE_ID = "file_test_persistent_id_001"
TEST_USER_ID = "user_test_001"
FIXED_TEST_KEY = base64.b64encode(b"a_very_secret_32_byte_key_123456").decode('utf-8')

def ingest_only(file_path, stub):
    print(f"\n🚀 STARTING INGESTION for {file_path}...")
    try:
        if not os.path.exists(file_path):
            print(f"❌ Error: File {file_path} not found.")
            return

        with open(file_path, "rb") as f:
            file_bytes = f.read()
        
        _, file_extension = os.path.splitext(file_path)
            
        request = cortex_pb2.IngestRequest(
            file_bytes=file_bytes,
            file_extension=file_extension,
            file_id=TEST_FILE_ID,
            user_id=TEST_USER_ID,
            file_key=FIXED_TEST_KEY,
            enable_redaction=True, 
            force_reingest=True
        )
        
        print(f"⏳ Sending data ({len(file_bytes) / 1024 / 1024:.2f} MB)... Listening for updates.")
        
        # --- KEY CHANGE: Iterate over the stream ---
        # The timeout applies to the connection/initial response, 
        # but the stream can stay open longer.
        response_stream = stub.IngestFile(request, timeout=300) 
        
        for status_update in response_stream:
            # Simple color coding for terminal output
            status_code = status_update.status
            message = status_update.message
            
            if status_code == "SUCCESS":
                print(f"✅ {message}")
            elif status_code == "FAILED":
                print(f"❌ {message}")
            elif status_code == "SKIPPED":
                print(f"⏩ {message}")
            else:
                # Normal progress updates (READING, INDEXING, etc.)
                print(f"🔹 [{status_code}] {message}")

    except grpc.RpcError as e:
        if e.code() == grpc.StatusCode.RESOURCE_EXHAUSTED:
            print("❌ Error: Message too large. Ensure both client and server limits are updated.")
        elif e.code() == grpc.StatusCode.DEADLINE_EXCEEDED:
            print("❌ Error: Timeout exceeded. The file is taking too long to process.")
        else:
            print(f"❌ gRPC Error: {e.code()} - {e.details()}")
    except Exception as e:
        print(f"❌ General Error: {e}")

def chat_only(query, stub):
    print(f"\n💬 ASKING AI: '{query}'")
    try:
        keys_map = {TEST_FILE_ID: FIXED_TEST_KEY}
        request = cortex_pb2.ChatRequest(
            query=query,
            user_id=TEST_USER_ID,
            file_ids=[TEST_FILE_ID],
            file_keys=keys_map
        )

        response = stub.ChatWithDocument(request, timeout=30)
        print(f"🤖 Answer: {response.answer}")
        
        if response.sources:
            print("\n📚 Sources used for this answer:")
            for i, source in enumerate(response.sources[:3]):
                # Clean up newlines for cleaner print
                clean_source = source.replace('\n', ' ')[:100]
                print(f"  {i+1}. {clean_source}...")
        else:
            print("📚 No sources found.")
    except Exception as e:
        print(f"❌ Chat Error: {e}")

if __name__ == "__main__":
    # 2. Apply the options to the insecure_channel
    channel_options = [
        ('grpc.max_send_message_length', MAX_MESSAGE_LENGTH),
        ('grpc.max_receive_message_length', MAX_MESSAGE_LENGTH),
    ]
    
    # Ensure this matches your server port
    channel = grpc.insecure_channel('localhost:50051', options=channel_options)
    stub = cortex_pb2_grpc.AIServiceStub(channel)

    if len(sys.argv) < 3:
        print("Usage:")
        print("  python test_client.py ingest <file_path>")
        print("  python test_client.py chat \"your question\"")
        sys.exit(1)

    mode = sys.argv[1]
    payload = sys.argv[2]

    if mode == "ingest":
        ingest_only(payload, stub)
    elif mode == "chat":
        chat_only(payload, stub)
    else:
        print("Invalid mode. Use 'ingest' or 'chat'.")