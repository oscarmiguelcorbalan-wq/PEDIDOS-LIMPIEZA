# PEDIDOS-LIMPIEZA

Dos apps web sobre una hoja de Google:

| App | Archivo | Para quién |
|---|---|---|
| **Pedidos** | `index.html` | Clientes: ven el catálogo con sus precios y ofertas, arman el pedido y lo envían. Ven el estado de sus pedidos y pueden repetirlos. |
| **Gestión** | `admin.html` | Vos (con PIN): pedidos recibidos y estados, stock con entradas/salidas/recuentos, productos y precios, tarifas, ofertas, clientes, presupuestos rápidos imprimibles y ajustes. |

Datos: hoja de Google **PEDIDOS-LIMPIEZA** (pestañas Productos, Clientes, Tarifas, Ofertas, Pedidos, Presupuestos, Movimientos, Config).
El código del servidor está en `apps-script/Code.gs`.

## Puesta en marcha (una sola vez)

1. Abrí la hoja **PEDIDOS-LIMPIEZA** en Google Drive → **Extensiones → Apps Script**.
2. Borrá lo que haya en `Código.gs`, pegá todo `apps-script/Code.gs` y guardá (💾).
3. Elegí la función `setup` y tocá **Ejecutar** (acepta los permisos). No borra nada; solo completa lo que falte.
4. **Implementar → Nueva implementación → ⚙️ Aplicación web**
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier usuario**
5. Copiá la URL que termina en `/exec` y pegala en `config.js` (`window.API_URL = "…/exec";`).
6. GitHub → Settings → Pages → Branch `main` / root. Tu web queda en
   `https://oscarmiguelcorbalan-wq.github.io/PEDIDOS-LIMPIEZA/`
   - Clientes: `…/PEDIDOS-LIMPIEZA/` (cada uno con su enlace `?c=CÓDIGO`)
   - Gestión: `…/PEDIDOS-LIMPIEZA/admin.html`

Si `config.js` está vacío, las dos apps funcionan en **modo demo** (datos de prueba en el navegador, PIN 1234). Se puede forzar con `?demo=1`.

## Cómo funciona

- **Precios**: precio de lista − % de la tarifa del cliente. Si hay una oferta vigente con mejor precio (y se cumple la cantidad mínima), se aplica la oferta. El precio final siempre lo calcula el servidor.
- **Stock**: se descuenta cuando pasás un pedido a *Confirmado* (o Preparado/Enviado/Entregado) y se devuelve si lo cancelás. Cada cambio queda en *Movimientos*.
- **Clientes**: cada uno tiene un código de acceso. Desde *Clientes* copiás o mandás por WhatsApp su enlace personal.
- **Presupuestos**: tocá productos para sumarlos, elegí cliente/tarifa, descuento extra, guardar e imprimir (o “Guardar como PDF”). Después se puede pasar a pedido con un clic.
- **Imágenes**: están en `img/`. Para usar una foto propia, poné su enlace en el campo Imagen del producto.

## Cambios de código
Después de editar `Code.gs`: **Implementar → Gestionar implementaciones → ✏️ → Versión: Nueva versión → Implementar** (la URL no cambia).
