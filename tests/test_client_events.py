# tests/test_client_events.py
# Pruebas para client/events.py (EventQueue Pub/Sub)

import asyncio
import pytest
import pytest_asyncio
from client.events import EventQueue


# ── Tests ──────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_subscribe_returns_queue():
    """subscribe() debe retornar un asyncio.Queue."""
    eq = EventQueue()
    q  = eq.subscribe()
    assert isinstance(q, asyncio.Queue)


@pytest.mark.asyncio
async def test_publish_delivers_to_subscriber():
    """Un evento publicado debe llegar a la cola del suscriptor."""
    eq    = EventQueue()
    queue = eq.subscribe()
    event = {"type": "TEXT", "sender": "alice", "payload": {"text": "hola"}}

    await eq.publish(event)

    received = queue.get_nowait()
    assert received == event


@pytest.mark.asyncio
async def test_publish_to_multiple_subscribers():
    """Un evento debe llegar a TODOS los suscriptores activos."""
    eq = EventQueue()
    q1 = eq.subscribe()
    q2 = eq.subscribe()
    q3 = eq.subscribe()

    event = {"type": "COMMAND", "sender": "server", "payload": {"command": "USER_LIST"}}
    await eq.publish(event)

    assert q1.get_nowait() == event
    assert q2.get_nowait() == event
    assert q3.get_nowait() == event


@pytest.mark.asyncio
async def test_publish_no_subscribers_does_not_crash():
    """Publicar sin suscriptores no debe lanzar excepción."""
    eq = EventQueue()
    await eq.publish({"type": "TEXT", "sender": "x", "payload": {}})


@pytest.mark.asyncio
async def test_unsubscribe_stops_delivery():
    """Tras unsubscribe, la cola no debe recibir nuevos eventos."""
    eq    = EventQueue()
    queue = eq.subscribe()
    eq.unsubscribe(queue)

    await eq.publish({"type": "TEXT", "sender": "x", "payload": {}})

    assert queue.empty()


@pytest.mark.asyncio
async def test_unsubscribe_unknown_queue_no_crash():
    """unsubscribe con una cola no registrada no debe lanzar excepción."""
    eq = EventQueue()
    random_q = asyncio.Queue()
    eq.unsubscribe(random_q)   # No debe lanzar nada


@pytest.mark.asyncio
async def test_publish_multiple_events_in_order():
    """Los eventos deben llegar en el orden en que fueron publicados."""
    eq = EventQueue()
    q  = eq.subscribe()

    events = [{"n": i} for i in range(5)]
    for e in events:
        await eq.publish(e)

    received = [q.get_nowait() for _ in range(5)]
    assert received == events
