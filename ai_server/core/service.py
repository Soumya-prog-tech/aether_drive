import os
from core.processor import processor  # Docling processor
from core.redactor import Redactor
from core.vectorizer import Vectorizer
from core.rag import RAGEngine

class CortexService:
    def __init__(self):
        print("🚀 Initializing Cortex AI Service...")
        self.redactor = Redactor()
        self.vectorizer = Vectorizer()
        self.rag_engine = RAGEngine(self.vectorizer)
        print("✅ Cortex AI Service initialized.")

    def is_file_ingested(self, file_id: str) -> bool:
        """
        Quick check to see if we already have vectors for this file.
        """
        return self.rag_engine.file_exists(file_id)

    def ingest_file(self, file_bytes, file_extension, file_id, user_id, enable_redaction=True, file_key=None, force_reindex=False):
        """
        Generator that yields status updates: (status_code, message, [optional_count])
        """
        # 0. Check Existence
        if self.is_file_ingested(file_id) and not force_reindex:
            # Yielding 0 as the count for skipped files
            yield "SKIPPED", f"File {file_id} is already indexed.", 0
            return

        # 1. Processing
        yield "READING", f"Reading and analyzing {file_id}..."
        file_full_name = f"{file_id}{file_extension}"
        
        try:
            clean_text = processor.process_file_bytes(file_bytes, file_full_name)
        except Exception as e:
            raise RuntimeError(f"Docling failed: {e}")

        # 2. Redaction
        if enable_redaction:
            yield "SECURING", "Scanning for PII..."
            clean_text, _ = self.redactor.redact(clean_text)

        # 3. Vectorization
        yield "INDEXING", "Generating embeddings..."
        meta = {
            "file_id": file_id, 
            "user_id": user_id, 
            "extension": file_extension, 
            "file_name": file_full_name
        }
        points_data = self.vectorizer.process_text(clean_text, meta)

        # 4. Storage
        yield "SAVING", f"Storing {len(points_data)} vectors..."
        self.rag_engine.delete_file(file_id)
        
        # Capture the count returned by store_vectors
        count = self.rag_engine.store_vectors(points_data, file_id, file_key)

        # 5. Final Yield with Count (3-tuple)
        yield "SUCCESS", f"Successfully ingested {count} chunks.", count
    
    def chat(self, query: str, user_id: str, file_ids: list, file_keys: dict, file_names: dict):
        """
        Handles a chat query using RAG.
        file_keys is a map of {file_id: key} for secure decryption.
        """
        response, sources = self.rag_engine.ask(query, user_id, file_ids, file_keys, file_names)
        return response, sources