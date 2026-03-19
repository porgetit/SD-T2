# Cola Pub/Sub para la GUI local
# client/events.py
import asyncio
from typing import List

class EventQueue:
    """
    Sistema Pub/Sub asíncrono. 
    Permite que la lógica de red publique eventos y que múltiples 
    WebSockets locales (pestañas del navegador) los reciban.
    """
    def __init__(self):
        # Lista de colas activas (una por cada suscriptor/pestaña conectada)
        self._subscribers: List[asyncio.Queue] = []

    def subscribe(self) -> asyncio.Queue:
        """Crea una nueva cola para un nuevo suscriptor (ej. nueva conexión WS local)"""
        queue = asyncio.Queue()
        self._subscribers.append(queue)
        return queue

    def unsubscribe(self, queue: asyncio.Queue):
        """Elimina la cola cuando el suscriptor se desconecta"""
        if queue in self._subscribers:
            self._subscribers.remove(queue)

    async def publish(self, event: dict):
        """
        Envía un evento (diccionario JSON) a todos los suscriptores activos.
        Se usa cuando llega un mensaje desde el servidor central.
        """
        if not self._subscribers:
            return

        # Enviamos el mensaje a todas las colas registradas
        for queue in self._subscribers:
            await queue.put(event)