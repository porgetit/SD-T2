# Lanzador del cliente (backend FastAPI + frontend React)
# Opción 2 (PyInstaller): detecta si existe dist/ y lo sirve estáticamente.
# Para dev: ejecutar este archivo directamente → FastAPI en :8000, Vite en :3000.
import uvicorn
import sys
import os
import socket

# Imports explícitos para que PyInstaller los detecte e incluya en el EXE
import client.api
import shared.protocol

def find_available_port(start_port: int, max_attempts: int = 50) -> int:
    """Busca y retorna el primer puerto disponible comenzando desde start_port."""
    for port in range(start_port, start_port + max_attempts):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(("127.0.0.1", port))
                return port # El puerto está libre, uvicorn puede usarlo
            except OSError:
                continue
    raise RuntimeError("No se encontraron puertos locales disponibles.")

if __name__ == "__main__":
    base_port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    port = find_available_port(base_port)

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