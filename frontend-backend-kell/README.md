FrontEndKell – Aplicação Angular
📋 Visão Geral
O FrontEndKell é a camada de frontend do sistema Kellynha App, desenvolvido em Angular 20 usando standalone components.
 Ele se integra à API BackEndKell para gerenciar usuários, produtos, materiais, confecções, ordens de serviço, estoque e financeiro.

🗂️ Estrutura de Pastas
src/app/
│
├── components/          # Componentes standalone por módulo
│   ├── auth/            # Login e cadastro de usuários
│   ├── users/           # Gerenciamento de usuários (Admin)
│   ├── confeccoes/      # Cadastro de confecções
│   ├── produtos/        # Cadastro de produtos
│   ├── materiais/       # Cadastro de materiais
│   ├── ordens/          # Criação e retorno de OS
│   ├── movimentar-estoque/ # Entrada/saída de materiais
│   ├── financeiro/      # Relatórios financeiros (Admin)
│   └── estoque/         # Consulta de estoque atual
│
├── services/            # Serviços de comunicação com API
│   ├── api.service.ts
│   ├── auth.service.ts
│   ├── produtos.service.ts
│   ├── materiais.service.ts
│   └── movimentacoes.service.ts
│
├── guards/              # Guards de autenticação e roles
├── interceptors/        # Interceptores HTTP para JWT e logs
├── app.routes.ts        # Rotas da aplicação
└── main.ts              # Bootstrap do app e root component


⚙️ Dependências Principais
Pacote
Função
@angular/*
Framework Angular 20 (core, forms, router, common)
rxjs
Programação reativa e manipulação de streams
html2canvas
Captura de tela para geração de PDFs
jspdf
Geração de arquivos PDF
jwt-decode
Decodificação de tokens JWT
zone.js
Gerenciamento de zonas Angular
tslib
Helpers TypeScript


🧩 Rotas Principais
O frontend possui rotas públicas e protegidas:
Rotas Públicas
/login – Tela de login


/cadastro-user – Cadastro de novo usuário


Rotas Protegidas (necessário login com JWT)
Admin apenas:


/cadastro-confeccao – Confecções


/cadastro-produto – Produtos


/cadastro-materiais – Materiais


/financeiro – Relatórios financeiros


Admin e Usuário:


/criacao-os – Criação de ordens de serviço


/retorno-os – Retorno de OS


/envio-materiais – Movimentação de materiais


/estoque – Consulta de estoque


/relatorio-os/:id – Relatório detalhado da OS



🔐 Autenticação e Roles
O app utiliza JWT para autenticação.


O token é armazenado em localStorage ou sessionStorage.


Guards (AuthChildGuard) verificam se o usuário possui acesso à rota.


O root component (Root) mostra dinamicamente o nome e role do usuário na sidebar.



🚀 Instalação e Execução
Instalar dependências


npm install

Iniciar aplicação em modo dev


npm start

Build de produção


npm run build

A aplicação será acessível em:


http://localhost:4200

Certifique-se de que o backend BackEndKell esteja ativo e acessível em http://192.168.10.19:3000.

🎨 Estilização
Sidebar fixa com navegação por módulo


Área principal de conteúdo dinâmica via router-outlet


Cores base: #1f2937 (sidebar), #f5f5f5 (conteúdo), links ativos em #2563eb



📄 Boas práticas
Utilize apenas tokens válidos para acessar rotas protegidas


Evite manipulação direta de localStorage sem validação


Mantenha o backend ativo para que o frontend funcione corretamente



📄 Licença
Este projeto é de uso interno da Kellynha Ltda, desenvolvido para integração com BackEndKell e gestão de produção, estoque e financeiro.

