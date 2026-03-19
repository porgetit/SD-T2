# Lógica de negocio — MessageRouter con autenticación y presencia
from shared.protocol import Message, MessageType, CommandType
from .models import ClientInfo
from . import user_store


class MessageRouter:
    def __init__(self, server):
        self.server = server

    async def dispatch(self, raw_data: dict, websocket) -> str | None:
        """Despacha el mensaje ya parseado como dict. Retorna el nickname si hubo registro/login."""
        msg = Message(**raw_data)

        if msg.type == MessageType.COMMAND:
            return await self._handle_command(msg, websocket)
        elif msg.type == MessageType.TEXT:
            await self._handle_text(msg)
        elif msg.type == MessageType.BINARY:
            await self._handle_binary(msg)

        return getattr(websocket, "nickname", None)

    # ── Comandos ────────────────────────────────────────────────────────────

    async def _handle_command(self, msg: Message, websocket) -> str | None:
        cmd = msg.payload.get("command")

        # ── Auth: registro de cuenta ────────────────────────────────────────
        if cmd == CommandType.AUTH_REGISTER:
            nickname  = msg.payload.get("nickname", "")
            password  = msg.payload.get("password", "")
            avatar    = msg.payload.get("avatar_b64", "")
            ok, reason = user_store.register(nickname, password, avatar)
            if ok:
                await websocket.send(Message(
                    type=MessageType.COMMAND, sender="server",
                    payload={"command": CommandType.AUTH_OK, "nickname": nickname, 
                             "avatar_b64": avatar, "contacts_data": user_store.get_profiles(user_store.get_contacts(nickname))}
                ).model_dump_json())
            else:
                await websocket.send(Message(
                    type=MessageType.COMMAND, sender="server",
                    payload={"command": CommandType.AUTH_FAIL, "reason": reason}
                ).model_dump_json())
            return None

        # ── Auth: login con credenciales ────────────────────────────────────
        if cmd == CommandType.AUTH_LOGIN:
            nickname = msg.payload.get("nickname", "")
            password = msg.payload.get("password", "")
            ok, record = user_store.authenticate(nickname, password)
            if not ok:
                await websocket.send(Message(
                    type=MessageType.COMMAND, sender="server",
                    payload={"command": CommandType.AUTH_FAIL, "reason": "Credenciales inválidas."}
                ).model_dump_json())
                return None

            if nickname in self.server.clients:
                await websocket.send(Message(
                    type=MessageType.COMMAND, sender="server",
                    payload={"command": CommandType.AUTH_FAIL, "reason": "El usuario ya está conectado."}
                ).model_dump_json())
                return None

            # Guardar en clientes activos
            avatar = record.avatar_b64 if record else ""
            self.server.clients[nickname] = ClientInfo(
                nickname=nickname, websocket=websocket, avatar_b64=avatar
            )
            websocket.nickname = nickname
            await websocket.send(Message(
                type=MessageType.COMMAND, sender="server",
                payload={"command": CommandType.AUTH_OK, "nickname": nickname, 
                         "avatar_b64": avatar, "contacts_data": user_store.get_profiles(user_store.get_contacts(nickname))}
            ).model_dump_json())
            # Broadcast USER_JOINED a los demás
            await self._broadcast_except(nickname, Message(
                type=MessageType.COMMAND, sender=nickname,
                payload={"command": CommandType.USER_JOINED, "nickname": nickname, "avatar_b64": avatar}
            ))
            return nickname

        # ── Auth: actualizar perfil ─────────────────────────────────────────
        if cmd == CommandType.UPDATE_PROFILE:
            nickname   = getattr(websocket, "nickname", None)
            new_pass   = msg.payload.get("password") or None
            avatar     = msg.payload.get("avatar_b64")
            if nickname:
                user_store.update_user(nickname, new_password=new_pass, avatar_b64=avatar)
                if avatar is not None and nickname in self.server.clients:
                    self.server.clients[nickname].avatar_b64 = avatar
                await websocket.send(Message(
                    type=MessageType.COMMAND, sender="server",
                    payload={"command": CommandType.AUTH_OK, "nickname": nickname}
                ).model_dump_json())
            return getattr(websocket, "nickname", None)

        # ── Registro sin autenticación (compatibilidad) ─────────────────────
        if cmd == CommandType.REGISTER:
            nick = msg.payload.get("nickname", "")
            if nick in self.server.clients:
                await websocket.send(Message(
                    type=MessageType.COMMAND, sender="server",
                    payload={"command": CommandType.REGISTER_FAIL, "reason": "Nickname taken"}
                ).model_dump_json())
                return None
            self.server.clients[nick] = ClientInfo(nickname=nick, websocket=websocket)
            websocket.nickname = nick
            await websocket.send(Message(
                type=MessageType.COMMAND, sender="server",
                payload={"command": CommandType.REGISTER_OK, "nickname": nick}
            ).model_dump_json())
            await self._broadcast_except(nick, Message(
                type=MessageType.COMMAND, sender=nick,
                payload={"command": CommandType.USER_JOINED, "nickname": nick, "avatar_b64": ""}
            ))
            return nick

        # ── Lista de usuarios ───────────────────────────────────────────────
        if cmd == CommandType.LIST_USERS:
            users_data = user_store.get_profiles(list(self.server.clients.keys()))
            await websocket.send(Message(
                type=MessageType.COMMAND, sender="server",
                payload={"command": CommandType.USER_LIST, "users_data": users_data}
            ).model_dump_json())

        # ── Reenvíos de chat ────────────────────────────────────────────────
        elif cmd in (CommandType.REQUEST_CHAT, CommandType.ACCEPT_CHAT,
                     CommandType.REJECT_CHAT, CommandType.END_CHAT):
            target = msg.payload.get("target")
            if target in self.server.clients:
                await self.server.clients[target].websocket.send(msg.model_dump_json())

        return getattr(websocket, "nickname", None)

    # ── Mensajes de texto y binario ─────────────────────────────────────────

    async def _handle_text(self, msg: Message):
        sender = msg.sender
        target = msg.payload.get("target")

        if not target or target not in self.server.clients:
            return

        # Lógica de emparejamiento / chat asíncrono
        contacts = user_store.get_contacts(sender)
        pending  = user_store.get_pending_incoming(sender)

        if target in contacts:
            pass  # Ya son contactos, ignorar control
        elif target in pending:
            # sender contesta al saludo de target -> Aceptar contacto
            user_store.remove_pending(sender, target)
            user_store.add_contact(sender, target)
            
            target_profile = user_store.get_profiles([target])
            target_data = target_profile[0] if target_profile else {"username": target, "avatar_b64": ""}
            sender_profile = user_store.get_profiles([sender])
            sender_data = sender_profile[0] if sender_profile else {"username": sender, "avatar_b64": ""}

            # Notificar a 'sender' que ganó a 'target' de contacto
            await self.server.clients[sender].websocket.send(Message(
                type=MessageType.COMMAND, sender="server",
                payload={"command": CommandType.CONTACT_ACCEPTED, "contact_data": target_data}
            ).model_dump_json())
            
            # Notificar a 'target' que ganó a 'sender' de contacto
            await self.server.clients[target].websocket.send(Message(
                type=MessageType.COMMAND, sender="server",
                payload={"command": CommandType.CONTACT_ACCEPTED, "contact_data": sender_data}
            ).model_dump_json())
        else:
            # Primer saludo de sender a target  
            target_contacts = user_store.get_contacts(target)
            target_pending = user_store.get_pending_incoming(target)
            if sender not in target_contacts and sender not in target_pending:
                user_store.add_pending(target, sender)

        # Enviar mensaje al target
        await self.server.clients[target].websocket.send(msg.model_dump_json())

    async def _handle_binary(self, msg: Message):
        target = msg.payload.get("target")
        if target in self.server.clients:
            await self.server.clients[target].websocket.send(msg.model_dump_json())

    # ── Broadcast ───────────────────────────────────────────────────────────

    async def _broadcast_except(self, exclude: str, msg: Message):
        """Envía un mensaje a todos los clientes excepto al indicado."""
        for nick, client in self.server.clients.items():
            if nick != exclude:
                try:
                    await client.websocket.send(msg.model_dump_json())
                except Exception:
                    pass

    async def broadcast_user_left(self, nickname: str):
        """Broadcast USER_LEFT cuando un cliente se desconecta."""
        await self._broadcast_except(nickname, Message(
            type=MessageType.COMMAND, sender=nickname,
            payload={"command": CommandType.USER_LEFT, "nickname": nickname}
        ))
