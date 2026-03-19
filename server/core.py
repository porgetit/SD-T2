# Servidor WebSocket principal
import asyncio
import json
import websockets
from .models import ClientInfo
from .router import MessageRouter

class ChatServer:
    def __init__(self, host: str, port: int):
        self.host = host
        self.port = port
        self.clients: dict[str, ClientInfo] = {}
        self.router = MessageRouter(self)

    async def handle_connection(self, websocket):
        nickname = None
        try:
            async for raw_msg in websocket:
                data = json.loads(raw_msg)
                nickname = await self.router.dispatch(data, websocket)
        except websockets.exceptions.ConnectionClosed:
            pass
        finally:
            if nickname and nickname in self.clients:
                # Broadcast USER_LEFT antes de limpiar
                await self.router.broadcast_user_left(nickname)
                del self.clients[nickname]
                print(f"[SISTEMA] {nickname} desconectado.")

    async def run(self):
        async with websockets.serve(self.handle_connection, self.host, self.port):
            await asyncio.Future() # Mantener vivo