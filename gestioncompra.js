const axios = require('axios').default;
const ExcelJS = require('exceljs');
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');


// --------------------- INDEX ----------------------
//  1. GLOBAL VARIABLES
//      1.1 DATE GLOBAL VARIABLES
//      1.2 AUTH GLOBAL VARIABLES
//      1.3 DOCS GLOBAL VARIABLES
//
//  2. HELPER FUNCTIONS
//      2.1 AUTH FUNCTION
//      2.2 SALES FUNCTIONS
//      2.3 STOCK FUNCTIONS
//      2.4 ESTIMATION FUNCTION
//      2.5 WEBSCRAPPING (PENDING FUNCTION)
//      2.6 EXCEL CREATION FUNCTIONS
//
//  3. MAIN FUNCTION




//------------------------------------------------------------
//------------------------------------------------------------
//------------------- GLOBAL VARIABLES -----------------------
//------------------------------------------------------------
//------------------------------------------------------------

// ------------------ DATE GLOBAL VARIABLES ------------------

const today = new Date();
const year = today.getFullYear();
const month = (today.getMonth() + 1).toString().padStart(2, '0'); // +1 because getMonth() returns 0-11
const day = today.getDate().toString().padStart(2, '0');
let todayFormatted = `${year}${month}${day}`;

const getMonthName = (date) => {
    const monthNames = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];
    return monthNames[date.getMonth()];
};

const lastMonths = [
    new Date(today.getFullYear(), today.getMonth() - 3, 1), // Mes anterior al anterior al anterior
    new Date(today.getFullYear(), today.getMonth() - 2, 1), // Mes anterior al anterior
    new Date(today.getFullYear(), today.getMonth() - 1, 1), // Mes anterior
    today // Mes actual
].map(getMonthName);





// ------------------ AUTH GLOBAL VARIABLES ------------------

const authInfo = {
    username: 'tiaxam',
    password: 'BwyRHkhSX5zi44P',
};
let authorization;




// ------------------ DOCS GLOBAL VARIABLES ------------------

const documentTypes = ["FAVE","BOVE", "NCVE"];
// const documentTypes = ["BOVE"];







//------------------------------------------------------------
//------------------------------------------------------------
//------------------- HELPER FUNCTIONS -----------------------
//------------------------------------------------------------
//------------------------------------------------------------


// ------------------- AUTH FUNCTION -----------------------

const getAuth = async () => {
    const auth = await axios
        .post('https://axam.managermas.cl/api/auth/', authInfo)
        .then((response) => response.data)
        .catch((error) => error);

    const token = auth.auth_token;
    authorization = { authorization: `token ${token}` };
}












// ------------------- SALES FUNCTIONS ---------------------

const getSales = async (initDate, endDate) => {

    console.log(`OBTENIENDO VENTAS PARA DOCUMENTOS DE TIPO: ${JSON.stringify(documentTypes)} ENTRE ${initDate} Y ${endDate}`);

    const salesRequests = documentTypes.map(docType => 
        axios.get(`https://axam.managermas.cl/api/documents/76299574-3/${docType}/V?details=1&df=${initDate}&dt=${endDate}`, { headers: authorization })
            .then(response => response.data.data)
    );

    const salesResponse = await Promise.all(salesRequests);
    
    // Flatten the array of sales responses into a single array
    const sales = salesResponse.flat();

    return sales;
}

const addSales = async (excelData, monthlyGroupedByCode) => {
    // Create a set of all unique codes
    const allCodes = new Set(excelData.map(item => item['Código']));

    // Add codes from monthlyGroupedByCode to the set
    monthlyGroupedByCode.forEach(monthData => {
        Object.keys(monthData).forEach(code => allCodes.add(code));
    });

    // Map over all unique codes
    return Array.from(allCodes).map(code => {
        let item = excelData.find(item => item['Código'] === code) || { 'Código': code };

        // Initialize PENDIENTES to 0 if it doesn't exist
        if (item['PENDIENTES'] === undefined) {
            item['PENDIENTES'] = 0;
        }

        monthlyGroupedByCode.forEach((monthData, index) => {
            const sales = monthData[code] || 0;
            const monthName = lastMonths[index];
            item[`${monthName}`] = sales;
        });

        return item;
    });
};













