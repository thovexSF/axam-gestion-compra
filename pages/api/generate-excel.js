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
    // Configurar Playwright - optimizado para Railway
    const isRailway = process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV === 'production';
    
    browser = await chromium.launch({
      headless: true, // SIEMPRE headless en Railway
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--no-first-run',
        '--disable-extensions',
        '--disable-plugins',
        '--disable-default-apps',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--single-process',
        '--no-zygote',
        '--disable-accelerated-2d-canvas',
        '--disable-background-networking',
        '--disable-background-sync',
        '--disable-client-side-phishing-detection',
        '--disable-component-update',
        '--disable-domain-reliability',
        '--disable-features=TranslateUI',
        '--disable-ipc-flooding-protection',
        '--disable-sync',
        '--metrics-recording-only',
        '--no-default-browser-check',
        '--no-pings',
        '--password-store=basic',
        '--use-mock-keychain'
      ]
    });
    
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      locale: 'es-ES',
      timezoneId: 'America/Santiago'
    });
    
    const page = await context.newPage();
    
    // Configurar timeouts más largos para Railway
    page.setDefaultTimeout(60000); // 60 segundos
    page.setDefaultNavigationTimeout(60000); // 60 segundos

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

    // Verificar que el browser esté abierto
    if (browser && !browser.isConnected()) {
      throw new Error('Browser se cerró inesperadamente');
    }
    
    // LOGIN
    console.log('🌐 Iniciando login...');
    console.log(`🔍 Browser conectado: ${browser.isConnected()}`);
    
    try {
      await page.goto('https://axam.managermas.cl/login/', { 
        waitUntil: 'domcontentloaded',
        timeout: 60000 // 60 segundos para Railway
      });
      console.log('✅ Página de login cargada');
    } catch (error) {
      console.log('❌ Error navegando a login:', error.message);
      throw error;
    }
    
    // LOGIN AUTOMÁTICO
    console.log('⏳ Iniciando login automático...');
    
    // Wait for login form to load with múltiples selectores
    console.log('🔍 Esperando formulario de login...');
    
    const loginSelectors = [
      'input[name="username"]',
      'input[name="user"]', 
      'input[name="email"]',
      'input[type="email"]',
      'input[type="text"]',
      'input[placeholder*="usuario"]',
      'input[placeholder*="email"]',
      'input[placeholder*="login"]',
      'input[id*="username"]',
      'input[id*="user"]',
      'input[id*="email"]',
      'input[id*="login"]',
      'form input[type="text"]',
      'form input[type="email"]'
    ];
    
    let loginFormFound = false;
    let foundSelector = '';
    
    for (const selector of loginSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 5000 });
        console.log(`✅ Campo de login encontrado: ${selector}`);
        loginFormFound = true;
        foundSelector = selector;
        break;
      } catch (e) {
        // Continuar con el siguiente selector
      }
    }
    
    if (!loginFormFound) {
      console.log('❌ No se encontró campo de login, intentando con selectores más amplios...');
      
      // Intentar con selectores más generales
      const generalSelectors = [
        'input',
        'form',
        'body'
      ];
      
      for (const selector of generalSelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 3000 });
          console.log(`✅ Elemento encontrado: ${selector}`);
          break;
        } catch (e) {
          // Continuar
        }
      }
      
      // Tomar screenshot para debugging
      await page.screenshot({ path: 'login-debug.png' });
      console.log('📸 Screenshot guardado para debugging');
    }
    
    // Fill username con múltiples intentos
    console.log('👤 Llenando username...');
    const usernameSelectors = [
      'input[name="username"]',
      'input[name="user"]',
      'input[name="email"]',
      'input[type="email"]',
      'input[type="text"]',
      'input[placeholder*="usuario"]',
      'input[placeholder*="email"]',
      'input[placeholder*="login"]',
      'input[id*="username"]',
      'input[id*="user"]',
      'input[id*="email"]',
      'input[id*="login"]'
    ];
    
    let usernameFilled = false;
    for (const selector of usernameSelectors) {
      try {
        await page.fill(selector, authInfo.username);
        console.log(`✅ Username filled con selector: ${selector}`);
        usernameFilled = true;
        break;
      } catch (e) {
        // Continuar con el siguiente selector
      }
    }
    
    if (!usernameFilled) {
      console.log('❌ No se pudo llenar username');
    }
    
    // Fill password con múltiples intentos
    console.log('🔑 Llenando password...');
    const passwordSelectors = [
      'input[name="password"]',
      'input[type="password"]',
      'input[placeholder*="password"]',
      'input[placeholder*="contraseña"]',
      'input[id*="password"]',
      'input[id*="pass"]'
    ];
    
    let passwordFilled = false;
    for (const selector of passwordSelectors) {
      try {
        await page.fill(selector, authInfo.password);
        console.log(`✅ Password filled con selector: ${selector}`);
        passwordFilled = true;
        break;
      } catch (e) {
        // Continuar con el siguiente selector
      }
    }
    
    if (!passwordFilled) {
      console.log('❌ No se pudo llenar password');
    }
    
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
        
        // Verificar si reCAPTCHA está bloqueando el login
        const recaptchaError = await page.evaluate(() => {
          const errorElements = document.querySelectorAll('.recaptcha-error, .g-recaptcha-error, [class*="recaptcha-error"]');
          return errorElements.length > 0 ? errorElements[0].textContent : null;
        });
        
        if (recaptchaError) {
          console.log(`❌ Error de reCAPTCHA: ${recaptchaError}`);
          throw new Error(`reCAPTCHA error: ${recaptchaError}`);
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
    const maxAttempts = 20; // 1 minuto max wait (reducido para Railway)
    
    while (attempts < maxAttempts && !loginDetected) {
      const currentUrl = page.url();
      console.log(`🔍 URL actual: ${currentUrl}`);
      
      // Verificar si ya no estamos en la página de login
      if (!currentUrl.includes('/login') && !currentUrl.includes('login')) {
        loginDetected = true;
        console.log(`✅ Login detectado por redirección! URL: ${currentUrl}`);
        break;
      }
      
      // Verificar si hay mensajes de error específicos
      const errorMessages = await page.evaluate(() => {
        const errorElements = document.querySelectorAll('.error, .alert, .message, [class*="error"]');
        return Array.from(errorElements).map(el => el.textContent).filter(text => text && text.trim().length > 0);
      });
      
      if (errorMessages.length > 0) {
        console.log(`❌ Errores detectados: ${errorMessages.join(', ')}`);
        throw new Error(`Login failed: ${errorMessages.join(', ')}`);
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
        '.content',
        'h1', 'h2', 'h3', // Títulos de página
        'table', // Tablas de datos
        'form' // Formularios
      ];
      
      for (const selector of loginSuccessSelectors) {
        try {
          const element = await page.$(selector);
          if (element) {
            const isVisible = await element.isVisible();
            if (isVisible) {
              loginDetected = true;
              console.log(`✅ Login detectado por elemento visible: ${selector}`);
              break;
            }
          }
        } catch (e) {
          // Continuar con el siguiente selector
        }
      }
      
      // Verificar también por contenido específico de la página
      const pageContent = await page.textContent('body');
      if (pageContent && pageContent.length > 100) { // Página con contenido sustancial
        if (!pageContent.includes('login') && !pageContent.includes('Login')) {
          loginDetected = true;
          console.log(`✅ Login detectado por contenido de página`);
          break;
        }
      }
      
      // Verificar si hay mensajes de error de login
      const errorSelectors = [
        '.error',
        '.alert-danger',
        '.login-error',
        '[class*="error"]',
        '.alert',
        '.message',
        '.notification',
        '[role="alert"]',
        '.invalid-feedback',
        '.form-error'
      ];
      
      for (const selector of errorSelectors) {
        try {
          const errorElement = await page.$(selector);
          if (errorElement) {
            const errorText = await errorElement.textContent();
            if (errorText && errorText.trim().length > 0) {
              console.log(`❌ Error de login detectado (${selector}): ${errorText.trim()}`);
              throw new Error(`Login failed: ${errorText.trim()}`);
            }
          }
        } catch (e) {
          // Continuar verificando
        }
      }
      
      // Verificar también por texto específico en la página
      const pageContent = await page.content();
      const errorMessages = [
        'Invalid username',
        'Invalid password', 
        'Credenciales incorrectas',
        'Usuario o contraseña incorrectos',
        'Login failed',
        'Authentication failed',
        'reCAPTCHA verification failed',
        'Please complete the reCAPTCHA'
      ];
      
      for (const errorMsg of errorMessages) {
        if (pageContent.includes(errorMsg)) {
          console.log(`❌ Error detectado en contenido: ${errorMsg}`);
          throw new Error(`Login failed: ${errorMsg}`);
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
