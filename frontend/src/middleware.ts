import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Garante que todas as respostas HTML incluam charset=utf-8 no header Content-Type,
 * evitando que o browser interprete o conteúdo UTF-8 como Latin-1.
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  response.headers.set('Content-Type', 'text/html; charset=utf-8');
  return response;
}

export const config = {
  // Aplica apenas em rotas de página (exclui API, assets estáticos, uploads e favicon)
  matcher: ['/((?!api|_next/static|_next/image|uploads|favicon\\.ico).*)'],
};