// ------------------- STOCK FUNCTIONS ---------------------

const getStock = async () => {
    console.log('OBTENIENDO STOCK ACTUAL');

    const stockResponse = await axios
        .get(`https://axam.managermas.cl/api/stock/76299574-3/?dt=${todayFormatted}`, {headers: authorization})
        .then((response)=> response.data.data);

    return stockResponse
}

const addStock = async (excelData, apiResponse) => {
    // Create a set of all unique codes from excelData
    const allCodes = new Set(excelData.map(item => item['Código']));

    // Add codes from apiResponse to the set
    apiResponse.forEach(item => allCodes.add(item.cod_prod));

    // Convert the API response to a map for efficient lookups
    const stockMap = new Map(apiResponse.map(item => [item.cod_prod, item.saldo]));

    // Map over all unique codes
    return Array.from(allCodes).map(code => {
        let item = excelData.find(item => item['Código'] === code) || { 'Código': code };

        // Initialize PENDIENTES to 0 if it doesn't exist
        if (item['PENDIENTES'] === undefined) {
            item['PENDIENTES'] = 0;
        }

        const stock = stockMap.get(code);
        item['STOCK'] = stock !== undefined ? stock : 0;

        return item;
    });
};




// ----------------- ESTIMATION FUNCTION ------------------------

const calculateEstimacionCompra = (data) => {
    return data.map(item => {
        
        // Adjust the reduce function to exclude the last element in the array
        const sum = lastMonths.reduce((total, month, index, array) => {
            // Skip the last element (current month)
            if (index === array.length - 1) return total;
            return total + (item[month] || 0);
        }, 0);

        item['PROMEDIO'] = sum / (lastMonths.length - 1);

        const promedioVentas = item['PROMEDIO'] || 0;
        const pendiente = item.PENDIENTE || 0;
        const saldo = item.SALDO || 0;

        item["COMPRA SUGERIDA"] = (promedioVentas * 0.33) + pendiente - (saldo * 0.25);
        
        // Rounding the result if necessary
        item["COMPRA SUGERIDA"] = Math.round( item["COMPRA SUGERIDA"] * 100) / 100;

        return item;
    });
};












// ------------------ WEBSCRAPPING (PENDING FUNCTION ) -----------------------

