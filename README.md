# Manrado — Análisis de Información Financiera

Sitio web de consultoría financiera especializado en integración CFDI-bancos-contabilidad.

## 🚀 Inicio Rápido

```bash
# Instalar dependencias
npm install

# Desarrollo (servidor local)
npm run serve

# Build producción
npm run build

# Validar performance
npm run validate
```

## 📊 Métricas de Performance

| Métrica | Valor | Estado |
|---------|-------|--------|
| Lighthouse Score | 95+ | ✅ |
| CSS | 21KB → 13KB | ✅ |
| JS | 1.5KB → 0.5KB | ✅ |
| Offline Support | Sí | ✅ |

## 🛠️ Stack Tecnológico

- **Frontend**: HTML5, CSS3, JavaScript ES6+
- **Build**: PostCSS + cssnano, Terser
- **CI/CD**: GitHub Actions
- **Cache**: Service Worker (Network First)

## 📁 Estructura

```
├── assets/
│   ├── modules/        # JS modular (lazy loaded)
│   ├── styles.css      # CSS principal
│   └── scripts.js      # Entry point
├── reportes/           # Portal de reportes
├── tools/              # Validación Python
└── service-worker.js   # Cache offline
```

## 🔧 Comandos

| Comando | Descripción |
|---------|-------------|
| `npm run build` | Minificar CSS y JS |
| `npm run serve` | Servidor local :8080 |
| `npm run validate` | Validar performance |
| `npm run clean` | Limpiar archivos generados |

## ✅ Optimizaciones

- Minificación automática (CSS -39%, JS -64%)
- Service Worker para cache offline
- Lazy loading de módulos no críticos
- Resource hints (preconnect, preload)
- Throttling de eventos (resize, scroll)
- Passive listeners
- Meta tags SEO completos
- Schema.org JSON-LD
- Skip links y ARIA labels

---

**Contacto**: info@manrado.com | [LinkedIn](https://www.linkedin.com/in/miguel-ramirez-3700a0196)
