import os
import uuid
from google import genai
from qdrant_client import QdrantClient
from qdrant_client.models import PointStruct, VectorParams, Distance, Filter, FieldCondition, MatchAny, MatchValue
from core.crypto_utils import encrypt_chunk, decrypt_chunk

class RAGEngine:
    def __init__(self, vectorizer):
        self.vectorizer = vectorizer
        host = os.getenv("QDRANT_HOST", "localhost")
        port = int(os.getenv("QDRANT_PORT", "6333"))
        self.qdrant = QdrantClient(host=host, port=port)
        self._init_collection()

        api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        if api_key:
            self.client = genai.Client(api_key=api_key)
            self.model_name = "gemini-2.5-flash" 
            print("✅ Google Gemini 2.5 Flash ready.")
        else:
            raise ValueError("GEMINI_API_KEY not set.")
        
    def _init_collection(self):
        if not self.qdrant.collection_exists("aether_drive"):
            self.qdrant.create_collection(
                collection_name="aether_drive", 
                vectors_config=VectorParams(size=384, distance=Distance.COSINE)
            )

    def file_exists(self, file_id: str) -> bool:
        """
        Checks if a file has already been ingested into Qdrant.
        """
        count_result = self.qdrant.count(
            collection_name="aether_drive",
            count_filter=Filter(
                must=[FieldCondition(key="file_id", match=MatchValue(value=file_id))]
            )
        )
        return count_result.count > 0

    def store_vectors(self, points_data: list, file_id: str, file_key: str):
        points = []
        for p in points_data:
            # Encrypt content before storage (Zero-Knowledge)
            encrypted = encrypt_chunk(file_key, p['payload']['text_content'])
            secure_payload = p['payload'].copy()
            secure_payload['text_content'] = encrypted['ciphertext']
            secure_payload['nonce'] = encrypted['nonce']
            
            chunk_id_str = f"{file_id}_{p['payload']['chunk_index']}"
            point_uuid = str(uuid.uuid5(uuid.NAMESPACE_DNS, chunk_id_str))

            points.append(PointStruct(
                id=point_uuid,
                vector=p['vector'],
                payload=secure_payload
            ))

        batch_size = 100
        for i in range(0, len(points), batch_size):
            self.qdrant.upsert(
                collection_name="aether_drive", 
                points=points[i:i + batch_size]
            )
        return len(points)

    def ask(self, query: str, user_id: str, file_ids: list, file_keys_map: dict, file_names: dict):
        # 1. Embed query
        query_vector = self.vectorizer.model.encode(query).tolist()

        # 2. Build Filter
        search_filter = Filter(
            must=[
                FieldCondition(key="user_id", match=MatchValue(value=user_id)),
                FieldCondition(key="file_id", match=MatchAny(any=file_ids))
            ]
        )

        # 3. Retrieval
        search_result = self.qdrant.query_points(
            collection_name="aether_drive",
            query=query_vector,
            query_filter=search_filter,
            limit=15 
        )
        
        hits = search_result.points
        decrypted_texts = []
        
        for hit in hits:
            hit_file_id = hit.payload.get('file_id')
            if file_names and hit_file_id in file_names:
                file_name = file_names[hit_file_id]

            if hit_file_id not in file_keys_map:
                continue
                
            try:
                clean_text = decrypt_chunk(
                    key_b64=file_keys_map[hit_file_id],
                    ciphertext_b64=hit.payload['text_content'],
                    nonce_b64=hit.payload['nonce']
                )
                # Add source metadata to the text for the LLM
                decrypted_texts.append(f"Source ({file_name}): {clean_text}")
            except Exception as e:
                print(f"❌ Decryption failed: {e}")



        context = "\n\n---\n\n".join(decrypted_texts)
        
        # 4. System Prompt
        prompt = f"""
        Use the provided context chunks to answer the question.
        
        Context Quality: The context contains Markdown tables and structured text.
        
        Strict Rules:
        1. Only use the provided context.
        2. If the answer involves numbers/tables, present them clearly.
        3. Citation: When you use a fact, mention which Source it came from.
        4. If the answer is not in the context, say "I don't know".
        
        <CONTEXT>
        {context}
        </CONTEXT>
        
        Question: {query}
        """

        try:
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt
            )
            # Return full text and snippets for the frontend
            sources = [text[:150] + "..." for text in decrypted_texts[:3]]
            return response.text, sources
        except Exception as e:
            return f"AI Error: {str(e)}", []

    def delete_file(self, file_id: str):
        self.qdrant.delete(
            collection_name="aether_drive",
            points_selector=Filter(
                must=[FieldCondition(key="file_id", match=MatchValue(value=file_id))]
            )
        )