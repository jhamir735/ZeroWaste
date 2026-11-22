/* =============================================
   ZeroWaste – Tutorial integrado
   Archivo: shared/tutorial.js

   Se activa agregando en cada página:
     <link rel="stylesheet" href="../shared/tutorial.css"/>   (en <head>)
     <script src="../shared/tutorial.js"></script>             (antes de </body>)

   - Crea el botón «Tutorial» (abajo a la izquierda) y el panel con los pasos.
   - Las capturas anotadas están en shared/tutorial/ y sus marcas en shared/tutorial/shots.js
   - Para editar textos: arreglo PASOS más abajo.
   ============================================= */
(function () {
  'use strict';

  var SCRIPT = document.currentScript && document.currentScript.src;
  var SHARED = new URL('./', SCRIPT || location.href).href;       // …/shared/
  var ROOT = new URL('../', SHARED).href;                          // raíz del proyecto
  var pagina = (location.pathname.match(/\/(\d{2}-[a-z-]+)\//) || [])[1] || null;
  var SHOTS = null;

  /* ---------- Piezas de HTML reutilizables ---------- */
  function figura(key, nombres, leyenda, opt) {
    opt = opt || {};
    var s = SHOTS && SHOTS[key];
    if (!s) return '';
    var marcas = (nombres || []).map(function (n, i) {
      var p = s.marks[n];
      return p ? '<span class="zwt-mark" style="left:' + p[0] + '%;top:' + p[1] + '%">' + (i + 1) + '</span>' : '';
    }).join('');
    var ley = (leyenda || []).map(function (it, i) {
      return '<li><span class="zwt-n">' + (i + 1) + '</span><div><b>' + it[0] + '</b><p>' + it[1] + '</p></div></li>';
    }).join('');
    return '<figure class="zwt-fig"><div class="zwt-shot' + (opt.mobile ? ' zwt-mobile' : '') + '">' +
      '<div class="zwt-shotin"><img src="' + SHARED + 'tutorial/' + s.img + '" alt="' + (opt.alt || 'Captura de pantalla') + '" loading="lazy">' + marcas + '</div></div>' +
      '<figcaption><span>' + (opt.cap || '') + '</span>' + (opt.mobile ? '' : '<button type="button" class="zwt-zoom" data-zoom>Ampliar captura</button>') + '</figcaption></figure>' +
      (ley ? '<ol class="zwt-legend' + (opt.mobile ? ' zwt-one' : '') + '">' + ley + '</ol>' : '');
  }
  function aviso(tipo, texto) {
    var t = { tip: 'Consejo', warn: 'Ojo', info: 'Dato' }[tipo];
    return '<div class="zwt-note zwt-' + tipo + '"><strong>' + t + '</strong><span>' + texto + '</span></div>';
  }
  function pasos(lista) {
    return '<ol class="zwt-steps">' + lista.map(function (p) { return '<li><b>' + p[0] + '</b>' + p[1] + '</li>'; }).join('') + '</ol>';
  }

  /* ---------- Contenido: un objeto por paso ---------- */
  var PASOS = [
    {
      nav: 'Conocer la app', titulo: 'Conocer ZeroWaste y esta guía', page: null,
      html: function () {
        return '<p class="zwt-lead"><b>ZeroWaste</b> te ayuda a <b>no desperdiciar comida en casa</b>: registras lo que compras, te avisa qué está por vencer, te sugiere recetas para aprovecharlo y te muestra cuánto dinero y comida has ahorrado. Esta guía te explica <b>cada pantalla, paso a paso</b>, aunque nunca hayas usado la página.</p>' +
          figura('inicio', ['perfil', 'menu', 'badge', 'agregar', 'tutorial', 'logout'], [
            ['Tu perfil', 'Muestra tu nombre y correo. Haz clic para editarlos.'],
            ['Menú lateral', 'Cinco secciones: Inicio, Alimentos, Alertas, Recetas y Estadísticas. La sección donde estás aparece resaltada en verde.'],
            ['Número rojo', 'Cuántos alimentos están por vencer. Se actualiza solo.'],
            ['Agregar', 'Atajo para registrar un alimento nuevo desde cualquier pantalla.'],
            ['Tutorial', 'Este botón, siempre abajo a la izquierda, abre esta guía cuando la necesites.'],
            ['Cerrar sesión', 'Sale de tu cuenta de forma segura.']
          ], { cap: 'Pantalla de Inicio con sus partes principales', alt: 'Pantalla de Inicio' }) +
          aviso('tip', 'Muévete por la guía con los botones <b>Anterior / Siguiente</b>, con las <b>flechas del teclado</b> o eligiendo un paso a la izquierda. Se cierra con la <b>✕</b> o la tecla <b>Esc</b>.') +
          aviso('info', 'En el <b>celular</b> el menú lateral pasa a una barra inferior (lo vemos en el paso 11).');
      }
    },
    {
      nav: 'Iniciar sesión', titulo: 'Iniciar sesión o crear una cuenta', page: '01-bienvenida',
      html: function () {
        return '<p class="zwt-lead">La primera pantalla es la <b>bienvenida</b>. Aquí entras a tu cuenta o creas una nueva. Cada cuenta tiene <b>su propia despensa, historial y estadísticas</b>.</p>' +
          pasos([['Escribe tus datos', 'Usuario o correo, y tu contraseña.'], ['Pulsa «Iniciar sesión»', 'El botón verde.'], ['Listo', 'Llegas a la pantalla de Inicio.']]) +
          figura('login', ['ident', 'pass', 'eye', 'login', 'crear', 'demo'], [
            ['Usuario o correo', 'Puedes escribir <i>maria</i> o <i>maria@correo.com</i>.'],
            ['Contraseña', 'Se escribe con puntos por seguridad.'],
            ['Ojo 👁', 'Muestra u oculta la contraseña para que verifiques lo que escribes.'],
            ['Iniciar sesión', 'Entra a la aplicación.'],
            ['Crear una cuenta nueva', 'Abre un formulario de registro (siguiente imagen).'],
            ['Acceso demo', 'Datos de ejemplo para probar sin registrarte.']
          ], { cap: 'Pantalla de bienvenida', alt: 'Pantalla de bienvenida' }) +
          '<h3>Si no tienes cuenta</h3>' +
          figura('registro', ['nombre', 'usuario', 'correo', 'clave', 'clave2', 'crearbtn'], [
            ['Nombre completo', 'Ej.: María Pérez.'],
            ['Nombre de usuario', 'Mínimo 3 letras o números (se permiten . _ -).'],
            ['Correo electrónico', 'Ej.: maria@correo.com.'],
            ['Contraseña', 'Mínimo 6 caracteres.'],
            ['Repite tu contraseña', 'Debe ser idéntica a la anterior.'],
            ['Crear cuenta', 'Guarda tu cuenta y entra directamente.']
          ], { cap: 'Formulario «Crea tu cuenta ZeroWaste»', alt: 'Formulario de registro' }) +
          aviso('tip', 'Para probar rápido usa <b>maria</b> y <b>zerowaste123</b>. También existen <b>carlos</b> y <b>ana</b> con la misma contraseña.') +
          aviso('warn', 'Si el usuario o la contraseña no coinciden, aparece un mensaje en rojo bajo el formulario. Revisa mayúsculas y pulsa el ojo 👁 para ver lo que escribiste.');
      }
    },
    {
      nav: 'Inicio', titulo: 'Inicio: tu resumen del día', page: '02-inicio',
      html: function () {
        return '<p class="zwt-lead">Es tu <b>pantalla principal</b>. En unos segundos sabes qué conviene usar hoy y cómo vas con tu ahorro.</p>' +
          figura('inicio', ['saludo', 'alerta', 'cifras', 'porvencer', 'receta', 'consejo'], [
            ['Saludo', 'Te saluda por tu nombre y cuenta cuántos alimentos están por vencer.'],
            ['Banner de alerta', 'Se pinta de rojo cuando hay alimentos por vencer. El botón <b>Ver alertas</b> abre esa pantalla.'],
            ['Cuatro cifras', 'Alimentos aprovechados, ahorro estimado en soles, alimentos en tu inventario y recetas cocinadas.'],
            ['Por vencer (3 días o menos)', 'Los alimentos más urgentes con su etiqueta: <i>Vence hoy</i>, <i>Vence mañana</i>… <b>Ver todo</b> abre Alertas.'],
            ['Receta sugerida', 'La app elige una receta que usa lo que está por vencer. <b>Ver receta completa</b> abre los pasos.'],
            ['Consejo del día', 'Un truco para que la comida dure más. <b>Otro consejo</b> muestra uno distinto.']
          ], { cap: 'Pantalla de Inicio', alt: 'Pantalla de Inicio' }) +
          aviso('info', 'Las <b>etiquetas de vencimiento siempre llevan texto</b> (por ejemplo «Vence hoy»), así se entienden aunque no distingas los colores.');
      }
    },
    {
      nav: 'Mis alimentos', titulo: 'Mis alimentos: tu despensa', page: '03-mis-alimentos',
      html: function () {
        return '<p class="zwt-lead">Aquí está <b>todo lo que tienes en casa</b>: refrigeradora, congelador y despensa. Los más urgentes aparecen primero.</p>' +
          figura('alimentos', ['buscar', 'exportar', 'agregar', 'filtros', 'resumen', 'tarjeta', 'cantidad', 'eliminar', 'escanear'], [
            ['Buscar alimento', 'Escribe un nombre y la lista se filtra al instante.'],
            ['PDF y Excel', 'Descargan tu inventario para guardarlo o imprimirlo.'],
            ['Agregar', 'Abre el formulario para registrar un alimento nuevo.'],
            ['Filtros', 'Todos, Frutas y verduras, Lácteos, Cereales, Carnes o Bebidas.'],
            ['Resumen', 'Cuántos <b>vencen hoy</b>, cuántos vencen en 1 a 3 días y el total de tu despensa.'],
            ['Tarjeta de alimento', 'Inicial de color, nombre, lugar donde lo guardas y etiqueta de vencimiento.'],
            ['− y +', 'Cambian la cantidad disponible cuando usas una parte.'],
            ['✕ Quitar', 'Elimina el alimento. Aparece un mensaje con <b>Deshacer</b> por unos segundos.'],
            ['Escanear', 'Agrega productos con la cámara del celular, sin escribir (paso siguiente).']
          ], { cap: 'Pantalla Mis alimentos', alt: 'Pantalla Mis alimentos' }) +
          '<div class="zwt-pills"><span class="zwt-pill r">Vence hoy</span><span class="zwt-pill a">Vence mañana</span><span class="zwt-pill a">En 2 días</span><span class="zwt-pill g">En 5 días</span></div>' +
          '<p class="zwt-small"><b>Rojo</b>: úsalo hoy · <b>Naranja</b>: úsalo pronto · <b>Verde</b>: hay tiempo.</p>' +
          aviso('tip', 'Si quitaste un alimento por error, pulsa <b>Deshacer</b> en el mensaje que aparece abajo. Tienes unos segundos.');
      }
    },
    {
      nav: 'Registrar alimento', titulo: 'Registrar un alimento', page: '04-registrar-alimento',
      html: function () {
        return '<p class="zwt-lead">Cuando compras algo, anótalo aquí para que la app te avise antes de que venza. Se llega con el botón <b>Agregar</b> (en Inicio o en Alimentos).</p>' +
          pasos([['Escribe el nombre', 'Y elige la categoría.'], ['Indica fecha y lugar', 'Puedes usar los atajos de fecha.'], ['Pulsa «Guardar alimento»', 'Vuelves a tu lista con un mensaje de confirmación.']]) +
          figura('registrar', ['foto', 'nombre', 'categoria', 'ubicacion', 'cantidad', 'fecha', 'atajos', 'notas', 'guardar', 'banner'], [
            ['Foto (opcional)', 'Toca el recuadro para agregar una imagen del alimento.'],
            ['Nombre del alimento *', 'Ej.: Palta Hass, Tomate, Leche.'],
            ['Categoría *', 'Frutas y verduras, Lácteos, Carnes y pescados, Cereales y legumbres, Bebidas u Otros.'],
            ['Ubicación', 'Dónde lo guardas: Refrigeradora, Congelador o Despensa.'],
            ['Cantidad', 'Con − y + cambias las unidades.'],
            ['Fecha de vencimiento *', 'Elige el día en el calendario.'],
            ['Atajos de fecha', '<b>Hoy</b>, <b>+3 días</b>, <b>+1 semana</b> y <b>+1 mes</b>: más rápido que el calendario.'],
            ['Notas (opcional)', 'Ej.: «Comprado en mercado local, abrir pronto».'],
            ['Guardar alimento', 'Confirma. <b>Cancelar</b> vuelve sin guardar nada.'],
            ['Escanear código', 'Atajo para agregar el producto con la cámara en vez de escribirlo.']
          ], { cap: 'Formulario Registrar alimento', alt: 'Formulario Registrar alimento' }) +
          aviso('tip', '<b>¿Es un producto que ya compraste antes?</b> Arriba tienes el botón <b>📜 Ver historial y reponer</b> para agregarlo en 1 solo clic sin volver a escribir sus datos.') +
          aviso('info', 'Los campos con <b>*</b> son obligatorios. La app te avisa <b>3 días antes</b> de que el alimento venza.');
      }
    },
    {
      nav: 'Escanear productos', titulo: 'Escanear productos con la cámara', page: '09-escanear',
      html: function () {
        return '<p class="zwt-lead">Si tienes el producto en la mano, <b>apunta la cámara a su código de barras</b> y ZeroWaste completa el nombre, la categoría y una fecha sugerida. Puedes escanear varios y guardarlos todos juntos.</p>' +
          pasos([['Abre «Escanear»', 'Está en Mis alimentos, en Inicio y en Registrar alimento.'], ['Activa la cámara', 'Acepta el permiso del navegador y apunta al código dentro del recuadro.'], ['Revisa la lista', 'Corrige nombre, cantidad o fecha si hace falta.'], ['Pulsa «Guardar todo»', 'Los productos pasan a Mis alimentos.']]) +
          figura('escanear', ['camara', 'foto', 'manual', 'lista', 'guardar'], [
            ['Cámara', 'Apunta al código de barras. Suena un pitido cuando lo reconoce. En el celular usa la cámara trasera.'],
            ['Tomar foto del código', 'Alternativa si la cámara en vivo no funciona: fotografía el código.'],
            ['Escribir el número', 'Teclea los 8 a 14 dígitos del código y pulsa Buscar.'],
            ['Productos escaneados', 'Cada producto trae fecha sugerida que puedes cambiar con los atajos. Si escaneas el mismo dos veces, sube la cantidad.'],
            ['Guardar todo', 'Agrega todos a tu despensa de una vez. Los campos en rojo faltan por completar.']
          ], { cap: 'Pantalla Escanear productos', alt: 'Pantalla Escanear productos' }) +
          aviso('warn', 'La cámara en vivo del navegador solo funciona con <b>https</b> o en <b>localhost</b>. Si no se activa, usa <b>Tomar foto del código</b> o escribe el número.') +
          aviso('tip', 'Si un producto no está en el catálogo, queda marcado en amarillo: escribe su nombre y categoría y guárdalo igual.');
      }
    },
    {
      nav: 'Reponer del historial', titulo: 'Reponer alimentos desde el historial', page: '10-historial',
      html: function () {
        return '<p class="zwt-lead">¿Terminaste un producto o lo usaste en una receta y volviste a comprarlo? <b>No hace falta registrarlo ni escanearlo otra vez</b>. Puedes reponerlo al instante desde tu historial con un solo clic.</p>' +
          pasos([
            ['Entra a Historial', 'Usa el botón <b>📜 Ver historial y reponer</b> en Registrar alimento, o el banner de reposición.'],
            ['Busca tu producto', 'Escribe su nombre o filtra por categoría (Lácteos, Frutas, Carnes, etc.).'],
            ['Pulsa «➕ Reponer a despensa»', 'El producto vuelve a ingresar a tu despensa en 1 segundo con su fecha fresca sugerida.'],
            ['O pulsa «✏️ Ajustar»', 'Si prefieres abrirlo en el formulario para cambiar la cantidad o fijar otra fecha en el calendario.']
          ]) +
          '<div style="background:#fff;border:1.5px solid #E3E8DF;border-radius:14px;padding:16px;margin:16px 0;">' +
            '<h4 style="margin:0 0 10px;font-size:15px;color:var(--text-main);font-weight:700;">¿Por qué usar el Historial de Reposición?</h4>' +
            '<ul style="margin:0;padding-left:20px;font-size:13.5px;color:var(--text-main);line-height:1.65;">' +
              '<li><b>Ahorra tiempo</b>: no tienes que volver a escribir el nombre ni elegir la categoría.</li>' +
              '<li><b>Fecha sugerida inteligente</b>: calcula automáticamente los días de duración según el tipo de alimento.</li>' +
              '<li><b>Conserva notas y fotos</b> que hayas guardado antes.</li>' +
              '<li><b>Todo lo consumido se guarda</b>: lo que terminas en tu despensa o usas al cocinar recetas queda aquí registrado.</li>' +
            '</ul>' +
          '</div>' +
          aviso('tip', 'Si cocinaste una receta y descontaste sus ingredientes, encuéntralos de inmediato en tu Historial en cuanto vuelvas a comprarlos.') +
          aviso('info', 'Desde <b>Registrar alimento</b> tienes un acceso directo permanente arriba a la derecha: <b>📜 Ver historial y reponer</b>.');
      }
    },
    {
      nav: 'Alertas', titulo: 'Alertas: qué comer primero', page: '05-alertas',
      html: function () {
        return '<p class="zwt-lead">Ordena tus alimentos <b>de lo más urgente a lo menos urgente</b>, en tres grupos de color.</p>' +
          figura('alertas', ['nuevo', 'hoy', 'verreceta', 'yausado', 'proximos', 'suficiente'], [
            ['Nuevo alimento', 'Atajo para registrar algo que acabas de comprar.'],
            ['Vencen hoy (rojo)', 'Lo que se debe usar hoy. Aparece arriba.'],
            ['Ver receta', 'Abre una receta pensada para aprovechar ese alimento.'],
            ['✓ Ya lo usé', 'Lo marcas como consumido y sale de la lista. Suma a tus estadísticas.'],
            ['Próximos a vencer (naranja)', 'Vencen en 1 a 3 días. Conviene planear su uso.'],
            ['Tiempo suficiente (verde)', 'Alimentos que aún aguantan varios días.']
          ], { cap: 'Pantalla de Alertas', alt: 'Pantalla de Alertas' }) +
          aviso('tip', 'Empieza siempre por el grupo rojo: pulsa <b>Ver receta</b> y cocina con eso. Cuando lo uses, pulsa <b>✓ Ya lo usé</b>.');
      }
    },
    {
      nav: 'Recetas', titulo: 'Recetas con lo que tienes', page: '06-recetas',
      html: function () {
        return '<p class="zwt-lead">Ideas de cocina <b>basadas en tu despensa</b>, con prioridad en lo que vence primero.</p>' +
          figura('recetas', ['buscar', 'chef', 'chefbtn', 'tabs', 'tarjeta', 'corazon'], [
            ['Buscar', 'Por nombre de receta o por ingrediente.'],
            ['Chef IA ZeroWaste', 'Inteligencia artificial que crea recetas usando solo lo que tienes.'],
            ['Crear receta con Chef IA', 'Genera una receta nueva a tu medida, priorizando lo que vence hoy.'],
            ['Pestañas', 'Listas para cocinar (100 % en despensa), Salvan lo que vence, Chef IA, Faltan ingredientes y Favoritas.'],
            ['Tarjeta de receta', 'Nombre, ingredientes (✓ verde: los tienes; rojo: están por vencer), tiempo y dificultad. <b>Ver receta →</b> abre el detalle.'],
            ['Corazón', 'Guarda la receta en tus favoritas.']
          ], { cap: 'Pantalla de Recetas', alt: 'Pantalla de Recetas' }) +
          aviso('info', 'La etiqueta <b>🇵🇪 Peruana</b> indica recetas de cocina peruana. <b>🚨 Salva 3 por vencer</b> dice cuántos alimentos urgentes aprovecha.');
      }
    },
    {
      nav: 'Detalle de receta', titulo: 'Detalle de una receta', page: '07-detalle-receta', query: '?id=peru_07',
      html: function () {
        return '<p class="zwt-lead">Al tocar una receta ves <b>qué necesitas</b>, <b>qué ya tienes</b> y <b>cómo prepararla</b> paso a paso.</p>' +
          figura('detalle', ['atras', 'fav', 'datos', 'prioridad', 'ingredientes', 'pasos', 'cocinada'], [
            ['Flecha ←', 'Vuelve a la lista de recetas.'],
            ['Corazón', 'Añade o quita la receta de tus favoritas.'],
            ['Datos rápidos', 'Tiempo, porciones, dificultad y qué porcentaje tienes ya en tu despensa.'],
            ['Aviso de prioridad', 'Te dice cuántos ingredientes de esta receta están por vencer.'],
            ['Ingredientes', 'Los que <b>ya tienes</b> (con su vencimiento), los que <b>faltan</b> y los condimentos básicos.'],
            ['Instrucciones', 'Pasos numerados de la preparación.'],
            ['Marcar como cocinada', 'Descuenta de tu despensa lo que usaste y suma a «Recetas cocinadas».']
          ], { cap: 'Detalle de una receta', alt: 'Detalle de receta' }) +
          aviso('warn', 'Pulsa <b>Marcar como cocinada</b> solo cuando realmente cocines: la app <b>descuenta los ingredientes</b> de tu despensa. Si fue un error, vuelve a registrarlos con <b>Agregar</b>.');
      }
    },
    {
      nav: 'Estadísticas', titulo: 'Estadísticas: tu impacto', page: '08-estadisticas',
      html: function () {
        return '<p class="zwt-lead">Muestra, con números y gráficas, <b>cuánto has ahorrado y cuánto desperdicio evitaste</b>.</p>' +
          figura('estadisticas', ['exportar', 'periodo', 'animo', 'tarjetas', 'barras', 'dona'], [
            ['PDF y Excel', 'Descargan tu reporte de impacto.'],
            ['Semana · Mes · Año', 'Cambian el periodo que quieres analizar.'],
            ['Mensaje de ánimo', 'Celebra tu avance. Nunca te regaña.'],
            ['Cuatro tarjetas', 'Dinero ahorrado, desperdicio evitado (kg), alimentos salvados y alimentos consumidos.'],
            ['Consumo por semana', 'Barras de lo consumido y de lo cocinado en tus últimas 6 semanas. Mientras más alto, mejor.'],
            ['Composición de tu despensa', 'Dona con el porcentaje de cada categoría.']
          ], { cap: 'Pantalla de Estadísticas', alt: 'Pantalla de Estadísticas' }) +
          aviso('tip', 'Más abajo están <b>«Tus logros desbloqueados»</b>: insignias como <i>Principiante</i>, <i>Chef creativo</i> o <i>Héroe Verde</i> que ganas al aprovechar más alimentos.');
      }
    },
    {
      nav: 'En el celular', titulo: 'Usar ZeroWaste en el celular', page: null,
      html: function () {
        return '<p class="zwt-lead">La misma página se adapta a pantallas pequeñas: <b>el menú lateral se convierte en una barra inferior</b> y todo se acomoda en una sola columna.</p>' +
          '<div class="zwt-cols"><div>' +
          '<ol class="zwt-legend zwt-one">' +
          [['Barra inferior', 'Inicio, Alimentos, Alertas (con punto rojo si hay urgencias), Recetas y Estadísticas. Tócala para cambiar de sección.'],
           ['Botón Tutorial', 'Queda justo encima de la barra, abajo a la izquierda.'],
           ['Flecha ←', 'En pantallas secundarias, arriba a la izquierda, vuelve a la anterior.'],
           ['Agregar', 'Sigue disponible arriba a la derecha.']].map(function (it, i) {
            return '<li><span class="zwt-n">' + (i + 1) + '</span><div><b>' + it[0] + '</b><p>' + it[1] + '</p></div></li>';
          }).join('') + '</ol></div><div>' +
          figura('movil', ['barra', 'tutorial', 'atras', 'agregar'], null, { mobile: true, cap: 'Inicio en el celular', alt: 'Inicio en el celular' }) +
          '</div></div>' +
          aviso('tip', 'Si se ve el menú lateral y quieres la vista de celular, reduce el ancho de la ventana del navegador.');
      }
    },
    {
      nav: 'Recorrido y ayuda', titulo: 'Tu recorrido de práctica y ayuda', page: null,
      html: function () {
        var items = ['Entra con <b>maria</b> / <b>zerowaste123</b>.', 'En Inicio, mira el banner rojo y pulsa <b>Ver alertas</b>.', 'En Alertas, pulsa <b>Ver receta</b> en un alimento que vence hoy.',
          'Lee los ingredientes y pulsa <b>Marcar como cocinada</b>.', 'Ve a <b>Alimentos</b> y prueba el filtro <b>Lácteos</b>.', 'Pulsa <b>Agregar</b>, escribe un alimento y <b>guárdalo</b>.',
          'Entra a <b>Historial</b> y repón un producto pulsando <b>➕ Reponer a despensa</b>.',
          'Abre <b>Estadísticas</b> y cambia entre Semana, Mes y Año.', 'Pulsa <b>Cerrar sesión</b>.'];
        return '<p class="zwt-lead">Haz este recorrido de unos <b>5 minutos</b> y habrás usado todas las pantallas. Marca cada paso cuando lo hagas.</p>' +
          '<ul class="zwt-route">' + items.map(function (t) { return '<li><label><input type="checkbox"> <span>' + t + '</span></label></li>'; }).join('') + '</ul>' +
          '<h3>Problemas frecuentes</h3><div class="zwt-faq">' +
          '<details><summary>La página no carga datos o aparece un error</summary><p>La aplicación necesita su servidor encendido. En la carpeta del proyecto ejecuta <code>npm run demo</code> (o haz doble clic en <code>iniciar_demo.bat</code>) y abre <code>http://localhost:3000/01-bienvenida/index.html</code>. No funciona abriendo los archivos con doble clic.</p></details>' +
          '<details><summary>No puedo iniciar sesión</summary><p>Prueba con <b>maria</b> y <b>zerowaste123</b>. Pulsa el ojo 👁 para comprobar la contraseña y revisa las mayúsculas.</p></details>' +
          '<details><summary>Quiero volver a los datos de ejemplo originales</summary><p>Detén el servidor y ejecuta <code>npm run demo:reset</code>.</p></details>' +
          '<details><summary>¿Cómo cambio mi nombre o correo?</summary><p>Haz clic en tu nombre, arriba a la izquierda del menú lateral, y elige <b>Editar perfil</b>.</p></details>' +
          '<details><summary>Quité un alimento por error</summary><p>Pulsa <b>Deshacer</b> en el mensaje que aparece abajo justo después de quitarlo.</p></details>' +
          '<details><summary>¿Puedo llevarme mis datos?</summary><p>Sí. En <b>Alimentos</b> y en <b>Estadísticas</b> hay botones <b>PDF</b> y <b>Excel</b>.</p></details>' +
          '</div>' +
          '<div class="zwt-done"><img src="' + SHARED + 'logo.jpg" alt=""><div><b>¡Listo, ya sabes usar ZeroWaste!</b><span>Aprovecha lo que tienes. Desperdicia menos.</span></div></div>';
      }
    }
  ];

  /* ---------- Panel ---------- */
  var overlay, navEl, contentEl, scrollEl, btnOpen, btnClose, btnPrev, btnNext, btnGo, countEl, barEl;
  var paso = 0, ultimoFoco = null;

  function construir() {
    overlay = document.createElement('div');
    overlay.className = 'zwt-overlay';
    overlay.id = 'zwTutorial';
    overlay.hidden = true;
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'zwtTitulo');
    overlay.innerHTML =
      '<div class="zwt-panel">' +
        '<aside class="zwt-side">' +
          '<div class="zwt-brand"><img src="' + SHARED + 'logo.jpg" alt=""><div><small>GUÍA PARA PRINCIPIANTES</small><strong id="zwtTitulo">Cómo usar ZeroWaste</strong></div></div>' +
          '<nav aria-label="Pasos del tutorial"><ol id="zwtNav"></ol></nav>' +
        '</aside>' +
        '<section class="zwt-main">' +
          '<div class="zwt-head"><div class="zwt-progress"><span id="zwtCount"></span><div class="zwt-track"><i id="zwtBar"></i></div></div>' +
          '<button type="button" class="zwt-close" id="zwtClose" aria-label="Cerrar tutorial">✕</button></div>' +
          '<div class="zwt-scroll" id="zwtScroll" tabindex="-1"><article id="zwtContent"></article></div>' +
          '<div class="zwt-foot"><button type="button" class="zwt-ghost" id="zwtPrev">← Anterior</button>' +
          '<a class="zwt-go" id="zwtGo" href="#" hidden>Ir a esta pantalla</a>' +
          '<button type="button" class="zwt-solid" id="zwtNext">Siguiente →</button></div>' +
        '</section>' +
      '</div>';
    document.body.appendChild(overlay);

    navEl = overlay.querySelector('#zwtNav');
    contentEl = overlay.querySelector('#zwtContent');
    scrollEl = overlay.querySelector('#zwtScroll');
    btnClose = overlay.querySelector('#zwtClose');
    btnPrev = overlay.querySelector('#zwtPrev');
    btnNext = overlay.querySelector('#zwtNext');
    btnGo = overlay.querySelector('#zwtGo');
    countEl = overlay.querySelector('#zwtCount');
    barEl = overlay.querySelector('#zwtBar');

    navEl.innerHTML = PASOS.map(function (p, i) {
      return '<li><button type="button" data-i="' + i + '"><span class="zwt-num">' + (i + 1) + '</span><span>' + p.nav + '</span></button></li>';
    }).join('');
    navEl.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-i]');
      if (b) ir(+b.dataset.i);
    });
    contentEl.addEventListener('click', function (e) {
      var z = e.target.closest('[data-zoom]');
      if (!z) return;
      var shot = z.closest('figure').querySelector('.zwt-shot');
      var on = shot.classList.toggle('zwt-zoomed');
      z.textContent = on ? 'Reducir captura' : 'Ampliar captura';
    });

    btnClose.addEventListener('click', cerrar);
    overlay.addEventListener('mousedown', function (e) { if (e.target === overlay) cerrar(); });
    btnPrev.addEventListener('click', function () { ir(paso - 1); });
    btnNext.addEventListener('click', function () { paso === PASOS.length - 1 ? cerrar() : ir(paso + 1); });
    document.addEventListener('keydown', teclas);
  }

  function ir(i) {
    paso = Math.max(0, Math.min(PASOS.length - 1, i));
    var p = PASOS[paso];
    contentEl.innerHTML = '<div class="zwt-tag">PASO ' + (paso + 1) + '</div><h2>' + p.titulo + '</h2>' + p.html();
    countEl.textContent = 'Paso ' + (paso + 1) + ' de ' + PASOS.length;
    barEl.style.width = ((paso + 1) / PASOS.length * 100) + '%';
    Array.prototype.forEach.call(navEl.querySelectorAll('button'), function (b, k) {
      b.classList.toggle('zwt-on', k === paso);
      if (k === paso) { b.setAttribute('aria-current', 'step'); if (b.scrollIntoView) b.scrollIntoView({ block: 'nearest', inline: 'center' }); }
      else b.removeAttribute('aria-current');
    });
    btnPrev.disabled = paso === 0;
    btnNext.textContent = paso === PASOS.length - 1 ? 'Terminar ✓' : 'Siguiente →';
    if (p.page && p.page !== pagina) {
      btnGo.hidden = false;
      btnGo.href = ROOT + p.page + '/index.html' + (p.query || '');
      btnGo.textContent = 'Ir a esta pantalla';
    } else {
      btnGo.hidden = true;
    }
    scrollEl.scrollTop = 0;
  }

  function pasoDeEstaPagina() {
    for (var i = 0; i < PASOS.length; i++) if (PASOS[i].page && PASOS[i].page === pagina) return i;
    return 0;
  }

  function cargarCapturas() {
    if (SHOTS) return Promise.resolve();
    return new Promise(function (ok) {
      var s = document.createElement('script');
      s.src = SHARED + 'tutorial/shots.js';
      s.onload = function () { SHOTS = window.ZW_SHOTS || {}; ok(); };
      s.onerror = function () { SHOTS = {}; ok(); };
      document.head.appendChild(s);
    });
  }

  function abrir() {
    ultimoFoco = document.activeElement;
    cargarCapturas().then(function () {
      if (!overlay) construir();
      overlay.hidden = false;
      requestAnimationFrame(function () { overlay.classList.add('zwt-open'); });
      document.body.classList.add('zwt-lock');
      ir(pasoDeEstaPagina());
      btnClose.focus();
      try { localStorage.setItem('zwt_visto', '1'); } catch (e) { /* sin almacenamiento: no pasa nada */ }
      btnOpen.classList.remove('zwt-pulse');
    });
  }
  function cerrar() {
    overlay.classList.remove('zwt-open');
    document.body.classList.remove('zwt-lock');
    var fin = function () { overlay.hidden = true; };
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ? fin() : setTimeout(fin, 200);
    if (ultimoFoco && ultimoFoco.focus) ultimoFoco.focus();
  }

  function teclas(e) {
    if (!overlay || overlay.hidden) return;
    var tag = document.activeElement && document.activeElement.tagName;
    if (e.key === 'Escape') { e.stopPropagation(); cerrar(); }
    else if (e.key === 'ArrowRight' && !/INPUT|SUMMARY/.test(tag)) ir(paso + 1);
    else if (e.key === 'ArrowLeft' && !/INPUT|SUMMARY/.test(tag)) ir(paso - 1);
    else if (e.key === 'Tab') {  // el foco se queda dentro del panel
      var f = Array.prototype.filter.call(overlay.querySelectorAll('button:not([disabled]), a[href], summary, input'), function (el) { return el.offsetParent !== null; });
      if (!f.length) return;
      var a = f[0], z = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    }
  }

  /* ---------- Botón flotante ---------- */
  function crearBoton() {
    btnOpen = document.createElement('button');
    btnOpen.type = 'button';
    btnOpen.id = 'zwTutorialBtn';
    btnOpen.className = 'zwt-btn';
    btnOpen.setAttribute('aria-haspopup', 'dialog');
    btnOpen.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M18 2H8a3 3 0 0 0-3 3v14a3 3 0 0 0 3 3h11a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1h-1Zm-1 2v9l-2.5-1.7L12 13V4h5ZM7 5a1 1 0 0 1 1-1h2v9.2A3 3 0 0 0 7 14.2V5Zm1 15a1 1 0 0 1 0-2h11v2H8Z"/></svg><span>Tutorial</span>';
    btnOpen.addEventListener('click', abrir);
    document.body.appendChild(btnOpen);
    if (!document.querySelector('.sidebar')) document.body.classList.add('zwt-nosidebar');
    var visto = false;
    try { visto = localStorage.getItem('zwt_visto') === '1'; } catch (e) { /* ignorar */ }
    if (!visto) btnOpen.classList.add('zwt-pulse');
  }

  if (document.readyState === 'loading') document.addEventListener("DOMContentLoaded", crearBoton);
  else crearBoton();
})();
