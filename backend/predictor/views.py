from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import httpx
import json
import tempfile
import os

HF_SPACE_URL = "https://estside-3d-gnn-stability-predictor.hf.space"


def extract_prediction(event_stream):
    for block in event_stream.split("\n\n"):
        event_name = None
        data_text = None

        for line in block.splitlines():
            if line.startswith("event:"):
                event_name = line.removeprefix("event:").strip()
            elif line.startswith("data:"):
                data_text = line.removeprefix("data:").strip()

        if event_name == "complete" and data_text:
            data = json.loads(data_text)
            return data[0] if data else ""

        if event_name == "error" and data_text:
            raise ValueError(data_text)

    raise ValueError("The prediction completed without returning a result.")


def predict_with_hugging_face(pdb_file_path, mutation_string):
    timeout = httpx.Timeout(120.0, connect=30.0)

    with open(pdb_file_path, "rb") as pdb_file:
        upload_response = httpx.post(
            f"{HF_SPACE_URL}/gradio_api/upload",
            files={
                "files": (
                    os.path.basename(pdb_file_path),
                    pdb_file,
                    "chemical/x-pdb",
                )
            },
            timeout=timeout,
        )
    upload_response.raise_for_status()

    uploaded_paths = upload_response.json()
    if not uploaded_paths:
        raise ValueError("Hugging Face did not return an uploaded file path.")

    prediction_response = httpx.post(
        f"{HF_SPACE_URL}/gradio_api/call/predict_mutation",
        json={
            "data": [
                {
                    "path": uploaded_paths[0],
                    "meta": {"_type": "gradio.FileData"},
                },
                mutation_string,
            ]
        },
        timeout=timeout,
    )
    prediction_response.raise_for_status()

    event_id = prediction_response.json().get("event_id")
    if not event_id:
        raise ValueError("Hugging Face did not return a prediction event ID.")

    result_response = httpx.get(
        f"{HF_SPACE_URL}/gradio_api/call/predict_mutation/{event_id}",
        timeout=timeout,
    )
    result_response.raise_for_status()

    return extract_prediction(result_response.text)


def home_view(request):
    context = {}
    
    # If the user submitted the form...
    if request.method == 'POST':
        # Grab the file and text from the HTML form
        pdb_file = request.FILES.get('pdb_file')
        mutation_string = request.POST.get('mutation')

        if pdb_file and mutation_string:
            # 1. Save the file temporarily to the server's hard drive
            with tempfile.NamedTemporaryFile(delete=False, suffix=".pdb") as temp_file:
                for chunk in pdb_file.chunks():
                    temp_file.write(chunk)
                temp_file_path = temp_file.name

            try:
                # 2. Ping your Hugging Face model
                result = predict_with_hugging_face(temp_file_path, mutation_string)
                
                # 3. Pass the result back to the HTML page
                context['success'] = True
                context['score'] = result
                
            except Exception as exc:
                context['error'] = str(exc)
            
            finally:
                # 4. ALWAYS delete the temporary file so your server doesn't get bloated
                if os.path.exists(temp_file_path):
                    os.remove(temp_file_path)
        else:
            context['error'] = "You must provide both a PDB file and a mutation."

    # Render the HTML page (passing any results or errors to it)
    return render(request, 'index.html', context)


@csrf_exempt
def predict_stability_api(request):
    if request.method == 'POST':
        pdb_file = request.FILES.get('pdb_file')
        pdb_id = request.POST.get('pdb_id')
        mutation_string = request.POST.get('mutation')

        if not mutation_string:
            return JsonResponse({'success': False, 'error': 'Mutation string is required.'}, status=400)

        temp_file_path = None
        try:
            if pdb_file:
                with tempfile.NamedTemporaryFile(delete=False, suffix=".pdb") as temp_file:
                    for chunk in pdb_file.chunks():
                        temp_file.write(chunk)
                    temp_file_path = temp_file.name
            elif pdb_id:
                # Download from RCSB
                response = httpx.get(f"https://files.rcsb.org/download/{pdb_id}.pdb")
                if response.status_code != 200:
                    return JsonResponse({'success': False, 'error': f'Could not download PDB ID {pdb_id}.'}, status=400)
                with tempfile.NamedTemporaryFile(delete=False, suffix=".pdb") as temp_file:
                    temp_file.write(response.content)
                    temp_file_path = temp_file.name
            else:
                return JsonResponse({'success': False, 'error': 'Either pdb_file or pdb_id must be provided.'}, status=400)

            result = predict_with_hugging_face(temp_file_path, mutation_string)
            return JsonResponse({'success': True, 'delta_delta_g': result})

        except Exception as exc:
            return JsonResponse({'success': False, 'error': str(exc)}, status=500)

        finally:
            if temp_file_path and os.path.exists(temp_file_path):
                os.remove(temp_file_path)

    return JsonResponse({'success': False, 'error': 'Method not allowed.'}, status=405)
