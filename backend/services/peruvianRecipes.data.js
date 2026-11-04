/* =============================================
   ZeroWaste – Catálogo de Recetas Peruanas Auténticas
   Archivo: backend/services/peruvianRecipes.data.js
   Optimizadas para aprovechar alimentos de la despensa
   ============================================= */
'use strict';

const PERUVIAN_RECIPES = [
  {
    receta_id_externo: 'peru_01',
    origen: 'peruana',
    nombre: 'Lomo Saltado Criollo',
    imagen: 'https://www.themealdb.com/images/media/meals/1529446352.jpg',
    tiempo: '20 min',
    porciones: '2-3 porciones',
    dificultad: 'Media',
    categoria: 'Plato de fondo',
    area: 'Peruana',
    texto_ahorro: 'Aprovecha carne, tomates maduros y cebolla en un salteado rápido a fuego vivo.',
    ingredientes: [
      { nombre: 'Carne de res o molida', cantidad: '300g cortada en tiras' },
      { nombre: 'Tomate', cantidad: '2 unidades cortadas en gajos gruesos' },
      { nombre: 'Cebolla roja', cantidad: '1 unidad en pluma gruesa' },
      { nombre: 'Papa amarilla o blanca', cantidad: '2 unidades fritas o doradas' },
      { nombre: 'Arroz', cantidad: '1 taza cocido' },
      { nombre: 'Sillao o salsa de soya', cantidad: '2 cucharadas' },
      { nombre: 'Vinagre tinto o blanco', cantidad: '1 cucharada' },
      { nombre: 'Aceite de oliva o vegetal', cantidad: '2 cucharadas' },
      { nombre: 'Sal, pimienta y comino', cantidad: 'al gusto' }
    ],
    pasos: [
      'Corta la carne en tiras y sazónala con sal, pimienta y una pizca de comino.',
      'Corta los tomates en gajos gruesos y la cebolla en tiras gruesas para que mantengan su textura crocante.',
      'Calienta la sartén o wok a fuego máximo con aceite hasta que humee ligeramente.',
      'Saltea la carne rápidamente por 2 a 3 minutos hasta dorar por fuera y retira.',
      'En la misma sartén bien caliente saltea la cebolla 1 minuto, añade el tomate, el sillao y el vinagre.',
      'Reincorpora la carne, añade las papas fritas y saltea todo junto durante 30 segundos.',
      'Sirve de inmediato acompañado de arroz blanco caliente.'
    ]
  },
  {
    receta_id_externo: 'peru_02',
    origen: 'peruana',
    nombre: 'Causa Rellena de Pollo y Palta',
    imagen: 'https://www.themealdb.com/images/media/meals/1529444830.jpg',
    tiempo: '30 min',
    porciones: '3 porciones',
    dificultad: 'Fácil',
    categoria: 'Entrada tradicional',
    area: 'Peruana',
    texto_ahorro: 'Salva tus papas amarillas, limón y palta madura en una causa fresca y deliciosa.',
    ingredientes: [
      { nombre: 'Papa amarilla', cantidad: '4 unidades medianas sancochadas' },
      { nombre: 'Palta Hass', cantidad: '1 unidad en rodajas finas' },
      { nombre: 'Limón', cantidad: 'Jugo de 2 unidades' },
      { nombre: 'Pechuga de pollo', cantidad: '1 taza deshilachada o picada' },
      { nombre: 'Huevo', cantidad: '1 unidad sancochado en rodajas' },
      { nombre: 'Aceite de oliva o vegetal', cantidad: '2 cucharadas' },
      { nombre: 'Sal y pimienta', cantidad: 'al gusto' }
    ],
    pasos: [
      'Sancocha las papas amarillas con cáscara. Pélalas aún tibias y prénsalas hasta formar un puré suave sin grumos.',
      'Agrega el jugo de limón, 2 cucharadas de aceite, sal y pimienta. Amasa suavemente hasta lograr una textura maleable.',
      'Mezcla el pollo deshilachado con un toque de limón o mayonesa casera.',
      'En una fuente o aro, coloca una base de puré de papa.',
      'Añade una capa de láminas de palta madura y luego la capa de pollo.',
      'Cubre con otra capa de masa de papa, decora con rodajas de huevo duro y sirve fría.'
    ]
  },
  {
    receta_id_externo: 'peru_03',
    origen: 'peruana',
    nombre: 'Arroz Chaufa Casero Anticrisis',
    imagen: 'https://www.themealdb.com/images/media/meals/wvpsxx1468256321.jpg',
    tiempo: '15 min',
    porciones: '2 porciones',
    dificultad: 'Muy fácil',
    categoria: 'Chifa / Salteado',
    area: 'Peruana',
    texto_ahorro: 'La mejor receta del Perú para aprovechar arroz del día anterior, pollo o carne y huevos.',
    ingredientes: [
      { nombre: 'Arroz', cantidad: '2 tazas cocido del día anterior' },
      { nombre: 'Pechuga de pollo o carne', cantidad: '150g en cubos' },
      { nombre: 'Huevo', cantidad: '2 unidades batidos' },
      { nombre: 'Cebolla roja o cebolla china', cantidad: '1 unidad finamente picada' },
      { nombre: 'Sillao o salsa de soya', cantidad: '3 cucharadas' },
      { nombre: 'Aceite', cantidad: '2 cucharadas' }
    ],
    pasos: [
      'Bate los 2 huevos con una pizca de sal. En una sartén caliente con aceite haz una tortilla delgada, córtala en cuadritos y reserva.',
      'En la misma sartén dora el pollo o carne en cubos sazonado a fuego alto.',
      'Agrega la cebolla picada y remueve por 1 minuto.',
      'Añade el arroz cocido bien desgranado a fuego alto, moviendo constantemente para que tome calor parejo.',
      'Vierte el sillao por los bordes de la sartén para lograr aroma ahumado.',
      'Agrega la tortilla de huevo picada, saltea por 1 minuto más y sirve caliente.'
    ]
  },
  {
    receta_id_externo: 'peru_04',
    origen: 'peruana',
    nombre: 'Ceviche Clásico Fresco',
    imagen: 'https://www.themealdb.com/images/media/meals/1548772327.jpg',
    tiempo: '15 min',
    porciones: '2 porciones',
    dificultad: 'Fácil',
    categoria: 'Plato Marino',
    area: 'Peruana',
    texto_ahorro: 'Aprovecha filetes de pescado fresco o descongelado, limones y cebolla roja crujiente.',
    ingredientes: [
      { nombre: 'Filete de pescado', cantidad: '300g cortado en cubos de 2 cm' },
      { nombre: 'Limón', cantidad: 'Jugo de 6 limones recién exprimidos sin apretar de más' },
      { nombre: 'Cebolla roja', cantidad: '1/2 unidad en juliana bien fina' },
      { nombre: 'Sal y pimienta', cantidad: '1 cucharadita' }
    ],
    pasos: [
      'Corta los filetes de pescado en cubos uniformes y colócalos en un tazón frío.',
      'Sazona generosamente con sal y remueve con una cuchara fría por 1 minuto para que absorba el sazón.',
      'Corta la cebolla roja en juliana fina y lávala con agua helada y sal para mantenerla crocante.',
      'Exprime los limones al instante directamente sobre el pescado.',
      'Agrega la cebolla lavada, mezcla suavemente durante 30 segundos y sirve de inmediato.'
    ]
  },
  {
    receta_id_externo: 'peru_05',
    origen: 'peruana',
    nombre: 'Papa a la Huancaína Rápida',
    imagen: 'https://www.themealdb.com/images/media/meals/1529444830.jpg',
    tiempo: '15 min',
    porciones: '3 porciones',
    dificultad: 'Fácil',
    categoria: 'Entrada tradicional',
    area: 'Peruana',
    texto_ahorro: 'Usa queso fresco, leche y papas amarillas para una crema huancaína suave y reconfortante.',
    ingredientes: [
      { nombre: 'Papa amarilla o blanca', cantidad: '4 unidades sancochadas' },
      { nombre: 'Queso fresco', cantidad: '150g desmenuzado' },
      { nombre: 'Leche entera', cantidad: '1/2 taza' },
      { nombre: 'Aceite de oliva', cantidad: '2 cucharadas' },
      { nombre: 'Huevo', cantidad: '1 unidad sancochado' }
    ],
    pasos: [
      'Sancocha las papas en agua con sal hasta que estén suaves pero firmes. Pélalas y córtalas en rodajas.',
      'En el vaso de la licuadora coloca el queso fresco en trozos y la leche.',
      'Licúa agregando el aceite en forma de hilo hasta obtener una crema espesa y aterciopelada.',
      'Acomoda las rodajas de papa en un plato.',
      'Baña con abundante salsa huancaína y decora con rodajas de huevo duro.'
    ]
  },
  {
    receta_id_externo: 'peru_06',
    origen: 'peruana',
    nombre: 'Aguadito Criollo de Pollo y Verduras',
    imagen: 'https://www.themealdb.com/images/media/meals/1529446352.jpg',
    tiempo: '30 min',
    porciones: '4 porciones',
    dificultad: 'Media',
    categoria: 'Sopa reconstituyente',
    area: 'Peruana',
    texto_ahorro: 'Excelente para rescatar verduras, pollo y arroz en una sopa nutritiva y reconfortante.',
    ingredientes: [
      { nombre: 'Pechuga de pollo', cantidad: '250g en trozos medianos' },
      { nombre: 'Arroz', cantidad: '1/2 taza' },
      { nombre: 'Papa amarilla', cantidad: '2 unidades en mitades' },
      { nombre: 'Zanahoria fresca', cantidad: '1 unidad en cubitos' },
      { nombre: 'Cebolla roja', cantidad: '1/2 unidad picadita' },
      { nombre: 'Limón', cantidad: '1 unidad para servir' }
    ],
    pasos: [
      'En una olla con una cucharadita de aceite dora la cebolla picada.',
      'Añade el pollo y sofríe 3 minutos hasta sellar.',
      'Vierte 1 litro de agua, agrega el arroz y la zanahoria picada en cubos.',
      'Deja hervir a fuego medio durante 15 minutos.',
      'Añade la papa amarilla y cocina 10 minutos más hasta que la papa esté suave y espese el caldo.',
      'Sirve bien caliente con unas gotas de limón fresco.'
    ]
  },
  {
    receta_id_externo: 'peru_07',
    origen: 'peruana',
    nombre: 'Tortilla Criolla con Tomate y Espinaca',
    imagen: 'https://www.themealdb.com/images/media/meals/1525876468.jpg',
    tiempo: '12 min',
    porciones: '2 porciones',
    dificultad: 'Muy fácil',
    categoria: 'Desayuno o Cena ligera',
    area: 'Peruana',
    texto_ahorro: 'Rescata tomates, espinacas o lechuga y huevos en un platillo nutritivo y rápido.',
    ingredientes: [
      { nombre: 'Huevo', cantidad: '2 o 3 unidades frescos' },
      { nombre: 'Tomate', cantidad: '1 unidad picado en cubos' },
      { nombre: 'Espinaca fresca o lechuga', cantidad: '1 taza picada en tiras' },
      { nombre: 'Queso fresco', cantidad: '50g desmenuzado (opcional)' },
      { nombre: 'Sal y orégano', cantidad: 'al gusto' }
    ],
    pasos: [
      'Bate los huevos en un bol con sal, pimienta y orégano seco frotado con las manos.',
      'Añade los tomates picados, las espinacas limpias y el queso fresco.',
      'Calienta una sartén con poco aceite a fuego medio.',
      'Vierte la mezcla y cocina 3 minutos hasta que la base esté dorada y firme.',
      'Voltea con la ayuda de un plato y cocina 2 minutos por el otro lado.'
    ]
  },
  {
    receta_id_externo: 'peru_08',
    origen: 'peruana',
    nombre: 'Panqueques de Plátano Maduro y Avena',
    imagen: 'https://www.themealdb.com/images/media/meals/rwuyqx1511383174.jpg',
    tiempo: '10 min',
    porciones: '2 porciones',
    dificultad: 'Muy fácil',
    categoria: 'Desayuno saludable',
    area: 'Peruana',
    texto_ahorro: 'Salva plátanos manchados o muy maduros sin necesidad de añadir azúcar.',
    ingredientes: [
      { nombre: 'Plátano de seda', cantidad: '2 unidades bien maduros' },
      { nombre: 'Avena en hojuelas', cantidad: '1 taza' },
      { nombre: 'Huevo', cantidad: '2 unidades' },
      { nombre: 'Leche entera', cantidad: '2 cucharadas (opcional)' }
    ],
    pasos: [
      'Tritura los plátanos con un tenedor en un plato hondo hasta lograr un puré espeso.',
      'Agrega los 2 huevos y mezcla vigorosamente.',
      'Incorpora la avena en hojuelas y mezcla hasta que absorba la humedad.',
      'Calienta una sartén antiadherente a fuego bajo.',
      'Vierte porciones de masa y cocina 2 minutos por lado hasta que salgan burbujas y dore suavemente.'
    ]
  },
  {
    receta_id_externo: 'peru_09',
    origen: 'peruana',
    nombre: 'Tallarines Saltados con Pollo y Verduras',
    imagen: 'https://www.themealdb.com/images/media/meals/wvpsxx1468256321.jpg',
    tiempo: '20 min',
    porciones: '2-3 porciones',
    dificultad: 'Fácil',
    categoria: 'Plato de fondo',
    area: 'Peruana',
    texto_ahorro: 'Aprovecha tu pechuga de pollo, fideos o pastas, zanahoria y cebolla roja en un salteado criollo.',
    ingredientes: [
      { nombre: 'Pechuga de pollo', cantidad: '200g cortada en tiras' },
      { nombre: 'Fideos espagueti o pastas artesanales', cantidad: '200g sancochados al dente' },
      { nombre: 'Zanahoria fresca', cantidad: '1 unidad en bastones finos' },
      { nombre: 'Cebolla roja', cantidad: '1 unidad en pluma gruesa' },
      { nombre: 'Aceite de oliva o vegetal', cantidad: '2 cucharadas' },
      { nombre: 'Sal y pimienta al gusto', cantidad: 'al gusto' }
    ],
    pasos: [
      'Sancocha los fideos o pastas en abundante agua con sal hasta que estén al dente, cuela y reserva.',
      'Corta la pechuga de pollo en tiras finas y sazónala con sal y pimienta.',
      'En una sartén grande o wok calienta el aceite a fuego alto hasta que humee.',
      'Saltea el pollo durante 3 a 4 minutos hasta dorar.',
      'Agrega la zanahoria en tiras y la cebolla roja, salteando por 2 minutos para que queden crocantes.',
      'Incorpora los fideos cocidos, mezcla todo a fuego vivo por 1 minuto y sirve de inmediato.'
    ]
  },
  {
    receta_id_externo: 'peru_10',
    origen: 'peruana',
    nombre: 'Pechuga a la Plancha con Papas Amarillas y Ensalada',
    imagen: 'https://www.themealdb.com/images/media/meals/syqypv1486981727.jpg',
    tiempo: '25 min',
    porciones: '2 porciones',
    dificultad: 'Fácil',
    categoria: 'Almuerzo completo',
    area: 'Peruana',
    texto_ahorro: 'Almuerzo balanceado 100% de tu despensa: pollo, papas amarillas, lechuga y limón.',
    ingredientes: [
      { nombre: 'Pechuga de pollo', cantidad: '2 filetes' },
      { nombre: 'Papa amarilla', cantidad: '3 unidades sancochadas o doradas' },
      { nombre: 'Lechuga Americana', cantidad: '4 hojas frescas lavadas' },
      { nombre: 'Limón Tahití', cantidad: 'Jugo de 2 limones para el aliño' },
      { nombre: 'Aceite de oliva o vegetal', cantidad: '1 cucharada' },
      { nombre: 'Sal y pimienta', cantidad: 'al gusto' }
    ],
    pasos: [
      'Sancocha las papas amarillas con una pizca de sal por 15 minutos hasta que estén suaves.',
      'Condimenta los filetes de pechuga con sal, pimienta y unas gotas de limón.',
      'En una sartén bien caliente con unas gotas de aceite dora los filetes 4 minutos por lado.',
      'Lava y troza la lechuga americana, alíñala con el jugo de limón, un chorrito de aceite y sal.',
      'Sirve los filetes jugosos acompañados de las papas amarillas en mitades y la ensalada fresca.'
    ]
  },
  {
    receta_id_externo: 'peru_11',
    origen: 'peruana',
    nombre: 'Tortilla Criolla de Huevos y Zanahoria Rallada',
    imagen: 'https://www.themealdb.com/images/media/meals/1525876468.jpg',
    tiempo: '10 min',
    porciones: '2 porciones',
    dificultad: 'Muy fácil',
    categoria: 'Desayuno o Cena',
    area: 'Peruana',
    texto_ahorro: 'Salva huevos y zanahorias frescas en una tortilla esponjosa y nutritiva.',
    ingredientes: [
      { nombre: 'Huevos de corral', cantidad: '3 unidades' },
      { nombre: 'Zanahoria fresca', cantidad: '1 unidad finamente rallada' },
      { nombre: 'Cebolla roja', cantidad: '1/4 de unidad picada finita' },
      { nombre: 'Aceite de oliva o vegetal', cantidad: '1 cucharada' },
      { nombre: 'Sal y pimienta', cantidad: 'al gusto' }
    ],
    pasos: [
      'Bate los huevos vigorosamente en un tazón hondo hasta espumar.',
      'Ralla la zanahoria fresca y agrégala junto con la cebolla roja picada a los huevos batidos.',
      'Sazona con sal y pimienta al gusto.',
      'Calienta la sartén con una cucharada de aceite a fuego medio-bajo.',
      'Vierte la preparación, tapa y cocina 3 minutos hasta que cuaje. Voltea con cuidado y dora 2 minutos más.'
    ]
  },
  {
    receta_id_externo: 'peru_12',
    origen: 'peruana',
    nombre: 'Ensalada Waldorf Criolla con Yogur y Frutas',
    imagen: 'https://www.themealdb.com/images/media/meals/1529444830.jpg',
    tiempo: '8 min',
    porciones: '2 porciones',
    dificultad: 'Muy fácil',
    categoria: 'Entrada o Cena ligera',
    area: 'Peruana',
    texto_ahorro: 'Salva lechuga americana, manzana royal gala y yogur natural antes de su fecha de vencimiento.',
    ingredientes: [
      { nombre: 'Lechuga Americana', cantidad: '4 hojas cortadas en trozos' },
      { nombre: 'Manzana Royal Gala', cantidad: '1 unidad cortada en dados' },
      { nombre: 'Yogur natural', cantidad: '3 cucharadas para el aderezo' },
      { nombre: 'Jugo de naranja o Limón Tahití', cantidad: '1 cucharada' }
    ],
    pasos: [
      'Lava bien las hojas de lechuga americana y córtalas con las manos en trozos medianos.',
      'Corta la manzana en dados medianos y rocíala con unas gotas de limón para que no se oxide.',
      'En un tazón pequeño mezcla el yogur natural con el jugo de naranja o limón y una pizca de sal.',
      'Une la lechuga y la manzana en un plato hondo.',
      'Baña con el aderezo cremoso de yogur y disfruta de inmediato bien fresco.'
    ]
  },
  {
    receta_id_externo: 'peru_13',
    origen: 'peruana',
    nombre: 'Batido Refrescante de Plátano, Manzana y Yogur',
    imagen: 'https://www.themealdb.com/images/media/meals/rwuyqx1511383174.jpg',
    tiempo: '5 min',
    porciones: '2 vasos',
    dificultad: 'Muy fácil',
    categoria: 'Bebida saludable',
    area: 'Peruana',
    texto_ahorro: '¡Salva el plátano que vence hoy, la manzana y el yogur en un batido cremoso y delicioso!',
    ingredientes: [
      { nombre: 'Plátano de seda', cantidad: '2 unidades maduros (aprovecha los que vencen hoy)' },
      { nombre: 'Manzana Royal Gala', cantidad: '1 unidad pelada y picada' },
      { nombre: 'Yogur natural', cantidad: '1 vaso' },
      { nombre: 'Leche entera o Jugo de naranja', cantidad: '1/2 vaso' },
      { nombre: 'Cubos de hielo al gusto', cantidad: 'al gusto' }
    ],
    pasos: [
      'Pela los plátanos de seda maduros y trocea la manzana.',
      'Coloca las frutas en el vaso de la licuadora.',
      'Añade el yogur natural y la leche o jugo de naranja.',
      'Licúa a velocidad máxima durante 1 minuto hasta lograr una textura cremosa y uniforme.',
      'Sirve frío en vasos altos y disfruta un desayuno anti-desperdicio.'
    ]
  },
  {
    receta_id_externo: 'peru_14',
    origen: 'peruana',
    nombre: 'Sopa Criolla de Pollo, Fideos y Papa Amarilla',
    imagen: 'https://www.themealdb.com/images/media/meals/1529446352.jpg',
    tiempo: '25 min',
    porciones: '3-4 platos',
    dificultad: 'Fácil',
    categoria: 'Sopa reconfortante',
    area: 'Peruana',
    texto_ahorro: 'Sopa caliente 100% con tu despensa: pechuga, fideos espagueti, papa amarilla y zanahoria.',
    ingredientes: [
      { nombre: 'Pechuga de pollo', cantidad: '200g cortada en dados' },
      { nombre: 'Papa amarilla', cantidad: '2 unidades en mitades' },
      { nombre: 'Fideos espagueti o pastas artesanales', cantidad: '80g partidos' },
      { nombre: 'Zanahoria fresca', cantidad: '1 unidad en cubitos' },
      { nombre: 'Huevos de corral', cantidad: '1 unidad batido al final' },
      { nombre: 'Sal y orégano', cantidad: 'al gusto' }
    ],
    pasos: [
      'En una olla pon a hervir 1 litro de agua con sal.',
      'Agrega los trozos de pechuga de pollo y la zanahoria picada; cocina 10 minutos.',
      'Añade las papas amarillas en mitades y deja cocinar 8 minutos hasta que comiencen a suavizar.',
      'Incorpora los fideos partidos y cocina 6 minutos más hasta que estén suaves.',
      'Apaga el fuego, vierte el huevo batido en forma de hilo mientras remueves con una cuchara.',
      'Termina con una pizca de orégano seco y sirve bien caliente.'
    ]
  }
];

module.exports = PERUVIAN_RECIPES;

