# Lanzador del servidor
import asyncio
from server.core import ChatServer

if __name__ == "__main__":
    server = ChatServer("0.0.0.0", 5000)
    print("Servidor iniciado en ws://localhost:5000")
    asyncio.run(server.run())