const getPendingShipments = async (fromDate, toDate) => {

    if (fromDate.indexOf("-") < 0) {
        fromDate = fromDate.slice(0, 4) + "-" + fromDate.slice(4, 6) + "-" + fromDate.slice(6, 8);
    }

    if (toDate.indexOf("-") < 0) {
        toDate = toDate.slice(0, 4) + "-" + toDate.slice(4, 6) + "-" + toDate.slice(6, 8);
    }

    const query = `
        query GetPendingShipments($offset: Int, $first: Int, $globalFilter: String, $fromDate: Date, $toDate: Date, $documentType: String, $customers: [String], $products: [ID], $shipmentStatus: [String], $billingStatus: [String], $costCenters: [Int], $probabilities: [ID], $businessUnits: [Int], $orderBy: String) {
            getPendingShipments(
            offset: $offset
            first: $first
            globalFilterPS: $globalFilter
            fechaDoc_Gte: $fromDate
            fechaDoc_Lte: $toDate
            tipoDoc_TipoDoc: $documentType
            numCliente_NumCliente_In: $customers
            documentoDetalle_CodArt_In: $products
            shipmentState_In: $shipmentStatus
            billingState_In: $billingStatus
            documentoDetalle_CenCos_In: $costCenters
            probabilidad_In: $probabilities
            unidadNeg_In: $businessUnits
            orderBy: $orderBy
            ) {
            pageInfo {
                hasNextPage
                hasPreviousPage
            }
            totalCount
            totalPages
            edges {
                node {
                    billingShipmentDetail {
                        productCode
                        notStockMovingDetail
                        pendingS
                    }
                }
            }
            }
        }`

    const variables = `{
        "offset": 0,
        "orderBy": null,
        "documentType": "NV",
        "shipmentStatus": ["Sin movimientos", "Parcial"],
        "billingStatus": [],
        "fromDate": "${fromDate}",
        "toDate": "${toDate}",
        "customers": [],
        "products": [],
        "businessUnits": [],
        "costCenters": [],
        "probabilities": [],
        "globalFilter": "",
        "columnVisibility": {}
    }`;

    let chromiumExecutablePath;

    if (process.pkg) {

        // If running inside a pkg executable, the path should be relative to the executable
        const pathToPkgRoot = path.dirname(process.execPath);
        chromiumExecutablePath = path.join(pathToPkgRoot, 'chrome-win', 'chrome.exe');

    } else {
        // If running in development, the path can be relative to the current file
        chromiumExecutablePath = path.join(__dirname, 'chrome-win', 'chrome.exe');
    }






    
    // Launch a new browser instance
    const browser = await chromium.launch({
        headless: true, // Changed to true for Railway deployment
        slowMo: 500,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor'
        ]
    });

    // Create a new page
    const page = await browser.newPage();

    // Navigate to the webpage
    await page.goto('https://axam.managermas.cl/login/');

    // LOGIN AUTOMÁTICO CON MANEJO DE reCAPTCHA

    console.log('🌐 Iniciando login automático...');
    
    // Wait for the page to load
    await page.waitForSelector('body');
    
    try {
        // Fill username - try multiple selectors
        console.log('👤 Buscando campo de usuario...');
        const usernameFilled = await page.evaluate(() => {
            const selectors = [
                'input[name="username"]',
                'input[name="user"]', 
                'input[name="email"]',
                'input[type="text"]',
                '#username',
                '#user',
                '#email',
                '#\\:r0\\:'
            ];
            
            for (const selector of selectors) {
                const field = document.querySelector(selector);
                if (field) {
                    field.value = 'ventasamurai';
                    field.dispatchEvent(new Event('input', { bubbles: true }));
                    field.dispatchEvent(new Event('change', { bubbles: true }));
                    return true;
                }
            }
            return false;
        });
        
        if (usernameFilled) {
            console.log('👤 Username filled');
        } else {
            console.log('⚠️ Username field not found');
        }
        
        // Fill password - try multiple selectors
        console.log('🔑 Buscando campo de contraseña...');
        const passwordFilled = await page.evaluate(() => {
            const selectors = [
                'input[name="password"]',
                'input[name="pass"]',
                'input[type="password"]',
                '#password',
                '#pass',
                '#\\:r1\\:'
            ];
            
            for (const selector of selectors) {
                const field = document.querySelector(selector);
                if (field) {
                    field.value = 'Bayona2502';
                    field.dispatchEvent(new Event('input', { bubbles: true }));
                    field.dispatchEvent(new Event('change', { bubbles: true }));
                    return true;
                }
            }
            return false;
        });
        
        if (passwordFilled) {
            console.log('🔑 Password filled');
        } else {
            console.log('⚠️ Password field not found');
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
            }
        } else {
            console.log('✅ No se detectó reCAPTCHA');
        }
        
    } catch (error) {
        console.log('⚠️ Error during automatic login:', error.message);
    }

    // ESPERAR LA RESPONSE CON LA COOKIE NECESARIA (SETEO DE LA ESPERA ANTES DEL CLICK)

    // Define the response listener
    const responsePromise = new Promise((resolve) => {
        page.on('response', async (response) => {
            const request = response.request();
            if (response.url() === 'https://axam.managermas.cl/graphql/' && response.status() === 200) {
                const postData = request.postData();
                if (postData) {
                    const payload = JSON.parse(postData);
                    if (payload.operationName === 'login') {
                        resolve(response);
                    }
                }
            }
        });
    });
    

    // Perform the click action
    await page.keyboard.press('Enter');

    // Simultaneously wait for the response and navigation
    const [response, _] = await Promise.all([
        responsePromise,
        page.waitForNavigation({ waitUntil: 'load' }) // Adjust 'load' as needed
    ]);

    // if (response) console.log("Inicio de sesión exitoso")


    // COOKIE FILTER

    const allCookies = await page.cookies();
    const sessionIdCookie = allCookies.find(cookie => cookie.name === 'sessionid');
    // console.log("Cookie de sesión encontrada: ", sessionIdCookie);



    // LLAMAR AL ENDPOINT CON LA QUERY PARA OBTENER LOS PEDIDOS PENDIENTES

    const apiResponse = await axios.post('https://axam.managermas.cl/graphql/', {
            query: query,
            variables: variables
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Cookie': `sessionid=${sessionIdCookie.value}`
            }
        }).then(response => response.data.data);
    
    await browser.close();

    console.log(`Exito al obtener los pedidos pendientes entre ${fromDate} y ${toDate}`)

    const edges = apiResponse.getPendingShipments.edges

    const nodes = edges.map(edge => edge.node);

    const pendingShipments = nodes.reduce((acc, node) => {
        if (node.billingShipmentDetail && Array.isArray(node.billingShipmentDetail)) {
            // Concatenate the current node's billingShipmentDetail array with the accumulator
            return acc.concat(node.billingShipmentDetail);
        }
        return acc;
    }, []);

    let finalData = pendingShipments.reduce((accumulator, doc) => {
        // Check if this Código already exists in the accumulator
        let existing = accumulator.find(item => item.Código === doc.productCode);
    
        if (existing) {
            // If it exists, add the PENDIENTES value
            existing.PENDIENTES += doc.pendingS;
        } else {
            // If it does not exist, add a new object to the accumulator
            accumulator.push({
                Código: doc.productCode,
                PENDIENTES: doc.pendingS
            });
        }
    
        return accumulator;
    }, []);

    return finalData

}


