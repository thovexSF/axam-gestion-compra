import axios from 'axios';
import ExcelJS from 'exceljs';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🚀 Iniciando generación de Excel...');

    // Fechas
    const today = new Date();
    const day = today.getDate().toString().padStart(2, '0');
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const year = today.getFullYear();
    const todayFormatted = `${year}${month}${day}`;

    // Configurar autorización
    const authorization = {
      'Authorization': `Bearer ${process.env.MANAGERMAS_TOKEN || 'demo-token'}`
    };

    console.log('📊 Obteniendo datos de ventas...');
    
    // Obtener ventas de los últimos 4 meses
    const dates = [];
    for (let i = 3; i >= 0; i--) {
      let firstDay = new Date(today.getFullYear(), today.getMonth() - i, 1);
      let lastDay = new Date(today.getFullYear(), today.getMonth() - i + 1, 0);
      
      let formattedFirstDay = `${firstDay.getFullYear()}${String(firstDay.getMonth() + 1).padStart(2, '0')}01`;
      let formattedLastDay = `${lastDay.getFullYear()}${String(lastDay.getMonth() + 1).padStart(2, '0')}${String(lastDay.getDate()).padStart(2, '0')}`;
      
      dates.push({ firstDay: formattedFirstDay, lastDay: formattedLastDay });
    }

    const sales = await Promise.all(
      dates.map(dateRange => 
        axios.get(`https://axam.managermas.cl/api/sales/76299574-3/?from=${dateRange.firstDay}&to=${dateRange.lastDay}`, {headers: authorization})
          .then(response => response.data.data)
          .catch(() => [])
      )
    );

    console.log('📦 Obteniendo productos...');
    const products = await axios.get('https://axam.managermas.cl/api/products/76299574-3', {headers: authorization})
      .then(response => response.data.data)
      .catch(() => []);

    console.log('📋 Obteniendo stock...');
    const stock = await axios.get(`https://axam.managermas.cl/api/stock/76299574-3/?dt=${todayFormatted}`, {headers: authorization})
      .then(response => response.data.data)
      .catch(() => []);

    console.log('🔄 Procesando datos...');

    // Agrupar ventas por código
    const monthlySalesGroupedByCode = sales.map(monthSales => {
      return monthSales.reduce((accumulator, doc) => {
        const code = doc.cod_prod;
        if (code) {
          accumulator[code] = (accumulator[code] || 0) + doc.cantidad;
        }
        return accumulator;
      }, {});
    });

    // Crear mapa de stock
    const stockMap = new Map();
    stock.forEach(item => {
      if (item.cod_prod) {
        stockMap.set(item.cod_prod, item.saldo || 0);
      }
    });

    // Crear mapa de productos
    const productsMap = new Map(products.map(product => [product.codigo_prod, product]));

    // Nombres de meses
    const lastMonths = ['Julio', 'Agosto', 'Septiembre', 'Octubre'];

    // Obtener códigos únicos
    const uniqueCodes = new Set();
    monthlySalesGroupedByCode.forEach(monthData => {
      Object.keys(monthData).forEach(code => uniqueCodes.add(code));
    });
    stockMap.forEach((value, code) => uniqueCodes.add(code));

    console.log(`📊 Procesando ${uniqueCodes.size} productos únicos...`);

    // Crear datos finales
    const finalData = Array.from(uniqueCodes).map(code => {
      const data = {
        'CÓDIGO': code,
        'PENDIENTES': 0,
        'STOCK': 0,
        'ÚLTIMA COMPRA CLP': 0,
        'FAMILIA': '',
        'DESCRIPCIÓN': ''
      };

      // Inicializar ventas mensuales
      lastMonths.forEach(month => {
        data[month] = 0;
      });

      // Ventas mensuales
      monthlySalesGroupedByCode.forEach((monthData, index) => {
        const monthName = lastMonths[index];
        if (monthData[code]) {
          data[monthName] = monthData[code];
        }
      });

      // Stock
      const stockValue = stockMap.get(code) || 0;
      data['STOCK'] = stockValue;

      // Información del producto
      const productInfo = productsMap.get(code);
      if (productInfo) {
        data['FAMILIA'] = productInfo.familia || '';
        data['DESCRIPCIÓN'] = productInfo.nombre || '';
      }

      return data;
    });

    console.log('📊 Generando Excel...');
    
    // GENERAR EXCEL
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Compra Sugerida');

    // Headers
    const headers = ['CÓDIGO', 'PENDIENTES', 'STOCK', 'ÚLTIMA COMPRA CLP', 'FAMILIA', 'DESCRIPCIÓN', ...lastMonths];
    worksheet.addRow(headers);

    // Estilo de headers
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4CAF50' }
    };

    // Datos
    finalData.forEach(row => {
      const values = headers.map(header => row[header] || 0);
      worksheet.addRow(values);
    });

    // Auto ajustar columnas
    worksheet.columns.forEach(column => {
      column.width = 15;
    });

    // GENERAR BUFFER
    const buffer = await workbook.xlsx.writeBuffer();
    
    console.log('✅ Excel generado exitosamente!');

    // Enviar respuesta
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="compra_sugerida_${todayFormatted}.xlsx"`);
    res.send(buffer);

  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ 
      error: 'Error generando Excel', 
      details: error.message 
    });
  }
}
