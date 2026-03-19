# Lanzador del cliente (backend FastAPI + frontend React)
# Opción 2 (PyInstaller): detecta si existe dist/ y lo sirve estáticamente.
# Para dev: ejecutar este archivo directamente → FastAPI en :8000, Vite en :3000.
import uvicorn
import sys
import os

if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000

    # Detectar si estamos en modo producción (dist/ compilado existe)
    dist_dir = os.path.join(os.path.dirname(__file__), "dist")
    is_production = os.path.isdir(dist_dir)

    if is_production:
        print(f"[ChatNet] Frontend compilado detectado. Sirviendo en http://127.0.0.1:{port}")
        uvicorn.run("client.api:app", host="127.0.0.1", port=port, reload=False)
    else:
        print(f"[ChatNet] Modo desarrollo. API en http://127.0.0.1:{port}")
        print("[ChatNet] Ejecuta 'npm run dev' en gui/ para el frontend (Vite en :3000)")
        uvicorn.run("client.api:app", host="127.0.0.1", port=port, reload=True)