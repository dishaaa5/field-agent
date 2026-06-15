call venv\Scripts\activate
set GOOGLE_SHEET_ID=1NVeaW_rRDxFxjPS8vmArVcUdnDerijreZDHktAgWC7E
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
