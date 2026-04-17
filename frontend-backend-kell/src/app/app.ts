import { Component, signal, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ApiHealthService } from './services/api-health'; // Verifique se o caminho está correto

@Component({
  selector: 'app-root',
  standalone: true, // Garante que é standalone
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  protected readonly title = signal('frontend-backend-kell');
  
  // Injeta o serviço de saúde da API
  private healthService = inject(ApiHealthService);

  ngOnInit() {
    this.checkServerConnection();
  }

  checkServerConnection() {
    this.healthService.check().subscribe({
      next: (res) => {
        console.log('✅ Conectado ao Backend:', res);
      },
      error: (err) => {
        console.error('❌ Falha na conexão com o servidor:', err);
        alert('ERRO DE REDE: O Frontend não conseguiu conversar com o Backend no IP configurado. Verifique se o servidor Node está rodando.');
      }
    });
  }
}