// ------------------ EXCEL CREATION FUNCTIONS ---------------------


const getProductsInfo = async () => {

    const products = await axios
        .get('https://axam.managermas.cl/api/products/76299574-3', {headers: authorization})
        .then((response) => response.data.data)
        .catch((error) => error);

    return products
}

const addProductsInfo = async (finalData, products) => {

    // Create a map for faster lookup of products by codigo_prod
    const productsMap = new Map(products.map(product => [product.codigo_prod, product]));

    // Iterate over each item in finalData
    for (let item of finalData) {
        // Find the matching product
        let product = productsMap.get(item.Código);
        if (product) {
            // Add Familia and Descripción to the item
            item.Familia = product.familia;
            item.Descripción = product.nombre;
        } else {
            // In case no matching product is found
            item.Familia = "Not Found";
            item.Descripción = "Not Found";
        }
    }
}



// ------------------ EXCEL CREATION FUNCTIONS ---------------------

const addDataToWorksheet = (worksheet, finalData) => {
    finalData.forEach(item => {
        const reorderedItem = {};
        worksheet.columns.forEach(column => {
            reorderedItem[column.key] = item[column.key];
        });
        worksheet.addRow(reorderedItem);
    });
}

const convertToTable = (worksheet) => {
    const rowCount = worksheet.rowCount;
    const columnCount = worksheet.columns.length;
    const endColumnLetter = String.fromCharCode(64 + columnCount); // 'A' is 65 in ASCII
    const tableEndRef = `${endColumnLetter}${rowCount}`;

    const rows = [];
    for (let i = 2; i <= rowCount; i++) { // Start from 2 to skip header row
        const rowValues = worksheet.getRow(i).values;
        rows.push(rowValues.slice(1)); // .slice(1) to remove the row number at the beginning of the values array
    }

    const table = {
        name: 'Table1',
        ref: 'A1',
        tableRef: `A1:${tableEndRef}`,
        headerRow: true,
        totalsRow: false,
        style: {
            theme: 'TableStyleMedium2',
            showRowStripes: true,
        },
        columns: worksheet.columns.map(column => ({ name: column.header, filterButton: true })),
        rows: rows
    };

    worksheet.addTable(table);
}


