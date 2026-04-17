// src/app/services/api.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environments';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private baseUrl = (environment.apiUrl || '').replace(/\/+$/, ''); // remove trailing slash se houver

  constructor(private http: HttpClient) {}

  private buildUrl(endpoint: string) {
    endpoint = endpoint.replace(/^\/+/, ''); // remove leading slash do endpoint
    return `${this.baseUrl}/${endpoint}`;
  }

  private authHeaders(): { headers: HttpHeaders } {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });

    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return { headers };
  }

  get<T = any>(endpoint: string, params?: Record<string, string | number | boolean>): Observable<T> {
    const url = this.buildUrl(endpoint);
    console.log(
      '[APISERVICE] GET',
      url,
      'token(session):',
      sessionStorage.getItem('token'),
      'token(local):',
      localStorage.getItem('token')
    );

    let httpParams: HttpParams | undefined;
    if (params) {
      httpParams = new HttpParams();
      Object.keys(params).forEach(k => {
        const v = params[k];
        if (v !== undefined && v !== null) httpParams = httpParams!.set(k, String(v));
      });
    }

    return this.http.get<T>(url, { ...this.authHeaders(), params: httpParams });
  }

  post<T = any>(endpoint: string, data: any): Observable<T> {
    const url = this.buildUrl(endpoint);
    return this.http.post<T>(url, data, this.authHeaders());
  }

  put<T = any>(endpoint: string, data: any): Observable<T> {
    const url = this.buildUrl(endpoint);
    return this.http.put<T>(url, data, this.authHeaders());
  }

  patch<T = any>(endpoint: string, data?: any): Observable<T> {
    const url = this.buildUrl(endpoint);
    return this.http.patch<T>(url, data === undefined ? null : data, this.authHeaders());
  }

  delete<T = any>(endpoint: string): Observable<T> {
    const url = this.buildUrl(endpoint);
    return this.http.delete<T>(url, this.authHeaders());
  }
}
