# Guía de Integración: API de Ollama via Ngrok para Cultivadatos

Esta documentación está diseñada para asistir a un agente de IA o desarrollador en la integración de la **API de Ollama** (hospedada localmente y expuesta vía ngrok) con la plataforma web **Cultivadatos**.

## 1. Detalles de Conexión

El servicio expone una API REST compatible con Ollama a través de un túnel seguro **ngrok**.

### Obtención de la URL Base:
https://preeligible-triply-qiana.ngrok-free.dev/


### Cabeceras HTTP Obligatorias
Al usar el tier gratuito de ngrok, es **CRITICO** incluir la siguiente cabecera en **TODAS** las peticiones HTTP para evitar la página de advertencia de "ngrok browser warning", que rompería la respuesta JSON:

```http
ngrok-skip-browser-warning: true
```

## 2. Endpoints Principales

La API sigue el estándar de Ollama. Los endpoints más relevantes son:

### Generación de Texto (Completion)
*   **URL**: `<BASE_URL>/api/generate`
*   **Método**: `POST`
*   **Cuerpo (JSON)**:
    ```json
    {
      "model": "mistral:7b",
      "prompt": "¿Por qué el cielo es azul?",
      "stream": false
    }
    ```

### Chat Interactivo
*   **URL**: `<BASE_URL>/api/chat`
*   **Método**: `POST`
*   **Cuerpo (JSON)**:
    ```json
    {
      "model": "llama3.1:70b",
      "messages": [
        { "role": "user", "content": "Hola, ¿cómo estás?" }
      ],
      "stream": false
    }
    ```

*Nota: Se recomienda `stream: false` para simplicidad inicial, a menos que la UI de Cultivadatos suporte streaming.*

## 3. Modelos Disponibles

Estos son los modelos instalados y listos para usar en el servidor. Seleccione el adecuado según balance de velocidad vs inteligencia.

| Modelo | ID | Uso Recomendado |
| :--- | :--- | :--- |
| **mistral:7b** | `mistral:7b` | **Default**. Rápido, buen balance general. |
| **llama3.1:70b** | `llama3.1:70b` | **Máxima Calidad**. Razonamiento complejo. Lento. |
| **deepseek-r1:8b** | `deepseek-r1:8b` | Muy bueno para razonamiento/lógica rápida. |
| **qwen2.5:14b** | `qwen2.5:14b` | Excelente multilingual y coding. |
| **codestral:22b** | `codestral:22b` | Especializado en código. |
| **llama3.2:3b** | `llama3.2:3b` | Extremadamente rápido, calidad baja/media. |

## 4. Ejemplos de código

### Python (Requests)
```python
import requests
import json

url = "https://<TU_URL_NGROK>.ngrok-free.dev/api/generate"

payload = {
    "model": "mistral:7b",
    "prompt": "Explica la fotosíntesis en 50 palabras.",
    "stream": False
}

headers = {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true"  # ¡IMPORTANTE!
}

response = requests.post(url, json=payload, headers=headers)

if response.status_code == 200:
    print(response.json()['response'])
else:
    print(f"Error: {response.status_code}", response.text)
```

### JavaScript / TypeScript (Fetch)
```javascript
const BASE_URL = "https://<TU_URL_NGROK>.ngrok-free.dev";

async function queryOllama(prompt) {
  const response = await fetch(`${BASE_URL}/api/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true" // ¡IMPORTANTE!
    },
    body: JSON.stringify({
      model: "mistral:7b",
      prompt: prompt,
      stream: false
    })
  });

  if (!response.ok) {
    throw new Error(`Error HTTP: ${response.status}`);
  }

  const data = await response.json();
  return data.response;
}
```

## 5. Mantenimiento y Estabilidad

El servidor cuenta con un script de **auto-recuperación** (`keep_alive_ngrok.sh`) que verifica la conexión cada minuto.

*   Si la conexión falla, esperar **1-2 minutos** y volver a intentar (el script reiniciará el túnel).
*   Si el túnel se reinicia, la **URL cambiará**. Se deberá actualizar la configuración en Cultivadatos con la nueva URL obtenida de `ngrok_url.txt`.