const applyColumnStyles = (worksheet, lastMonths) => {

    // Define the fill styles
    const currentMonthColumnFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC5E0B3' } };
    const stockColumnFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
    const pendingsColumnFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF0000' } };

    const columnStyles = {
        'STOCK': { style: { numFmt: '0', fill: stockColumnFill } }, // Numeric format and fill
        'PROMEDIO': { style: { numFmt: '0.00' } }, // Numeric with decimals
        'PENDIENTES': { style: { numFmt: '0' } }, // Numeric format
        'COMPRA SUGERIDA': { style: { numFmt: '0' } } // Numeric format
    };
    
    // Add month columns
    lastMonths.forEach(month => {
        if (month === lastMonths[lastMonths.length - 1]) {
            // Apply style only to the current month
            columnStyles[month] = { style: { numFmt: '0', fill: currentMonthColumnFill }}
        }
    });

    worksheet.eachRow((row, rowNumber) => {
        if (row.getCell('Código').value === "") {
            return;
        }

        // Skip the first row (headers)
        if (rowNumber === 1) {
            return;
        }

        row.eachCell((cell, colNumber) => {
            const columnName = worksheet.columns[colNumber - 1].key;
            const columnStyle = columnStyles[columnName]?.style;

            if (columnName === 'PENDIENTES' && cell.value > 0) {
                // Apply pendingsColumnFill style for cells in PENDIENTES column with value > 0
                cell.style.fill = pendingsColumnFill;
            } else if (columnStyle) {
                // Apply other column styles
                Object.assign(cell.style, columnStyle);
            }

        });
    });
}

const createExcelFile = async (finalData, lastMonths) => {

    // Create a new workbook
    const workbook = new ExcelJS.Workbook();

    // Add a worksheet
    const worksheet = workbook.addWorksheet('Hoja1');

    const columnProperties = {
        'Familia': { header: 'Familia', key: 'Familia'},
        'Descripción': {header: 'Descripción', key: 'Descripción'},
        'Código': { header: 'Código', key: 'Código' },
        'STOCK': { header: 'STOCK', key: 'STOCK'},
        'PROMEDIO': { header: 'PROMEDIO', key: 'PROMEDIO' },
        'PENDIENTES': { header: 'PENDIENTES', key: 'PENDIENTES' },
        'COMPRA SUGERIDA': { header: 'COMPRA SUGERIDA', key: 'COMPRA SUGERIDA' }
    };
    
    // Add month columns
    lastMonths.forEach(month => {
        columnProperties[month] = { header: month, key: month }
    });

    // Define the specific order of the columns
    const orderedColumnKeys = [
        'Familia',
        'Descripción',
        'Código', 
        ...lastMonths, // Add month columns from the array
        'STOCK',
        'PENDIENTES',
        'PROMEDIO', 
        'COMPRA SUGERIDA'
    ];

    const columns = orderedColumnKeys.map(key => columnProperties[key]);
    worksheet.columns = columns;

    // debugWorksheet(worksheet);

    // Step 2: Add Data to Worksheet
    addDataToWorksheet(worksheet, finalData);
 
    // Step 1: Convert to Table
    convertToTable(worksheet);

    // Step 3: Apply Styles to Columns
    applyColumnStyles(worksheet, lastMonths);

    let todayFormattedExcel = `${day}-${month}-${year}`

    // Write to file
    try {
        await workbook.xlsx.writeFile(`COMPRAS AXAM ${getMonthName(today)} ${todayFormattedExcel}.xlsx`);
        console.log('Archivo Excel creado, revisa la carpeta en dónde está este programa!');
    } catch (error) {
        if (error.code === 'EBUSY') {
            console.error("Error: El archivo Excel está actualmente en uso o bloqueado. " +
                        "Por favor, cierra el archivo si está abierto en otra aplicación (como Excel) e intenta de nuevo. " +
                        "Asegúrate de que ninguna otra aplicación esté utilizando o bloqueando el archivo antes de proceder.");
        } else {
            console.error("Ocurrió un error al escribir el archivo: ", error.message);
        }
    }

    return
}












