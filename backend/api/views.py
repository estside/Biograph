import os
import tempfile
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework import status
from gradio_client import Client, handle_file

@api_view(['POST'])
@parser_classes([MultiPartParser, FormParser])
def predict_stability(request):
    """
    Endpoint: POST /api/predict-stability/
    Request fields:
        - pdb_file: .pdb file upload (multipart/form-data)
        - mutation: Point mutation string (e.g., 'A12G')
    """
    pdb_file = request.FILES.get('pdb_file')
    mutation_string = request.data.get('mutation')

    if not pdb_file:
        return Response({
            "success": False,
            "error": "No pdb_file provided"
        }, status=status.HTTP_400_BAD_REQUEST)

    if not mutation_string:
        return Response({
            "success": False,
            "error": "No mutation string provided (e.g. 'A12G')"
        }, status=status.HTTP_400_BAD_REQUEST)

    temp_file_path = None
    try:
        # Save the uploaded file temporarily to the local server disk
        with tempfile.NamedTemporaryFile(suffix=".pdb", delete=False) as temp_file:
            for chunk in pdb_file.chunks():
                temp_file.write(chunk)
            temp_file_path = temp_file.name

        # Initialize the Gradio client with the Hugging Face Space stability predictor
        hf_client = Client("estside/3D-GNN-Stability-Predictor")

        # Ping the ML model on Hugging Face
        result = hf_client.predict(
            pdb_file=handle_file(temp_file_path),
            mutation_string=mutation_string,
            api_name="/predict_mutation"
        )

        return Response({
            "success": True,
            "delta_delta_g": result
        })

    except Exception as e:
        return Response({
            "success": False,
            "error": f"ML model prediction failed: {str(e)}"
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    finally:
        # Always delete the temporary file so the server disk doesn't bloat
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
            except Exception as e:
                # Log or ignore temp file deletion failure
                pass
