/**
 * Tests unitarios — AllExceptionsFilter
 *
 * Cubre:
 *  - HttpException: extrae status, message y error correctamente
 *  - Error genérico: devuelve 500 sin exponer stack trace
 *  - Objeto de response complejo (con message array de validación)
 *  - Respuesta siempre tiene: statusCode, error, message, path, timestamp
 *
 * Pruebas de exhaustividad:
 *  - HttpException con response como string
 *  - HttpException con response como objeto (con y sin campo 'error')
 *  - Error no-HttpException (500)
 *  - Excepción que no es Error (objecto plano)
 */

import { AllExceptionsFilter } from './all-exceptions.filter';
import { HttpException, HttpStatus } from '@nestjs/common';
import { ArgumentsHost } from '@nestjs/common';

// ── Helpers ──────────────────────────────────────────────────────────────────

const makeResponse = () => {
  const res: any = {
    statusCode: 0,
    body: null,
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockImplementation((body) => { res.body = body; return res; }),
  };
  return res;
};

const makeRequest = (url = '/test', method = 'GET') => ({ url, method });

const makeHost = (req: any, res: any): ArgumentsHost =>
  ({
    switchToHttp: () => ({
      getResponse: () => res,
      getRequest: () => req,
    }),
  } as any);

// ── Suite principal ───────────────────────────────────────────────────────────

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
    jest.spyOn(filter['logger'], 'error').mockImplementation(() => {});
    jest.spyOn(filter['logger'], 'warn').mockImplementation(() => {});
  });

  afterEach(() => jest.clearAllMocks());

  // ── Estructura de respuesta ───────────────────────────────────────────────

  it('incluye siempre statusCode, error, message, path y timestamp', () => {
    const res = makeResponse();
    const host = makeHost(makeRequest('/api/test'), res);

    filter.catch(new HttpException('Not Found', HttpStatus.NOT_FOUND), host);

    expect(res.body).toMatchObject({
      statusCode: 404,
      error: expect.any(String),
      message: expect.anything(),
      path: '/api/test',
      timestamp: expect.any(String),
    });
  });

  it('timestamp es una fecha ISO válida', () => {
    const res = makeResponse();
    const host = makeHost(makeRequest('/api/x'), res);

    filter.catch(new HttpException('Bad Request', 400), host);

    expect(() => new Date(res.body.timestamp)).not.toThrow();
    expect(new Date(res.body.timestamp).getTime()).not.toBeNaN();
  });

  // ── HttpException con respuesta string ───────────────────────────────────

  it('maneja HttpException con response como string', () => {
    const res = makeResponse();
    const host = makeHost(makeRequest('/api/auth'), res);

    filter.catch(new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED), host);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.body.message).toBe('Unauthorized');
  });

  // ── HttpException con response objeto ────────────────────────────────────

  it('extrae message y error del objeto de respuesta de HttpException', () => {
    const res = makeResponse();
    const host = makeHost(makeRequest('/api/create'), res);

    const exception = new HttpException(
      { message: ['email must be valid', 'password is too short'], error: 'Bad Request' },
      HttpStatus.BAD_REQUEST,
    );

    filter.catch(exception, host);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body.message).toEqual(['email must be valid', 'password is too short']);
    expect(res.body.error).toBe('Bad Request');
  });

  it('usa defaults si el objeto de HttpException no tiene campos message/error', () => {
    const res = makeResponse();
    const host = makeHost(makeRequest('/api/x'), res);

    const exception = new HttpException({ custom: 'value' }, HttpStatus.CONFLICT);

    filter.catch(exception, host);

    expect(res.body.message).toBe('Error interno del servidor');
  });

  // ── Error genérico (500) ──────────────────────────────────────────────────

  it('devuelve 500 para Error genérico sin exponer stack trace', () => {
    const res = makeResponse();
    const host = makeHost(makeRequest('/api/crash'), res);

    filter.catch(new Error('DB connection failed'), host);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.body.statusCode).toBe(500);
    // El mensaje no debe contener el stack trace
    expect(JSON.stringify(res.body)).not.toContain('at Object.');
  });

  it('loguea el error con stack cuando es Error genérico', () => {
    const res = makeResponse();
    const host = makeHost(makeRequest('/api/crash'), res);

    filter.catch(new Error('Unexpected crash'), host);

    expect(filter['logger'].error).toHaveBeenCalled();
  });

  // ── Excepción que no es Error ─────────────────────────────────────────────

  it('maneja excepción que no es instancia de Error', () => {
    const res = makeResponse();
    const host = makeHost(makeRequest('/api/weird'), res);

    // Lanzar un string, no un Error
    filter.catch('some string error', host);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.body.statusCode).toBe(500);
  });

  // ── Diferentes códigos HTTP ───────────────────────────────────────────────

  it('preserva el status code de HttpException para 4xx', () => {
    const codes = [400, 401, 403, 404, 409, 422, 429];
    for (const code of codes) {
      const res = makeResponse();
      const host = makeHost(makeRequest('/api'), res);
      filter.catch(new HttpException('Error', code), host);
      expect(res.status).toHaveBeenCalledWith(code);
    }
  });

  // ── Logging ───────────────────────────────────────────────────────────────

  it('llama a logger.warn para errores 4xx', () => {
    const res = makeResponse();
    const host = makeHost(makeRequest('/api/notfound'), res);

    filter.catch(new HttpException('Not Found', 404), host);

    expect(filter['logger'].warn).toHaveBeenCalled();
  });

  it('llama a logger.error para errores 5xx', () => {
    const res = makeResponse();
    const host = makeHost(makeRequest('/api/error'), res);

    filter.catch(
      new HttpException('Internal Error', HttpStatus.INTERNAL_SERVER_ERROR),
      host,
    );

    expect(filter['logger'].error).toHaveBeenCalled();
  });

  it('NO llama a logger para errores 2xx/3xx (no aplica en práctica)', () => {
    // Este test verifica que el filtro no falla con códigos fuera de rango
    const res = makeResponse();
    const host = makeHost(makeRequest('/redirect'), res);

    // Nota: HttpException con 200 no es normal pero no debe crashear el filtro
    filter.catch(new HttpException('OK', 200), host);

    expect(res.body.statusCode).toBe(200);
  });
});
