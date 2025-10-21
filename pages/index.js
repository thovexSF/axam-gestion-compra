import { useState } from 'react';
import Head from 'next/head';

export default function Home() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [error, setError] = useState('');
  const [credentials, setCredentials] = useState({
    username: 'ventasamurai',
    password: 'Bayona2502'
  });

  const generateExcel = async () => {
    setIsGenerating(true);
    setProgress('Iniciando proceso...');
    setError('');
    setDownloadUrl('');

    try {
      const response = await fetch('/api/generate-excel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials)
      });

      if (!response.ok) {
        throw new Error('Error al generar el Excel');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      setDownloadUrl(url);
      setProgress('Excel generado exitosamente!');
      
      // Auto download
      const a = document.createElement('a');
      a.href = url;
      a.download = `compra_sugerida_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
    } catch (err) {
      setError(err.message);
      setProgress('');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="container">
      <Head>
        <title>Generador de Compra Sugerida</title>
        <meta name="description" content="Genera Excel de compra sugerida automáticamente" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="main">
        <h1 className="title">
          🛒 Generador de Compra Sugerida
        </h1>
        
        <p className="description">
          Genera automáticamente el archivo Excel con datos de stock, ventas y despachos pendientes.
        </p>

        <div className="card">
          <h2>🔐 Credenciales de Acceso</h2>
          <div className="credentials-form">
            <div className="input-group">
              <label htmlFor="username">Usuario:</label>
              <input
                type="text"
                id="username"
                value={credentials.username}
                onChange={(e) => setCredentials({...credentials, username: e.target.value})}
                placeholder="Usuario de ManagerMas"
              />
            </div>
            <div className="input-group">
              <label htmlFor="password">Contraseña:</label>
              <input
                type="password"
                id="password"
                value={credentials.password}
                onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                placeholder="Contraseña de ManagerMas"
              />
            </div>
          </div>

          <h2>📊 Proceso de Generación</h2>
          <ul className="process-list">
            <li>🔐 Login automático en ManagerMas</li>
            <li>📦 Extracción de despachos pendientes</li>
            <li>📈 Obtención de datos de ventas</li>
            <li>📋 Consulta de stock actual</li>
            <li>📊 Generación del Excel final</li>
          </ul>

          <button 
            className="generate-btn"
            onClick={generateExcel}
            disabled={isGenerating}
          >
            {isGenerating ? '⏳ Generando...' : '🚀 Generar Excel'}
          </button>

          {progress && (
            <div className="progress">
              <p>{progress}</p>
            </div>
          )}

          {error && (
            <div className="error">
              <p>❌ Error: {error}</p>
            </div>
          )}

          {downloadUrl && (
            <div className="success">
              <p>✅ Excel generado exitosamente!</p>
              <a href={downloadUrl} download className="download-link">
                📥 Descargar Excel
              </a>
            </div>
          )}
        </div>

        <div className="info">
          <h3>ℹ️ Información</h3>
          <p>Este proceso puede tomar entre 2-5 minutos dependiendo de la cantidad de datos.</p>
          <p>El archivo se descargará automáticamente una vez completado.</p>
        </div>
      </main>

      <style jsx>{`
        .container {
          min-height: 100vh;
          padding: 0 0.5rem;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }

        .main {
          padding: 5rem 0;
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          max-width: 800px;
          width: 100%;
        }

        .title {
          margin: 0;
          line-height: 1.15;
          font-size: 3rem;
          text-align: center;
          color: white;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }

        .description {
          margin: 2rem 0;
          line-height: 1.5;
          font-size: 1.2rem;
          text-align: center;
          color: white;
          opacity: 0.9;
        }

        .card {
          margin: 2rem 0;
          padding: 2rem;
          text-align: center;
          background: white;
          border-radius: 15px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
          width: 100%;
          max-width: 600px;
        }

        .card h2 {
          color: #333;
          margin-bottom: 1rem;
        }

        .credentials-form {
          margin: 1.5rem 0;
          padding: 1rem;
          background: #f8f9fa;
          border-radius: 8px;
          border: 1px solid #e9ecef;
        }

        .input-group {
          margin: 1rem 0;
          text-align: left;
        }

        .input-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 600;
          color: #495057;
        }

        .input-group input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #ced4da;
          border-radius: 4px;
          font-size: 1rem;
          transition: border-color 0.3s ease;
        }

        .input-group input:focus {
          outline: none;
          border-color: #4CAF50;
          box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
        }

        .process-list {
          text-align: left;
          margin: 1.5rem 0;
          padding: 0 1rem;
        }

        .process-list li {
          margin: 0.5rem 0;
          color: #666;
        }

        .generate-btn {
          background: linear-gradient(45deg, #4CAF50, #45a049);
          border: none;
          color: white;
          padding: 1rem 2rem;
          font-size: 1.1rem;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
          margin: 1rem 0;
          box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);
        }

        .generate-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(76, 175, 80, 0.4);
        }

        .generate-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .progress {
          margin: 1rem 0;
          padding: 1rem;
          background: #e3f2fd;
          border-radius: 8px;
          color: #1976d2;
        }

        .error {
          margin: 1rem 0;
          padding: 1rem;
          background: #ffebee;
          border-radius: 8px;
          color: #c62828;
        }

        .success {
          margin: 1rem 0;
          padding: 1rem;
          background: #e8f5e8;
          border-radius: 8px;
          color: #2e7d32;
        }

        .download-link {
          display: inline-block;
          margin-top: 0.5rem;
          padding: 0.5rem 1rem;
          background: #4CAF50;
          color: white;
          text-decoration: none;
          border-radius: 5px;
          transition: background 0.3s ease;
        }

        .download-link:hover {
          background: #45a049;
        }

        .info {
          margin-top: 2rem;
          padding: 1.5rem;
          background: rgba(255,255,255,0.1);
          border-radius: 10px;
          color: white;
          text-align: center;
          backdrop-filter: blur(10px);
        }

        .info h3 {
          margin-top: 0;
        }

        .info p {
          margin: 0.5rem 0;
          opacity: 0.9;
        }
      `}</style>
    </div>
  );
}
