# 1. Import the "Detective" (Analyzer) and the "Eraser" (Anonymizer)
from presidio_analyzer import AnalyzerEngine
from presidio_anonymizer import AnonymizerEngine 

class Redactor:
    def __init__(self):
        # 2. Load the heavy ML models once when the class starts
        self.analyzer = AnalyzerEngine()
        self.anonymizer = AnonymizerEngine()

    def redact(self, text: str):
        # 3. The Detective scans the text
        results = self.analyzer.analyze(
            text=text, 
            entities=["PERSON", "EMAIL_ADDRESS", "PHONE_NUMBER"], 
            language="en"
        )
        
        # 4. The Eraser replaces the findings
        anonymized = self.anonymizer.anonymize(
            text=text, 
            analyzer_results=results
        )
        
        pii_found = len(results) > 0
        
        # 5. Return the clean text and a True/False flag
        return anonymized.text, pii_found