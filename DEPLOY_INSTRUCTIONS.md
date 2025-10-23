# 🚀 Instrucciones para Deploy de gestion-compra-web

## ✅ Cambios Aplicados
- ✅ Manejo automático de reCAPTCHA v2 (invisible y visible)
- ✅ Simulación de interacciones del usuario
- ✅ Clic automático en reCAPTCHA visible
- ✅ Verificación del estado de resolución
- ✅ Logging detallado para debugging

## 📋 Pasos para Deploy

### 1. Abrir Terminal
```bash
cd /Users/coke/Documents/Programacion/Proyectos/AXAM/GestionOperaciones/gestion-compra-web
```

### 2. Inicializar Git (si no existe)
```bash
git init
```

### 3. Configurar Remote
```bash
git remote add origin https://github.com/thovexSF/axam-gestion-compra.git
```

### 4. Agregar Archivos
```bash
git add .
```

### 5. Hacer Commit
```bash
git commit -m "feat: Agregar manejo automático de reCAPTCHA v2 para login

- Detección automática de reCAPTCHA v2 (invisible y visible)
- Simulación de interacciones del usuario para activar reCAPTCHA invisible
- Clic automático en reCAPTCHA visible cuando es necesario
- Verificación del estado de resolución del reCAPTCHA
- Manejo robusto de errores con logging detallado
- Mejoras en el proceso de login automático para Railway"
```

### 6. Cambiar a Rama Master
```bash
git branch -M master
```

### 7. Hacer Push
```bash
git push -u origin master
```

## 🎯 Resultado Esperado
- ✅ Código subido a GitHub
- ✅ Railway detectará los cambios automáticamente
- ✅ Deploy automático en Railway
- ✅ Aplicación funcionando con manejo de reCAPTCHA

## 🔍 Verificación
Después del push, verifica en:
1. GitHub: https://github.com/thovexSF/axam-gestion-compra
2. Railway: Dashboard de tu proyecto
3. Logs de Railway para ver el deploy

## 📁 Archivos Incluidos
- `pages/api/generate-excel.js` (con mejoras de reCAPTCHA)
- `package.json` y `package-lock.json`
- `next.config.js`
- `railway.json`
- `Dockerfile`
- `README.md`
- Todos los archivos de configuración

