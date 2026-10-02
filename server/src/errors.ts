import type { FastifyReply } from 'fastify';
import type { ErrorCode, ErrorResponse } from '../../shared/api';

/** Sends the shared error shape: {error: {code, message}}. */
export function sendError(reply: FastifyReply, status: number, code: ErrorCode, message: string) {
  const body: ErrorResponse = { error: { code, message } };
  return reply.code(status).send(body);
}
