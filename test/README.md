# Test Proxy Server

Servidor proxy simple para probar el funcionamiento básico del proxy sin la complejidad del sistema completo.

## Uso

### 1. Iniciar el servidor proxy

```bash
node test/simple-proxy.js
```

O con un puerto personalizado:

```bash
PROXY_PORT=9999 node test/simple-proxy.js
```

El servidor se iniciará en el puerto 8888 por defecto (o el especificado en `PROXY_PORT`).

### 2. Lanzar Chrome con el proxy

**Opción A: Script de Node.js**

```bash
node test/launch-chrome.js
```

**Opción B: Script de bash**

```bash
./test/launch-chrome.sh
```

**Opción C: Manualmente**

```bash
google-chrome --proxy-server=http://localhost:8888 http://httpforever.com/
```

## Qué hace

Este proxy simple:

- Maneja requests HTTP proxy (GET http://...)
- Maneja requests HTTPS proxy (CONNECT method)
- Hace proxy de todas las requests sin modificaciones
- Registra todas las requests en la consola

## Propósito

Este proxy de prueba nos ayuda a:

1. Verificar que el protocolo HTTP proxy funciona correctamente
2. Aislar problemas de nuestra implementación más compleja
3. Probar que Chrome puede conectarse correctamente a través del proxy
4. Verificar que las requests HTTPS (CONNECT) funcionan

## Notas

- El proxy no modifica ningún contenido, solo hace forward de las requests
- Todos los logs se muestran en la consola
- El proxy maneja tanto HTTP como HTTPS correctamente
