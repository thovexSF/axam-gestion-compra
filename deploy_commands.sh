#!/bin/bash

# Script para hacer deploy de gestion-compra-web
echo "🚀 Iniciando deploy de gestion-compra-web..."

# Navegar al directorio
cd /Users/coke/Documents/Programacion/Proyectos/AXAM/GestionOperaciones/gestion-compra-web

# Inicializar git si no existe
if [ ! -d ".git" ]; then
    echo "📁 Inicializando repositorio git..."
    git init
fi

# Configurar remote
echo "🔗 Configurando remote..."
git remote remove origin 2>/dev/null || true
git remote add origin https://github.com/thovexSF/axam-gestion-compra.git

# Agregar todos los archivos
echo "📦 Agregando archivos..."
git add .

# Hacer commit
echo "💾 Haciendo commit..."
git commit -m "feat: Agregar manejo automático de reCAPTCHA v2 para login

- Detección automática de reCAPTCHA v2 (invisible y visible)
- Simulación de interacciones del usuario para activar reCAPTCHA invisible
- Clic automático en reCAPTCHA visible cuando es necesario
- Verificación del estado de resolución del reCAPTCHA
- Manejo robusto de errores con logging detallado
- Mejoras en el proceso de login automático para Railway"

# Cambiar a rama master
echo "🌿 Cambiando a rama master..."
git branch -M master

# Hacer push
echo "🚀 Haciendo push a master..."
git push -u origin master

echo "✅ Deploy completado!"
echo "🌐 Railway debería hacer deploy automático en unos minutos"

