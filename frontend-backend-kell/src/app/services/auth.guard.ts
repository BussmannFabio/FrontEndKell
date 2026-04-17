// src/app/services/auth.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, CanActivateChildFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

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

function readTokenFromStorage(): string | null {
  // manter compat com onde você grava: prioriza sessionStorage, mas também verifica localStorage
  return sessionStorage.getItem('token') || localStorage.getItem('token') || null;
}

function checkAccess(allowedRoles: string[] = []): { ok: boolean; reason?: string; payload?: any } {
  const token = readTokenFromStorage();
  if (!token) return { ok: false, reason: 'no-token' };

  const payload = parseJwt(token);
  if (!payload) return { ok: false, reason: 'invalid-token' , payload: null};

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) return { ok: false, reason: 'expired', payload };

  // role pode estar em payload.role ou payload.roles — adaptação
  const role = (payload.role ?? payload.roles ?? '').toString();

  if (!allowedRoles || allowedRoles.length === 0) {
    // sem restrição específica => permitir
    return { ok: true, payload };
  }

  // comparar sem case-sensitive
  const roleLower = role?.toLowerCase();
  const allowedLower = allowedRoles.map(r => r.toLowerCase());

  if (!roleLower || !allowedLower.includes(roleLower)) {
    return { ok: false, reason: 'forbidden', payload };
  }

  return { ok: true, payload };
}

/**
 * Guard usado diretamente em rotas que tenham `canActivate: [AuthGuard]`.
 * Nota: quando usado no pai, route.data refere-se ao pai (veja nota abaixo).
 */
export const AuthGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state?: RouterStateSnapshot) => {
  const router = inject(Router);

  const allowedRoles: string[] = route.data?.['roles'] || [];

  console.log('[AuthGuard] verificando rota:', route.routeConfig?.path, 'rolesEsperadas:', allowedRoles);

  const result = checkAccess(allowedRoles);

  if (!result.ok) {
    console.warn('[AuthGuard] acesso negado:', result.reason, 'payload:', result.payload);
    // agir conforme o erro
    if (result.reason === 'no-token' || result.reason === 'invalid-token' || result.reason === 'expired') {
      // limpar e redirecionar para login
      localStorage.removeItem('token');
      sessionStorage.removeItem('token');
      router.navigate(['/login']);
    } else {
      // sem permissão -> redirecionar para home
      alert('Você não tem permissão para acessar esta página.');
      router.navigate(['/']);
    }
    return false;
  }

  // permitido
  console.log('[AuthGuard] permitido, payload:', result.payload);
  return true;
};

/**
 * Guard para proteger rotas filhas: válido para usar em canActivateChild do pai.
 * Ele recebe o snapshot do filho (childRoute) e consegue ler childRoute.data.roles.
 */
export const AuthChildGuard: CanActivateChildFn = (childRoute: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  const router = inject(Router);

  const allowedRoles: string[] = childRoute.data?.['roles'] || [];

  console.log('[AuthChildGuard] verificando childRoute:', childRoute.routeConfig?.path, 'rolesEsperadas:', allowedRoles);

  const result = checkAccess(allowedRoles);

  if (!result.ok) {
    console.warn('[AuthChildGuard] acesso negado:', result.reason, 'payload:', result.payload);
    if (result.reason === 'no-token' || result.reason === 'invalid-token' || result.reason === 'expired') {
      localStorage.removeItem('token');
      sessionStorage.removeItem('token');
      router.navigate(['/login']);
    } else {
      alert('Você não tem permissão para acessar esta página.');
      router.navigate(['/']);
    }
    return false;
  }

  console.log('[AuthChildGuard] permitido, payload:', result.payload);
  return true;
};
