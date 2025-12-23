# Guía de Conexión Gemini-Ollama

Esta guía documenta cómo un agente (como Gemini) o un desarrollador puede conectarse a la instancia de Ollama hospedada a través del proxy de autenticación segura.

## Resumen del Sistema

El sistema expone un servidor Ollama estándar, pero protegido por un proxy ligero (`auth_proxy.py`) que requiere una API Key para autorizar las peticiones. 

- **URL Base Pública**: La URL proporcionada por ngrok (ej. `https://tu-url-ngrok.ngrok-free.app`)
- **Puerto Interno**: 8000 (donde corre el proxy)
- **Mecanismo de Auth**: Header HTTP personalizado

## Autenticación

Todas las peticiones deben incluir el siguiente header:

- **Nombre del Header**: `x-api-key`
- **Valor**: La clave API configurada en el servidor (por defecto para pruebas: `cultivadatos-secret-key-123`, en producción se debe leer la variable de entorno `OLLAMA_API_KEY`).

Si este header falta o es incorrecto, el proxy retornará un error `403 Forbidden`.

## Endpoints Disponibles

El proxy reenvía todas las peticiones a la instancia local de Ollama (`localhost:11434`). Por lo tanto, todos los endpoints estándar de la API de Ollama están disponibles.

### 1. Generar Completaciones (Generate)
Para completar texto simple.

- **Método**: `POST`
- **Path**: `/api/generate`
- **Body**: JSON estándar de Ollama (model, prompt, stream, etc.)

### 2. Chat Interactivo (Chat)
Para conversaciones tipo chat.

- **Método**: `POST`
- **Path**: `/api/chat`
- **Body**: JSON con lista de mensajes.

### 3. Listar Modelos
Ver qué modelos están disponibles.

- **Método**: `GET`
- **Path**: `/api/tags`

## Ejemplos de Código (Python)

A continuación se muestra cómo configurar un cliente en Python para conectarse de forma segura.

### Ejemplo 1: Consulta Básica (Sin Streaming)

```python
import requests

# Configuración
BASE_URL = "https://tu-url-ngrok.ngrok-free.app" # Reemplazar con la URL real
API_KEY = "cultivadatos-secret-key-123"

headers = {
    "x-api-key": API_KEY,
    "Content-Type": "application/json"
}

payload = {
    "model": "llama3",  # Asegúrate de usar un modelo que exista en el servidor
    "prompt": "¿Por qué el cielo es azul?",
    "stream": False
}

try:
    response = requests.post(f"{BASE_URL}/api/generate", json=payload, headers=headers)
    response.raise_for_status()
    print("Respuesta:", response.json()["response"])
except requests.exceptions.RequestException as e:
    print(f"Error en la petición: {e}")
```

### Ejemplo 2: Chat con Streaming

Este es el método recomendado para agentes, ya que permite procesar la respuesta token por token.

```python
import requests
import json

BASE_URL = "https://tu-url-ngrok.ngrok-free.app"
API_KEY = "cultivadatos-secret-key-123"

headers = {
    "x-api-key": API_KEY
}

current_messages = [
    {"role": "user", "content": "Escribe un poema corto sobre la minería de datos."}
]

payload = {
    "model": "llama3",
    "messages": current_messages,
    "stream": True
}

print("Gemini (Agente) consultando a Ollama...\n")

with requests.post(f"{BASE_URL}/api/chat", json=payload, headers=headers, stream=True) as r:
    r.raise_for_status()
    
    # Procesar el stream línea por línea
    for line in r.iter_lines():
        if line:
            decoded_line = line.decode('utf-8')
            try:
                data = json.loads(decoded_line)
                if "message" in data:
                    content = data["message"].get("content", "")
                    print(content, end="", flush=True)
                
                if data.get("done"):
                    print("\n\n[Fin de la transmisión]")
            except json.JSONDecodeError:
                pass
```

## Solución de Problemas

- **403 Unauthorized**: Verifica que el header `x-api-key` coincida exactamente con la clave en el servidor (`auth_proxy.py`).
- **502 Proxy Error**: El proxy no puede contactar a Ollama local (`localhost:11434`). Asegúrate de que Ollama esté corriendo en el servidor (`ollama serve`).
