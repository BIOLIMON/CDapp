# Configuración de Servidor Remoto (Ollama + Ngrok)

Esta guía detalla los pasos para configurar una máquina remota (servidor Linux/Mac/Windows) para ejecutar el modelo de IA `qwen` usando Ollama y exponerlo vía Ngrok para que la aplicación web pueda consumirlo.

## 1. Instalar Ollama

Sigue las instrucciones oficiales en [ollama.com](https://ollama.com).

Para Linux:
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

## 2. Descargar el Modelo Qwen

Una vez instalado Ollama, descarga el modelo `qwen` (puedes especificar la versión, por defecto baja la última estable, e.g., `qwen:2.5` o similares).

```bash
ollama pull qwen
```

## 3. Configurar Ollama para Acceso Externo (CORS)

Por defecto, Ollama bloquea orígenes cruzados. Para permitir que nuestra web (o ngrok) acceda, es recomendable configurar las variables de entorno:

**En Linux (systemd):**
1.  Editar el servicio: `systemctl edit ollama.service`
2.  Agregar:
    ```ini
    [Service]
    Environment="OLLAMA_HOST=0.0.0.0"
    Environment="OLLAMA_ORIGINS=*"
    ```
3.  Recargar y reiniciar:
    ```bash
    systemctl daemon-reload
    systemctl restart ollama
    ```

**Ejecución manual temporal:**
```bash
OLLAMA_HOST=0.0.0.0 OLLAMA_ORIGINS="*" ollama serve
```

## 4. Instalar y Configurar Ngrok

1.  Regístrate en [ngrok.com](https://ngrok.com) y obtén tu token.
2.  Instala ngrok (e.g., `snap install ngrok`).
3.  Conecta tu cuenta:
    ```bash
    ngrok config add-authtoken TU_TOKEN
    ```

## 5. Exponer Ollama vía Ngrok

Ollama corre por defecto en el puerto `11434`.

```bash
ngrok http 11434
```

Ngrok te dará una URL pública del tipo `https://xxxx-xxxx.ngrok-free.app`. **Esta es la URL que necesitarás configurar en la aplicación web.**

> [!NOTE]
> Copia esa URL. Deberás ponerla en el archivo `.env.local` de la aplicación web bajo la variable `VITE_OLLAMA_API_URL`.
