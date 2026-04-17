import { Routes } from '@angular/router';
import { AuthChildGuard } from './services/auth.guard';

export const routes: Routes = [
  // 🔓 Rotas públicas
  {
    path: 'login',
    loadComponent: () =>
      import('./components/login/login').then(m => m.LoginComponent)
  },

  // 🔐 Grupo protegido
  {
    path: '',
    canActivateChild: [AuthChildGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'criacao-os' },

      // 🧩 Admin
      {
        path: 'cadastro-confeccao',
        loadComponent: () =>
          import('./components/cadastro-confeccao/cadastro-confeccao').then(m => m.CadastroConfeccao),
        data: { roles: ['admin'] }
      },
      {
        path: 'cadastro-produto',
        loadComponent: () =>
          import('./components/cadastro-produto/cadastro-produto').then(m => m.CadastroProduto),
        data: { roles: ['admin'] }
      },
      {
        path: 'financeiro',
        loadComponent: () =>
          import('./components/financeiro/financeiro').then(m => m.Financeiro),
        data: { roles: ['admin'] }
      },
      {
        path: 'cadastro-materiais',
        loadComponent: () =>
          import('./components/cadastro-materiais/cadastro-materiais')
            .then(m => m.CadastroMateriaisComponent),
        data: { roles: ['admin'] }
      },
      {
        path: 'cargas',
        loadComponent: () =>
          import('./components/cargas/cargas').then(m => m.CargasComponent),
        data: { roles: ['admin'] }
      },
      {
        path: 'estoque-sp',
        loadComponent: () =>
          import('./components/estoque-sp/estoque-sp')
            .then(m => m.EstoqueSpComponent),
        data: { roles: ['admin'] }
      },
      {
        path: 'vale-pedido-sp',
        loadComponent: () =>
          import('./components/vale-pedido-sp/vale-pedido-sp')
            .then(m => m.ValePedidoSpComponent),
        data: { roles: ['admin'] }
      },

      // 🆕 CLIENTES + VENDEDORES
      {
        path: 'cliente-lista',
        loadComponent: () =>
          import('./components/cliente-lista/cliente-lista')
            .then(m => m.ClienteListaComponent),
        data: { roles: ['admin'] }
      },
      {
        path: 'vendedor-lista',
        loadComponent: () =>
          import('./components/vendedor-lista/vendedor-lista')
            .then(m => m.VendedorListaComponent),
        data: { roles: ['admin'] }
      },

      // 🧮 Admin + User
      {
        path: 'criacao-os',
        loadComponent: () =>
          import('./components/criacao-os/criacao-os').then(m => m.CriacaoOsComponent),
        data: { roles: ['admin', 'user'] }
      },
      // ROTA DE EDIÇÃO ADICIONADA AQUI:
      {
        path: 'editar-os/:id',
        loadComponent: () =>
          import('./components/criacao-os/criacao-os').then(m => m.CriacaoOsComponent),
        data: { roles: ['admin', 'user'] }
      },
      {
        path: 'retorno-os',
        loadComponent: () =>
          import('./components/retorno-os/retorno-os').then(m => m.RetornoOsComponent),
        data: { roles: ['admin'] }
      },
      {
        path: 'envio-materiais',
        loadComponent: () =>
          import('./components/envio-materiais/envio-materiais')
            .then(m => m.EnvioMateriaisComponent),
        data: { roles: ['admin', 'user'] }
      },
      {
        path: 'estoque',
        loadComponent: () =>
          import('./components/estoque/estoque').then(m => m.Estoque),
        data: { roles: ['admin', 'user'] }
      },

      // 📄 Relatório (individual)
      {
        path: 'relatorio-os/:id',
        loadComponent: () =>
          import('./components/relatorio-os/relatorio-os')
            .then(m => m.RelatorioOsComponent),
        data: { roles: ['admin', 'user'] }
      },
      // 📄 Relatório duplo (dois IDs via query param ?ids=1,2)
      {
        path: 'relatorio-os',
        loadComponent: () =>
          import('./components/relatorio-os/relatorio-os')
            .then(m => m.RelatorioOsComponent),
        data: { roles: ['admin', 'user'] }
      }
    ]
  },

  // 🚧 Fallback
  { path: '**', redirectTo: 'login' }
];