import { chromium } from 'playwright';
import axios from 'axios';
import ExcelJS from 'exceljs';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Obtener credenciales del body
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  let browser;
  
  try {
    // Configurar Playwright para Vercel
    browser = await chromium.launch({
      headless: true, // Mantener headless para Railway
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-extensions',
        '--disable-plugins',
        '--disable-images',
        '--disable-javascript',
        '--disable-default-apps',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding'
      ]
    });
    
    const context = await browser.newContext();
    const page = await context.newPage();

    // Usar credenciales del request
    const authInfo = {
      username: username,
      password: password,
    };

    // Fechas
    const today = new Date();
    const day = today.getDate().toString().padStart(2, '0');
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const year = today.getFullYear();
    const todayFormatted = `${year}${month}${day}`;

    // Función para parsear precios
    function parsePrice(priceStr) {
      if (!priceStr || priceStr === '' || priceStr === null || priceStr === undefined) {
        return 0;
      }
      const str = String(priceStr);
      let normalized = str.replace(/\./g, '');
      normalized = normalized.replace(',', '.');
      return parseFloat(normalized) || 0;
    }

    // LOGIN
    console.log('🌐 Iniciando login...');
    await page.goto('https://axam.managermas.cl/login/');
    
    // LOGIN AUTOMÁTICO
    console.log('⏳ Iniciando login automático...');
    
    // Wait for login form to load
    await page.waitForSelector('input[name="username"], input[type="email"], input[type="text"]', { timeout: 10000 });
    
    // Fill username
    await page.fill('input[name="username"], input[type="email"], input[type="text"]', authInfo.username);
    console.log('👤 Username filled');
    
    // Fill password
    await page.fill('input[name="password"], input[type="password"]', authInfo.password);
    console.log('🔑 Password filled');
    
    // Check for reCAPTCHA v2 (both visible and invisible)
    console.log('🤖 Verificando reCAPTCHA...');
    const recaptchaInfo = await page.evaluate(() => {
      const recaptchaFrame = document.querySelector('iframe[src*="recaptcha"]');
      const recaptchaResponse = document.querySelector('#g-recaptcha-response');
      const recaptchaElement = document.querySelector('[data-sitekey]');
      
      return {
        hasFrame: !!recaptchaFrame,
        hasResponse: !!recaptchaResponse,
        hasElement: !!recaptchaElement,
        siteKey: recaptchaElement ? recaptchaElement.getAttribute('data-sitekey') : null
      };
    });
    
    if (recaptchaInfo.hasFrame || recaptchaInfo.hasElement) {
      console.log('🤖 reCAPTCHA v2 detectado');
      if (recaptchaInfo.siteKey) {
        console.log(`🤖 Site key: ${recaptchaInfo.siteKey}`);
      }
      
      // Wait a bit for invisible reCAPTCHA to solve itself
      console.log('🤖 Esperando que reCAPTCHA se resuelva automáticamente...');
      
      // Simulate some user interactions that might help invisible reCAPTCHA
      await page.mouse.move(100, 100);
      await page.waitForTimeout(1000);
      await page.mouse.move(200, 200);
      await page.waitForTimeout(1000);
      
      // Move mouse over the form area to trigger reCAPTCHA
      const form = await page.$('form');
      if (form) {
        const box = await form.boundingBox();
        if (box) {
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
          await page.waitForTimeout(2000);
        }
      }
      
      await page.waitForTimeout(2000);
      
      // Check if reCAPTCHA was solved
      const recaptchaSolved = await page.evaluate(() => {
        const response = document.querySelector('#g-recaptcha-response');
        return response && response.value && response.value.length > 0;
      });
      
      if (recaptchaSolved) {
        console.log('✅ reCAPTCHA resuelto automáticamente');
      } else {
        console.log('⚠️ reCAPTCHA no se resolvió automáticamente');
        
        // Check if it's a visible reCAPTCHA checkbox that needs to be clicked
        const visibleRecaptcha = await page.$('.recaptcha-checkbox-border, .g-recaptcha');
        if (visibleRecaptcha) {
          console.log('🤖 Detectado reCAPTCHA visible, intentando hacer clic...');
          try {
            await visibleRecaptcha.click();
            console.log('🤖 Clic en reCAPTCHA realizado');
            
            // Wait for reCAPTCHA to be solved after click
            await page.waitForTimeout(3000);
            
            // Check again if it's solved
            const recaptchaSolvedAfterClick = await page.evaluate(() => {
              const response = document.querySelector('#g-recaptcha-response');
              return response && response.value && response.value.length > 0;
            });
            
            if (recaptchaSolvedAfterClick) {
              console.log('✅ reCAPTCHA resuelto después del clic');
            } else {
              console.log('⚠️ reCAPTCHA aún no resuelto después del clic');
            }
          } catch (e) {
            console.log('⚠️ Error al hacer clic en reCAPTCHA:', e.message);
          }
        } else {
          console.log('🤖 reCAPTCHA invisible detectado, continuando...');
        }
      }
    } else {
      console.log('✅ No se detectó reCAPTCHA');
    }
    
    // Click login button
    await page.click('button[type="submit"], input[type="submit"], button:has-text("Login"), button:has-text("Entrar")');
    console.log('🚀 Login button clicked');
    
    // Wait for navigation after login
    try {
      await page.waitForNavigation({ waitUntil: 'load', timeout: 10000 });
      console.log('✅ Login successful! Redirected to dashboard');
    } catch (e) {
      console.log('⚠️ Navigation timeout, but login might have succeeded');
    }
    
    // Detectar login exitoso con lógica mejorada
    console.log('🔍 Verificando estado del login...');
    
    let loginDetected = false;
    let attempts = 0;
    const maxAttempts = 60; // 3 minutos max wait (reducido de 15 minutos)
    
    while (attempts < maxAttempts && !loginDetected) {
      const currentUrl = page.url();
      console.log(`🔍 URL actual: ${currentUrl}`);
      
      // Verificar si ya no estamos en la página de login
      if (!currentUrl.includes('/login') && !currentUrl.includes('login')) {
        loginDetected = true;
        console.log(`✅ Login detectado por redirección! URL: ${currentUrl}`);
        break;
      }
      
      // Verificar si hay elementos que indiquen login exitoso
      const loginSuccessSelectors = [
        'a[href*="logout"]',
        'a[href*="salir"]', 
        'button[onclick*="logout"]',
        '.user-menu',
        '.profile',
        '[class*="dashboard"]',
        '[class*="menu"]',
        'nav',
        '.navbar',
        'a[href*="dashboard"]',
        'a[href*="home"]',
        '.main-content',
        '.content'
      ];
      
      for (const selector of loginSuccessSelectors) {
        try {
          const element = await page.$(selector);
          if (element) {
            loginDetected = true;
            console.log(`✅ Login detectado por elemento: ${selector}`);
            break;
          }
        } catch (e) {
          // Continuar con el siguiente selector
        }
      }
      
      // Verificar si hay mensajes de error de login
      const errorSelectors = [
        '.error',
        '.alert-danger',
        '.login-error',
        '[class*="error"]',
        'text="Invalid"',
        'text="Error"',
        'text="Incorrect"'
      ];
      
      for (const selector of errorSelectors) {
        try {
          const errorElement = await page.$(selector);
          if (errorElement) {
            const errorText = await errorElement.textContent();
            console.log(`❌ Error de login detectado: ${errorText}`);
            throw new Error(`Login failed: ${errorText}`);
          }
        } catch (e) {
          // Continuar verificando
        }
      }
      
      if (!loginDetected) {
        attempts++;
        if (attempts % 10 === 0) {
          console.log(`⏳ Esperando login... (${attempts * 3}s)`);
        }
        await page.waitForTimeout(3000);
      }
    }
    
    if (!loginDetected) {
      console.log('❌ Login timeout - no se pudo detectar login exitoso');
      throw new Error('Login timeout - no se pudo completar el proceso de login');
    }

    // OBTENER DESPACHOS PENDIENTES
    console.log('📦 Obteniendo despachos pendientes...');
    await page.goto('https://axam.managermas.cl/reporting/E/INF/despachos_pendientes/');
    
    await page.waitForSelector('#id_fecha_desde');
    await page.fill('#id_fecha_desde', '01/07/2025');
    await page.fill('#id_fecha_hasta', '21/10/2025');
    
    await page.evaluate(() => {
      $("#frm_generar_grilla_despachos_pendientes").submit();
    });
    
    await page.waitForNavigation({ waitUntil: 'load', timeout: 60000 });
    
    const pendingShipments = await page.evaluate(() => {
      const headers = generic_table.columns().header().toArray().map(header => header.textContent.trim());
      const rows = generic_table.rows().data().toArray().slice(0, -1);
      const columnIndices = [2, 10];
      
      return rows.map(row => {
        const document = {};
        columnIndices.forEach(index => {
          const header = headers[index];
          const value = row[index];
          if (header && value) {
            document[header] = value.trim();
          }
        });
        return document;
      }).filter(doc => Object.keys(doc).length > 0);
    });

    // OBTENER STOCK
    console.log('📋 Obteniendo stock...');
    await page.goto('https://axam.managermas.cl/reporting/E/INF/stock_fisico/');
    
    await page.click("[for='id_chk_incl_stock_bodega_temporal']");
    await page.click("[for='id_chk_show_empty_products']");
    
    await page.evaluate(() => {
      $("#frm_generar_grilla_stock_fisico").submit();
    });
    
    await page.waitForNavigation({ waitUntil: 'load', timeout: 60000 });
    
    const stock = await page.evaluate(() => {
      const headers = generic_table.columns().header().toArray().map(header => header.textContent.trim());
      const bodegaIndex = headers.indexOf('Bodega');
      const allRows = generic_table.rows().data().toArray().slice(0, -1);
      
      // Filtrar filas "Total" para evitar duplicados
      const rows = allRows.filter(row => {
        const bodega = row[bodegaIndex];
        return bodega && bodega.trim() !== '';
      });
      
      const targetHeaders = ['Producto', 'Ultima comp. PESO CHILENO', 'Saldo stock'];
      const columnIndices = targetHeaders.map(header => headers.indexOf(header));
      
      return rows.map(row => {
        const document = {};
        columnIndices.forEach(index => {
          const header = headers[index];
          const value = row[index];
          if (header && value) {
            if (header === 'Producto') {
              const productCode = (value || '').toString().trim().split(' - ')[0];
              document['CÓDIGO'] = productCode;
            } else if (header === 'Ultima comp. PESO CHILENO') {
              document['ÚLTIMA COMPRA CLP'] = (value || '').toString().trim();
            } else if (header === 'Saldo stock') {
              document['STOCK'] = (value || '').toString().trim();
            } else {
              document[header] = (value || '').toString().trim();
            }
          }
        });
        return document;
      }).filter(doc => doc['CÓDIGO']);
    });

    // OBTENER VENTAS (API)
    console.log('📈 Obteniendo ventas...');
    const dates = [];
    for (let i = 3; i >= 0; i--) {
      let firstDay = new Date(today.getFullYear(), today.getMonth() - i, 1);
      let lastDay = new Date(today.getFullYear(), today.getMonth() - i + 1, 0);
      
      let formattedFirstDay = `${firstDay.getFullYear()}${String(firstDay.getMonth() + 1).padStart(2, '0')}01`;
      let formattedLastDay = `${lastDay.getFullYear()}${String(lastDay.getMonth() + 1).padStart(2, '0')}${String(lastDay.getDate()).padStart(2, '0')}`;
      
      dates.push({ firstDay: formattedFirstDay, lastDay: formattedLastDay });
    }

    const authorization = {
      'Authorization': `Bearer ${process.env.MANAGERMAS_TOKEN || 'your-token-here'}`
    };

    const sales = await Promise.all(
      dates.map(dateRange => 
        axios.get(`https://axam.managermas.cl/api/sales/76299574-3/?from=${dateRange.firstDay}&to=${dateRange.lastDay}`, {headers: authorization})
          .then(response => response.data.data)
          .catch(() => [])
      )
    );

    // OBTENER PRODUCTOS
    console.log('📦 Obteniendo productos...');
    const products = await axios.get('https://axam.managermas.cl/api/products/76299574-3', {headers: authorization})
      .then(response => response.data.data)
      .catch(() => []);

    // PROCESAR DATOS
    console.log('🔄 Procesando datos...');
    
    // Agrupar despachos pendientes
    const pendingShipmentsGrouped = pendingShipments.reduce((accumulator, doc) => {
      let existing = accumulator.find(item => item['CÓDIGO'] === doc['Código producto']);
      doc['Cant. pendiente acumulada'] = parseInt(doc['Cant. pendiente acumulada'], 10);
      if (existing) {
        existing.PENDIENTES += doc['Cant. pendiente acumulada'];
      } else {
        accumulator.push({
          CÓDIGO: doc['Código producto'],
          PENDIENTES: doc['Cant. pendiente acumulada']
        });
      }
      return accumulator;
    }, []);

    // Crear mapa de stock
    const stockMap = new Map();
    stock.forEach(doc => {
      const codigo = doc['CÓDIGO'];
      if (codigo) {
        const stockStr = (doc['STOCK'] || '0').toString();
        const stockValue = parseFloat(stockStr.replace(/\./g, ''));
        stockMap.set(codigo, stockValue);
      }
    });

    // Agrupar ventas
    const monthlySalesGroupedByCode = sales.map(monthSales => {
      return monthSales.reduce((accumulator, doc) => {
        const code = doc.cod_prod;
        if (code) {
          accumulator[code] = (accumulator[code] || 0) + doc.cantidad;
        }
        return accumulator;
      }, {});
    });

    // Crear mapa de productos
    const productsMap = new Map(products.map(product => [product.codigo_prod, product]));

    // Nombres de meses
    const lastMonths = ['Julio', 'Agosto', 'Septiembre', 'Octubre'];

    // Obtener códigos únicos
    const uniqueCodes = new Set();
    pendingShipmentsGrouped.forEach(item => uniqueCodes.add(item['CÓDIGO']));
    monthlySalesGroupedByCode.forEach(monthData => {
      Object.keys(monthData).forEach(code => uniqueCodes.add(code));
    });
    stockMap.forEach((value, code) => uniqueCodes.add(code));

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

      // Despachos pendientes
      const pendingShipment = pendingShipmentsGrouped.find(item => item['CÓDIGO'] === code);
      if (pendingShipment) {
        data['PENDIENTES'] = parseInt(pendingShipment['PENDIENTES'], 10);
      }

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

    // GENERAR EXCEL
    console.log('📊 Generando Excel...');
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
    
    // Cerrar navegador
    await browser.close();

    // Enviar respuesta
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="compra_sugerida_${todayFormatted}.xlsx"`);
    res.send(buffer);

  } catch (error) {
    console.error('Error:', error);
    
    if (browser) {
      await browser.close();
    }
    
    res.status(500).json({ 
      error: 'Error generando Excel', 
      details: error.message 
    });
  }
}
