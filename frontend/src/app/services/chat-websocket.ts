import { Injectable } from '@angular/core';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client/dist/sockjs.js';
import { BehaviorSubject } from 'rxjs';
import { WS_URL } from '../config/api.config';

@Injectable({
  providedIn: 'root'
})
export class ChatWebSocketService {
  private client!: Client;
  private connected = false;
  private subscription!: StompSubscription;

  private mensajeSubject = new BehaviorSubject<any | null>(null);
  mensaje$ = this.mensajeSubject.asObservable();

  private mensajeGlobalSubject = new BehaviorSubject<any | null>(null);
  mensajeGlobal$ = this.mensajeGlobalSubject.asObservable();

  constructor() {}

  connect(idChat: number) {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }

    this.client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      debug: (str) => console.log(str),
      reconnectDelay: 5000
    });

    this.client.onConnect = () => {
      this.connected = true;
      console.log('Conectado a WebSocket');
      this.subscription = this.client.subscribe(`/topic/chat/${idChat}`, (msg: IMessage) => {
        const mensaje = JSON.parse(msg.body);
        this.agregarMensaje(mensaje);
        this.mensajeGlobalSubject.next(mensaje);
      });
    };

    this.client.activate();
  }

  disconnect() {
    if (this.client && this.connected) {
      if (this.subscription) this.subscription.unsubscribe();
      this.client.deactivate();
      this.connected = false;
      console.log('Desconectado de WebSocket');
    }
  }

  enviarMensaje(idChat: number, mensaje: any) {
    if (this.client && this.connected) {
      this.client.publish({
        destination: `/app/chat/${idChat}/enviar`,
        body: JSON.stringify(mensaje)
      });
    }
  }

  private agregarMensaje(mensaje: any) {
    this.mensajeSubject.next(mensaje);
  }

  limpiarMensajes() {
    this.mensajeSubject.next(null);
  }

  limpiarMensajesGlobal() {
    this.mensajeGlobalSubject.next(null);
  }
}
