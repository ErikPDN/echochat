export const fromGrpcContentType = (
  ct: MessageGrpc.ContentType,
): DomainContentType => {
  return MessageGrpc.ContentType[ct] as DomainContentType;
};
