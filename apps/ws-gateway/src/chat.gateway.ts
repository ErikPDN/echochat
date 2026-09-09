import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { MessageClientService } from './message-client/message-client.service';
import { Server, Socket } from 'socket.io';
import { AuthenticatedUser } from '@app/common';
import { WS_EVENTS, WsSendMessageDto } from '@app/contracts';
import { ChatClientService } from './chat-client/chat-client.service';

@WebSocketGateway({ cors: { origin: process.env.FRONTEND_URL } })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ChatGateway.name);

  @WebSocketServer() private readonly server!: Server;

  constructor(
    private readonly messageClient: MessageClientService,
    private readonly chatClient: ChatClientService,
  ) {}

  async handleConnection(client: Socket) {
    const user = client.data.user as AuthenticatedUser;
    await client.join(`user:${user.userId}`);
    this.logger.log(`${user.username} connected with (${client.id})`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage(WS_EVENTS.CONVERSATION_JOIN)
  async join(
    @ConnectedSocket() client: Socket,
    @MessageBody() conversationId: string,
  ) {
    const user = client.data.user as AuthenticatedUser;

    const isMember = await this.chatClient.isConversationMember(
      conversationId,
      user.userId,
    );

    if (!isMember)
      throw new WsException(
        `User ${user.username} is not a member of conversation ${conversationId}`,
      );

    await client.join(`conversation:${conversationId}`);
    this.logger.log(`${user.username} joined conversation ${conversationId}`);

    return { joined: conversationId };
  }

  @SubscribeMessage(WS_EVENTS.CONVERSATION_LEAVE)
  async leave(
    @ConnectedSocket() client: Socket,
    @MessageBody() conversationId: string,
  ) {
    const user = client.data.user as AuthenticatedUser;
    await client.leave(`conversation:${conversationId}`);
    this.logger.log(`${user.username} left conversation ${conversationId}`);

    return { left: conversationId };
  }

  @SubscribeMessage(WS_EVENTS.MESSAGE_SEND)
  async send(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: WsSendMessageDto,
  ) {
    const { conversationId, ...dto } = body;
    const token = client.data.token as string;
    const message = await this.messageClient.sendMessage(
      conversationId,
      dto,
      token,
    );
    try {
      const [conv] = await this.chatClient.getConversationsParticipants([
        conversationId,
      ]);

      const rooms = conv.members.map((member) => `user:${member.userId}`);
      this.server.to(rooms).emit(WS_EVENTS.MESSAGE_NEW, message);
    } catch (err) {
      this.logger.error(
        `Failed to emit message to conversation ${conversationId}: ${err.message}`,
      );
    }
  }
}
