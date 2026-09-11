import { join } from 'path';
import { Observable } from 'rxjs';
import {
  ConversationParticipantResponse,
  MemberResponse,
} from '../interfaces/conversation-participant-response.interface';
import { GetConversationsParticipantsRequestDto } from '../dto/get-conversations-participants-request.dto';

export const CHAT_GRPC_PACKAGE = 'chat';
export const CHAT_GRPC_SERVICE = 'ChatService';
export const chatProtoPath = join(__dirname, 'proto/chat.proto');

export type MemberGrpc = Omit<MemberResponse, 'lastReadAt'> & {
  lastReadAt: string;
};

export interface ConversationParticipantsGrpc extends Omit<
  ConversationParticipantResponse,
  'members'
> {
  members: MemberGrpc[];
}

export interface GetConversationsParticipantsResponseDto {
  conversations: ConversationParticipantsGrpc[];
}

export interface ChatGrpcClient {
  getConversationsParticipants(
    req: GetConversationsParticipantsRequestDto,
  ): Observable<GetConversationsParticipantsResponseDto>;
}