//------------------------------------------------------------
//------------------------------------------------------------
//--------------------- MAIN FUNCTION ------------------------
//------------------------------------------------------------
//------------------------------------------------------------

const demandEstimation = async () => {

    try {
        await getAuth();


        console.log("OBTENIENDO DATOS")
    
        // SCRAPE DATA TO GET PENDING SHIPMENTS

        const today3mAgo = new Date(today);         // Creating a new Date object based on 'today'
        today3mAgo.setMonth(today.getMonth() - 3);  // and substracting 3 months

        const year3mAgo = today3mAgo.getFullYear();
        const month3mAgo = (today3mAgo.getMonth() + 1).toString().padStart(2, '0');
        const day3mAgo = today3mAgo.getDate().toString().padStart(2, '0');

        let today3mAgoFormatted = `${year3mAgo}${month3mAgo}${day3mAgo}`;
    
        let pendingShipments = await getPendingShipments(today3mAgoFormatted, todayFormatted);



    
        // RUN API'S TO GET SALES DATA AND ADD IT TO THE NEW FINAL DATA OBJECT

        const dates = [];
        for (let i = 3; i >= 0; i--) {
            let firstDay = new Date(today.getFullYear(), today.getMonth() - i, 1);
            let lastDay = new Date(today.getFullYear(), today.getMonth() - i + 1, 0);
        
            let formattedFirstDay = `${firstDay.getFullYear()}${String(firstDay.getMonth() + 1).padStart(2, '0')}01`;
            let formattedLastDay = `${lastDay.getFullYear()}${String(lastDay.getMonth() + 1).padStart(2, '0')}${String(lastDay.getDate()).padStart(2, '0')}`;
        
            dates.push({ firstDay: formattedFirstDay, lastDay: formattedLastDay });
        }
    
        const sales = [];
        for (const dateRange of dates) {
            const salesData = await getSales(dateRange.firstDay, dateRange.lastDay);
            sales.push(salesData);
        }
    
        let monthlyGroupedByCode = sales.map(monthSales => 
            monthSales.flatMap(sale => sale.detalles).reduce((accumulator, doc) => {
                if (accumulator[doc.codigo]) {
                    accumulator[doc.codigo] += doc.cant;
                } else {
                    accumulator[doc.codigo] = doc.cant;
                }
                return accumulator;
            }, {})
        );
    
        let finalData = await addSales(pendingShipments, monthlyGroupedByCode);






    
        // RUN API'S TO GET STOCK DATA AND ADD IT TO THE FINAL DATA OBJECT
        const stock = await getStock();
        await addStock(finalData, stock);



        const products = await getProductsInfo();
        await addProductsInfo(finalData, products);



    
        // Calculate demand estimation
    
        calculateEstimacionCompra(finalData);
    
        // Assuming finalData is an array of objects and 'Código' is the property to sort by
        finalData.sort((a, b) => a['Código'].localeCompare(b['Código']));
    




        // Create Excel File
        createExcelFile(finalData, lastMonths);


        return

    } catch (error) {
        if (process.pkg) {
            fs.writeFile('ERROR.txt', error.toString(), function (err) {
                if (err) throw err;
                console.log('File created!');
            });
    
        } else {
            console.log(error)
        }
    }

}

demandEstimation();

// TESTING
// getPendingShipments("2023-11-12", "2024-02-12");
// getAuth().then(() => getStock());
// getAuth().then(() => getSales("20240101", "20240131"));