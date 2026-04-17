// src/app/services/auth.interceptor.ts
import { HttpRequest, HttpHandlerFn, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { inject } from '@angular/core';
import { Router } from '@angular/router';

function getTokenFromStorage(): string | null {
  return sessionStorage.getItem('token') || localStorage.getItem('token') || null;
}

// função para decodificar JWT e pegar payload
function parseJwt(token: string): any | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    let payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (payload.length % 4) payload += '=';
    const decoded = atob(payload);
    const json = decodeURIComponent(Array.prototype.map.call(decoded, (c: string) =>
      '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
    ).join(''));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function authInterceptor(req: HttpRequest<any>, next: HttpHandlerFn): Observable<HttpEvent<any>> {
  const router = inject(Router);

  const token = getTokenFromStorage();
  console.log('[INTERCEPTOR] chamado para:', req.url);
  console.log('[INTERCEPTOR] token encontrado:', token);

  if (!token) {
    console.warn('[INTERCEPTOR] nenhum token disponível para anexar ao request:', req.url);
    return next(req);
  }

  // pega a role do token
  const payload = parseJwt(token);
  const userRole = payload?.role;
  console.log('[INTERCEPTOR] role do usuário detectada:', userRole);

  const authReq = req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  });

  console.log('[INTERCEPTOR] header Authorization anexado para', req.url, '=>', authReq.headers.get('Authorization'));
  return next(authReq);
}
