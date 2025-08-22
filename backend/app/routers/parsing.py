
from fastapi import APIRouter, UploadFile, File, Form
from ..services.csv_store import create_csv_from_text
from ..utils import create_project, get_csv_path
import pdfplumber

router = APIRouter(prefix="/api", tags=["parse"]) 

@router.post("/upload")
async def upload_pdf(file: UploadFile = File(...), project_id: str = Form(None)):
    assert file.filename.lower().endswith(".pdf"), "Debe ser un PDF"
    # Si no se pasa project_id, se crea uno nuevo
    project_id = create_project(project_id)
    # leemos el pdf a memoria y extraemos texto
    text = ""
    with pdfplumber.open(file.file) as pdf:
        for page in pdf.pages:
            t = page.extract_text() or ""
            text += "\n" + t

    csv_path = create_csv_from_text(text, project_id=project_id, overwrite=True)
    return {"ok": True, "csv": str(csv_path), "project_id": project_id}
