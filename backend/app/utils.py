
from pathlib import Path
import ulid
import json

BASE_VOICES_DIR = Path(__file__).parent / "static" / "voices"
BASE_VOICES_DIR.mkdir(parents=True, exist_ok=True)

def get_project_dir(project_id: str) -> Path:
	d = BASE_VOICES_DIR / project_id
	d.mkdir(parents=True, exist_ok=True)
	return d

def get_csv_path(project_id: str) -> Path:
	return get_project_dir(project_id) / "entrevista.csv"

def get_info_path(project_id: str) -> Path:
	return get_project_dir(project_id) / f"{project_id}.info"

def create_project(project_id: str = None) -> str:
	if not project_id:
		project_id = str(ulid.new())
	d = get_project_dir(project_id)
	info_path = get_info_path(project_id)
	# If no .info exists, create a minimal one. Do not overwrite existing.
	if not info_path.exists():
		try:
			with open(info_path, "w", encoding="utf-8") as f:
				json.dump({"title": "", "desc": ""}, f, ensure_ascii=False, indent=2)
		except Exception:
			# best-effort; ignore write failures here
			pass
	# log creation attempt in project logger
	try:
		from app.services.project_logger import log
		log(project_id, "create_project called - ensured project dir and .info file")
	except Exception:
		pass
	return project_id

def list_projects():
	projects = []
	for p in BASE_VOICES_DIR.iterdir():
		if p.is_dir():
			info_path = p / f"{p.name}.info"
			title = p.name
			desc = ""
			if info_path.exists():
				try:
					with open(info_path) as f:
						data = json.load(f)
						title = data.get("title") or p.name
						desc = data.get("desc") or ""
				except Exception:
					pass
			projects.append({"id": p.name, "title": title, "desc": desc})
	return projects
