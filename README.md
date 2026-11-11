# CinePass (frontend demo)
Abre `index.html` en el navegador (doble clic). Sin servidor ni base de datos.
Cuenta demo: demo@cinepass.test / demo1234 · Tarjeta aprobada 4111 1111 1111 1111 · rechazada 4000 0000 0000 0002.
Todo (usuarios, reservas) se guarda solo en el localStorage de tu navegador: es una simulación.

Implementado: P-01, P-02, P-03, P-04, P-05, P-06, P-07, P-10, P-11, P-13, P-14, P-24 (404/acceso denegado), M-02, M-05, M-06, M-11, M-12, C-01 a C-07.
Pendiente: menú y pedidos (P-08, P-09, P-16 a P-18, M-01, M-03), edición de reservas (P-15, M-04), módulo admin (P-19 a P-23), P-12 (opcional, SG-13).
Sugerencias SG-xx del documento siguen pendientes de aprobación; se aplicó SG-01 (login diferido hasta el resumen) y SG-02 (retención de 8 min) como valores propuestos.

## Conectar TMDB (películas reales)
1. Crea cuenta en themoviedb.org → Ajustes → API → solicita acceso (uso no comercial) → copia el "API Read Access Token".
2. Abre la app, pulsa "Configurar API de películas" en el pie de página, pega el token y guarda. (Alternativa: js/config.js.)
3. Si el navegador bloquea la petición al abrir con doble clic, sirve la carpeta: `python -m http.server 8000` y abre http://localhost:8000
Sin token o si falla la red, se usan las películas locales de respaldo. TMDB solo da información de películas; horarios, salas y asientos son locales.
Las sinopsis se muestran con un máximo de 300 caracteres; si la respuesta de TMDB es más larga, se priorizan frases completas y se acorta de forma legible cuando hace falta.
