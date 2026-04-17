import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environments'; // Ajuste o caminho se necessário

@Injectable({
  providedIn: 'root'
})
export class ApiHealthService {
  private http = inject(HttpClient);

  check() {
    // Tenta acessar o endpoint /health que você criou no Node
    return this.http.get(`${environment.apiUrl}/health`);
  }
}