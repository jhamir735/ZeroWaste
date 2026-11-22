/* =============================================
   ZeroWaste – Catálogo de productos de DEMOSTRACIÓN
   Archivo: backend/services/productos.demo.data.js

   Códigos EAN-13 inventados (prefijo 775) con dígito verificador válido.
   Sirven para probar el escáner con la hoja imprimible
   09-escanear/codigos-demo.html. No corresponden a productos reales.
   Para agregar los tuyos, añade una línea con tu código real.
   ============================================= */
'use strict';

module.exports = [
  { codigo: '7750001000013', nombre: 'Leche evaporada entera 400 g', marca: 'Marca demo', categoria: 'lacteos', dias: 180, ubicacion: 'despensa' },
  { codigo: '7750001000020', nombre: 'Leche fresca 1 L', marca: 'Marca demo', categoria: 'lacteos', dias: 7, ubicacion: 'refrigeradora' },
  { codigo: '7750001000037', nombre: 'Yogur natural 1 L', marca: 'Marca demo', categoria: 'lacteos', dias: 14, ubicacion: 'refrigeradora' },
  { codigo: '7750001000044', nombre: 'Queso fresco 250 g', marca: 'Marca demo', categoria: 'lacteos', dias: 10, ubicacion: 'refrigeradora' },
  { codigo: '7750001000051', nombre: 'Mantequilla 200 g', marca: 'Marca demo', categoria: 'lacteos', dias: 45, ubicacion: 'refrigeradora' },
  { codigo: '7750001000068', nombre: 'Huevos pardos x12', marca: 'Marca demo', categoria: 'otros', dias: 21, ubicacion: 'refrigeradora' },
  { codigo: '7750001000075', nombre: 'Pechuga de pollo 1 kg', marca: 'Marca demo', categoria: 'carnes', dias: 3, ubicacion: 'refrigeradora' },
  { codigo: '7750001000082', nombre: 'Carne molida 500 g', marca: 'Marca demo', categoria: 'carnes', dias: 2, ubicacion: 'refrigeradora' },
  { codigo: '7750001000099', nombre: 'Jamón de pavo 200 g', marca: 'Marca demo', categoria: 'carnes', dias: 10, ubicacion: 'refrigeradora' },
  { codigo: '7750001000105', nombre: 'Atún en aceite 170 g', marca: 'Marca demo', categoria: 'carnes', dias: 720, ubicacion: 'despensa' },
  { codigo: '7750001000112', nombre: 'Arroz extra 1 kg', marca: 'Marca demo', categoria: 'cereales', dias: 365, ubicacion: 'despensa' },
  { codigo: '7750001000129', nombre: 'Fideos spaghetti 500 g', marca: 'Marca demo', categoria: 'cereales', dias: 540, ubicacion: 'despensa' },
  { codigo: '7750001000136', nombre: 'Lentejas 500 g', marca: 'Marca demo', categoria: 'cereales', dias: 365, ubicacion: 'despensa' },
  { codigo: '7750001000143', nombre: 'Avena en hojuelas 500 g', marca: 'Marca demo', categoria: 'cereales', dias: 270, ubicacion: 'despensa' },
  { codigo: '7750001000150', nombre: 'Pan de molde integral', marca: 'Marca demo', categoria: 'cereales', dias: 7, ubicacion: 'despensa' },
  { codigo: '7750001000167', nombre: 'Galletas de soda', marca: 'Marca demo', categoria: 'cereales', dias: 120, ubicacion: 'despensa' },
  { codigo: '7750001000174', nombre: 'Jugo de naranja 1 L', marca: 'Marca demo', categoria: 'bebidas', dias: 10, ubicacion: 'refrigeradora' },
  { codigo: '7750001000181', nombre: 'Gaseosa 1.5 L', marca: 'Marca demo', categoria: 'bebidas', dias: 180, ubicacion: 'despensa' },
  { codigo: '7750001000198', nombre: 'Agua mineral sin gas 625 ml', marca: 'Marca demo', categoria: 'bebidas', dias: 365, ubicacion: 'despensa' },
  { codigo: '7750001000204', nombre: 'Aceite vegetal 1 L', marca: 'Marca demo', categoria: 'otros', dias: 365, ubicacion: 'despensa' },
  { codigo: '7750001000211', nombre: 'Azúcar rubia 1 kg', marca: 'Marca demo', categoria: 'otros', dias: 730, ubicacion: 'despensa' },
  { codigo: '7750001000228', nombre: 'Mermelada de fresa 300 g', marca: 'Marca demo', categoria: 'otros', dias: 365, ubicacion: 'despensa' }
];
