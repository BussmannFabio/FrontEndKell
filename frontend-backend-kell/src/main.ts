import { bootstrapApplication } from '@angular/platform-browser';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { routes } from './app/app.routes';

/* ------------ UTILS ------------ */
function safeParseJson(s: string | null): any {
  if (!s) return null;
  try { return JSON.parse(s); } catch { return null; }
}

function parseJwtPayload(token: string | null): any | null {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    let payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (payload.length % 4) payload += '=';
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

/* ------------ ROOT COMPONENT ------------ */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="container">
      <aside class="sidebar">
        <div class="sidebar-header">
          <strong>Kellynha App</strong>

          <div class="user-info" *ngIf="userName">
            Olá, {{ userName }} <span class="role">({{ userRole }})</span>
          </div>
        </div>

        <!-- ========== CADASTROS ==========
             Somente Admin
        -->
        <div class="menu-group" *ngIf="isAdmin">
          <h3 (click)="toggle('cad')">
            📦 Cadastros <span class="arrow">{{ open.cad ? '▲' : '▼' }}</span>
          </h3>

          <ul *ngIf="open.cad">
            <li><a routerLink="/cadastro-confeccao" routerLinkActive="active">Confecção</a></li>
            <li><a routerLink="/cadastro-produto" routerLinkActive="active">Produto</a></li>
            <li><a routerLink="/cadastro-materiais" routerLinkActive="active">Materiais</a></li>
            <li><a routerLink="/cliente-lista" routerLinkActive="active">Clientes</a></li>
            <li><a routerLink="/vendedor-lista" routerLinkActive="active">Vendedores</a></li>
          </ul>
        </div>

        <!-- ========== LOGÍSTICA ==========
             Somente Admin
        -->
        <div class="menu-group" *ngIf="isAdmin">
          <h3 (click)="toggle('log')">
            🚚 Logística <span class="arrow">{{ open.log ? '▲' : '▼' }}</span>
          </h3>

          <ul *ngIf="open.log">
            <li><a routerLink="/cargas" routerLinkActive="active">Cargas</a></li>
            <li><a routerLink="/estoque-sp" routerLinkActive="active">Estoque - SP</a></li>
            <li><a routerLink="/vale-pedido-sp" routerLinkActive="active">Pedidos - SP</a></li>
          </ul>
        </div>

        <!-- ========== PRODUÇÃO ==========
             Todos vêem, mas Retorno OS só admin
        -->
        <div class="menu-group">
          <h3 (click)="toggle('prod')">
            🧵 Produção <span class="arrow">{{ open.prod ? '▲' : '▼' }}</span>
          </h3>

          <ul *ngIf="open.prod">
            <li><a routerLink="/criacao-os" routerLinkActive="active">Criação OS</a></li>

            <li *ngIf="isAdmin">
              <a routerLink="/retorno-os" routerLinkActive="active">Retorno OS</a>
            </li>

            <li><a routerLink="/envio-materiais" routerLinkActive="active">Envio Materiais</a></li>
          </ul>
        </div>

        <!-- ========== ESTOQUE ==========
             Todos os usuários
        -->
        <div class="menu-group">
          <h3 (click)="toggle('est')">
            📊 Estoque <span class="arrow">{{ open.est ? '▲' : '▼' }}</span>
          </h3>

          <ul *ngIf="open.est">
            <li><a routerLink="/estoque" routerLinkActive="active">Estoque Geral</a></li>
          </ul>
        </div>

        <!-- ========== FINANCEIRO ==========
             Somente Admin
        -->
        <div class="menu-group" *ngIf="isAdmin">
          <h3 (click)="toggle('fin')">
            💰 Financeiro <span class="arrow">{{ open.fin ? '▲' : '▼' }}</span>
          </h3>

          <ul *ngIf="open.fin">
            <li><a routerLink="/financeiro" routerLinkActive="active">Financeiro</a></li>
          </ul>
        </div>
      </aside>

      <main class="content">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    .container { display: flex; height: 100vh; font-family: Arial, sans-serif; }
    .sidebar { width: 260px; background: #1f2937; color: #fff; padding: 20px; overflow-y: auto; }

    .sidebar-header { margin-bottom: 20px; }
    .user-info { margin-top: 8px; font-size: 13px; color: #9ca3af; }
    .user-info .role { color:#fbbf24; font-weight:600; margin-left:6px; }

    .menu-group { margin-bottom: 18px; }
    .menu-group h3 {
      font-size: 14px;
      color: #9ca3af;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      user-select: none;
    }

    .menu-group ul {
      list-style: none !important;
      padding-left: 0 !important;
      margin: 0;
    }

    .menu-group li { margin-bottom: 6px; }

    .menu-group a {
      display: block;
      padding: 8px 12px;
      color: #fff;
      text-decoration: none;
      border-radius: 6px;
      transition: background 0.15s, color 0.15s;
    }

    .menu-group a:hover {
      background: #374151;
      color: #fbbf24;
    }

    .menu-group a.active {
      background: #2563eb;
      font-weight: bold;
    }

    .arrow {
      color: #fbbf24;
      font-weight: bold;
    }

    .content {
      flex: 1;
      padding: 30px;
      overflow-y: auto;
      background: #f5f5f5;
    }
  `]
})
export class Root implements OnInit, OnDestroy {

  userRole: 'admin' | 'user' | 'guest' = 'guest';
  userName: string | null = null;

  open = {
    cad: false,
    log: false,
    prod: true,  // produção aberta por padrão
    est: false,
    fin: false,
  };

  toggle(section: keyof typeof this.open) {
    this.open[section] = !this.open[section];
  }

  private storageListener = (ev: StorageEvent) => {
    if (ev.key === 'token' || ev.key === 'user') {
      this.updateUserFromStorage();
    }
  };

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.updateUserFromStorage();
    window.addEventListener('storage', this.storageListener);
  }

  ngOnDestroy(): void {
    window.removeEventListener('storage', this.storageListener);
  }

  private updateUserFromStorage(): void {
    const sessUser = safeParseJson(sessionStorage.getItem('user'));
    const localUser = safeParseJson(localStorage.getItem('user'));
    const storedUser = sessUser ?? localUser;

    if (storedUser && storedUser.role) {
      const role = storedUser.role.toLowerCase();
      this.userRole = role === 'admin' ? 'admin' : 'user';
      this.userName = storedUser.nome ?? storedUser.name ?? null;
      return;
    }

    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    const payload = parseJwtPayload(token);

    if (payload && (payload.role || payload.roles)) {
      const role = (payload.role ?? payload.roles).toLowerCase();
      this.userRole = role === 'admin' ? 'admin' : 'user';
      this.userName = payload.nome ?? payload.name ?? null;
      return;
    }

    this.userRole = 'guest';
    this.userName = null;
  }

  get isAdmin(): boolean {
    return this.userRole === 'admin';
  }
}

/* ------------ BOOTSTRAP ------------ */
bootstrapApplication(Root, {
  providers: [
    provideRouter(routes),
    provideHttpClient()
  ]
});
