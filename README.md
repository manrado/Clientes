# Manrado — Análisis de Información Financiera

Integración CFDI–bancos–contabilidad + procesos eficientes = cierres más rápidos, menos errores y paquetes listos para auditoría.

## Nuestros Servicios

Brindamos soluciones integrales para la gestión financiera, contable y fiscal de tu negocio.

* **Análisis Contable**: Cierres y estados financieros trazables y alineados con SAT.
* **Integridad de Datos**: Unificación de CFDI y bancos con tu sistema contable.
* **Procesos Eficientes**: Menos tareas repetitivas, menos errores, más tiempo para decidir.
* **Soporte a Auditoría**: Paquetes ordenados para dirección o auditores externos.

## Contacto

* **Sitio Web**: [manrado.com](https://manrado.com)
* **Email**: [info@manrado.com](mailto:info@manrado.com?subject=Consulta%20Manrado)
# Manrado — Análisis de Información Financiera

Integración CFDI–bancos–contabilidad + procesos eficientes = cierres más rápidos, menos errores y paquetes listos para auditoría.

## Nuestros Servicios

Brindamos soluciones integrales para la gestión financiera, contable y fiscal de tu negocio.

* **Análisis Contable**: Cierres y estados financieros trazables y alineados con SAT.
* **Integridad de Datos**: Unificación de CFDI y bancos con tu sistema contable.
* **Procesos Eficientes**: Menos tareas repetitivas, menos errores, más tiempo para decidir.
* **Soporte a Auditoría**: Paquetes ordenados para dirección o auditores externos.

## Contacto

* **Sitio Web**: [manrado.com](https://manrado.com)
* **Email**: [info@manrado.com](mailto:info@manrado.com?subject=Consulta%20Manrado)
# Manrado — Análisis de Información Financiera

Integración CFDI–bancos–contabilidad + procesos eficientes = cierres más rápidos, menos errores y paquetes listos para auditoría.

## Nuestros Servicios

Brindamos soluciones integrales para la gestión financiera, contable y fiscal de tu negocio.

* **Análisis Contable**: Cierres y estados financieros trazables y alineados con SAT.
* **Integridad de Datos**: Unificación de CFDI y bancos con tu sistema contable.
* **Procesos Eficientes**: Menos tareas repetitivas, menos errores, más tiempo para decidir.
* **Soporte a Auditoría**: Paquetes ordenados para dirección o auditores externos.

## Contacto

* **Sitio Web**: [manrado.com](https://manrado.com)
* **Email**: [info@manrado.com](mailto:info@manrado.com?subject=Consulta%20Manrado)
# Clientes
Contacto al servicio de Informacion financiera

## Desarrollo (Preparar entorno)

Sigue estos pasos para crear y activar un entorno virtual Python en Windows (PowerShell) y preparar el entorno para desarrollo:

1. Crear el entorno virtual (si no existe):

```powershell
# Clientes
Contacto al servicio de Informacion financiera

## Desarrollo (Preparar entorno)

Sigue estos pasos para crear y activar un entorno virtual Python en Windows (PowerShell) y preparar el entorno para desarrollo:

1. Crear el entorno virtual (si no existe):

```powershell
python -m venv .venv
```

1. Activar el entorno virtual (PowerShell):

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force # (si PowerShell bloquea scripts)
# Clientes
Contacto al servicio de Informacion financiera

## Desarrollo (Preparar entorno)

Sigue estos pasos para crear y activar un entorno virtual Python en Windows (PowerShell) y preparar el entorno para desarrollo:

1. Crear el entorno virtual (si no existe):

```powershell
python -m venv .venv
```

1. Activar el entorno virtual (PowerShell):

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force # (si PowerShell bloquea scripts)
.\.venv\Scripts\Activate.ps1
```

1. Instalar dependencias de desarrollo:

```powershell
pip install -r requirements-dev.txt
```

1. Iniciar servidor local para desarrollo:

```powershell
.\dev\start-server.ps1 -Port 8000
```

1. Ejecutar validación cross-platform (alternativa al script bash):

```powershell
.\dev\run-validate.ps1
```

1. (Opcional) Instalar Git hooks con pre-commit:

```powershell
pre-commit install
pre-commit run --all-files
```

Si prefieres usar el script bash `validate-performance.sh`, instálate y usa WSL o Git Bash y ejecuta:

```bash
bash validate-performance.sh
```

¡Listo! Con esto deberías poder seguir desarrollando y verificando la performance de la web en un entorno reproducible.

## Validación integrada (Python)

Se añadió `tools/validate_performance.py` como alternativa cross-platform al script `validate-performance.sh`.

Opciones principales:

- `--root PATH`: Ruta del proyecto (por defecto la raíz del repo)
- `--json`: Imprime un reporte en JSON
- `--video-threshold N`: MB para considerar un video como "oversized" (por defecto 5)
- `--image-threshold N`: KB para detectar imágenes grandes (por defecto 200)
- `--fail-on-warnings`: Sale con código 1 si hay advertencias
- `--verbose`: Muestra detalles adicionales

Ejemplo:

```powershell
.\.venv\Scripts\python.exe tools/validate_performance.py --json --video-threshold 3
```

Esto facilita verificar tamaño de activos, estructura semántica, accesibilidad y detectar archivos no minificados.

## Nota: Refactor de Frontend (SVG Sprite y JS Modules)

Se agregó un refactor en la rama `refactor/svg-sprite-and-scripts` que extrae los SVGs a un sprite y reorganiza `assets/scripts.js` como módulos ES (files in `assets/modules/`). Si trabajas en la UI, revisa `dev/PR_REFRACTOR_SVG_MODULES.md` para detalles y pruebas manuales.


## Configuración de partículas
Puedes ajustar el número máximo de partículas y el tamaño del pool a través de los atributos de `canvas` o mediante `options` en el `initParticleCanvas`.

Ejemplo (en `index.html`):
```html
<canvas id="particle-canvas" data-max-particles="75" data-pool-max="200" data-colors="#5fb3ff,#2ec27e,#f6c244,#7c5cff" data-mouse-radius="30"></canvas>
```

O puedes invocar la API con opciones desde `assets/scripts.js`:
```js
initParticleCanvas('#particle-canvas', { maxParticles: 100, poolMax: 300, colors: ['#5fb3ff', '#2ec27e'] });
```
