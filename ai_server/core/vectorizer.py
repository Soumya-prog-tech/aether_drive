from typing import List, Dict
import numpy as np
from sentence_transformers import SentenceTransformer
from langchain_text_splitters import MarkdownTextSplitter

class Vectorizer:
    def __init__(self):
        print("🚀 Loading SentenceTransformer model (all-MiniLM-L6-v2)...")
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        
        # MarkdownTextSplitter is aware of Markdown syntax (#, ##, |, etc.)
        # It tries to keep tables and sections together.
        self.text_splitter = MarkdownTextSplitter(
            chunk_size=600,  # Slightly larger to fit Markdown table rows
            chunk_overlap=100 # Increased overlap to preserve context between chunks
        )
        print("✅ Vectorizer ready.")
    
    def process_text(self, text: str, meta: Dict) -> List[Dict]:
        """
        Splits Markdown text into chunks and generates embeddings.
        """
        if not text:
            return []

        # 1. Split text based on Markdown structure
        chunks = self.text_splitter.split_text(text)
        if not chunks:
            return []
        
        print(f"📦 Split into {len(chunks)} Markdown-aware chunks. Embedding...")

        # 2. Batch Embedding (much faster than looping)
        # Using convert_to_numpy=True is faster for large datasets
        vectors = self.model.encode(chunks, show_progress_bar=False)

        # 3. Format for Qdrant
        payloads = []
        for i, (chunk, vector) in enumerate(zip(chunks, vectors)):
            payloads.append({
                "vector": vector.tolist(),
                "payload": {
                    "text_content": chunk,
                    "chunk_index": i,
                    **meta # Includes file_id, user_id, and extension
                }
            })

        print(f"✨ Generated {len(payloads)} embedded points.")
        return payloads