# Cliente WS hacia el servidor central
import asyncio
import json
import websockets
from shared.protocol import Message

class NetworkClient:
    def __init__(self, on_message_callback):
        self.ws = None
        self.on_message = on_message_callback

    async def connect(self, url: str):
        self.ws = await websockets.connect(url)
        asyncio.create_task(self._listen())

    async def _listen(self):
        try:
            async for raw in self.ws:
                msg = json.loads(raw)
                await self.on_message(msg)
        except Exception as e:
            print(f"Error de red: {e}")

    async def send(self, message: Message):
        if self.ws:
            await self.ws.send(message.model_dump_json())