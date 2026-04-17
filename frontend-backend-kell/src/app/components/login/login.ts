// src/app/components/login.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="login-container">
      <h2>Login</h2>
      <form [formGroup]="form" (ngSubmit)="onSubmit()">
        <label>Usuário</label>
        <input type="text" formControlName="nome" />

        <label>Senha</label>
        <input type="password" formControlName="senha" />

        <button type="submit" [disabled]="form.invalid">Entrar</button>
      </form>

      <p *ngIf="mensagem" [ngClass]="{'success': sucesso, 'error': !sucesso}">
        {{ mensagem }}
      </p>

    </div>
  `,
  styles: [`
    .login-container { max-width: 350px; margin: 50px auto; padding: 20px; border: 1px solid #ccc; border-radius: 8px; background: #fff; box-shadow: 0 2px 5px rgba(0,0,0,0.1); text-align: center; }
    h2 { margin-bottom: 15px; }
    label { display: block; margin-top: 10px; font-weight: bold; }
    input { width: 100%; padding: 8px; margin-top: 5px; border: 1px solid #ccc; border-radius: 4px; }
    button { margin-top: 15px; width: 100%; background: #007bff; color: #fff; border: none; padding: 10px; border-radius: 4px; cursor: pointer; }
    button:disabled { background: #aaa; cursor: not-allowed; }
    .register-btn { background: #28a745; margin-top: 10px; }
    .success { color: green; margin-top: 10px; font-weight: bold; }
    .error { color: red; margin-top: 10px; font-weight: bold; }
  `]
})
export class LoginComponent implements OnInit {
  form!: FormGroup;
  mensagem = '';
  sucesso = false;

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private router: Router
  ) {}

  ngOnInit() {
    this.form = this.fb.group({
      nome: ['', Validators.required],
      senha: ['', Validators.required]
    });
  }

  onSubmit() {
  if (this.form.invalid) return;

  this.api.post('/auth/login', this.form.value).subscribe({
    next: (res: any) => {
      this.sucesso = true;
      this.mensagem = 'Login realizado com sucesso!';

      // --- salva token ---
      if (res?.token) {
        sessionStorage.setItem('token', res.token);
        console.log('[LOGIN] token salvo em sessionStorage');
      } else {
        console.warn('[LOGIN] resposta sem token');
      }

      // --- salva objeto do usuário (para podermos recuperar a role) ---
      const usuario = res?.usuario ?? res?.user ?? null;
      if (usuario) {
        try {
          sessionStorage.setItem('user', JSON.stringify(usuario));
          console.log('[LOGIN] usuário salvo em sessionStorage:', usuario);
        } catch (err) {
          console.error('[LOGIN] erro ao salvar usuário no storage:', err);
        }
      } else {
        console.warn('[LOGIN] resposta não contém objeto de usuário (usuario/user)');
      }

      // --- redireciona e recarrega ---
      setTimeout(() => {
        this.router.navigate(['/criacao-os']).then(() => {
          // 🔄 Recarrega a página para atualizar sidebar/função logada
          window.location.reload();
        });
      }, 0);
    },
    error: err => {
      this.sucesso = false;
      this.mensagem = err.error?.error || 'Erro ao realizar login';
    }
  });
}

}
