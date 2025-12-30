import io
from docling.document_converter import DocumentConverter
from docling.datamodel.base_models import DocumentStream
# Import your existing redaction logic here
# from app.redactor import redact_pii 

class DocumentProcessor:
    def __init__(self):
        # Initialize once to keep models in memory
        self.converter = DocumentConverter()

    def process_file_bytes(self, file_bytes: bytes, file_name: str) -> str:
        """
        Universal processor: Bytes -> Docling -> [Redaction] -> Markdown
        """
        try:
            # 1. Convert bytes to a stream Docling can read
            # The name helps Docling choose the right internal parser (PDF vs Office)
            byte_io = io.BytesIO(file_bytes)
            doc_stream = DocumentStream(name=file_name, stream=byte_io)

            # 2. Run the conversion
            result = self.converter.convert(doc_stream)
            
            # 3. Export to Markdown (best format for LLM context and tables)
            markdown_text = result.document.export_to_markdown()

            
            return markdown_text
        

        except Exception as e:
            print(f"❌ Docling processing failed for {file_name}: {e}")
            raise RuntimeError(f"Conversion Error: {str(e)}")

# Initialize a global instance for the gRPC server to use
processor = DocumentProcessor()