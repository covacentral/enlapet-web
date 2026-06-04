import React, { useRef, useState, useEffect } from 'react';
import styles from './ImageCropper.module.css';

export default function ImageCropper({ imageSrc, onCrop, onCancel }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [imgElement, setImgElement] = useState(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Estados para Pinch-to-Zoom táctil
  const [touchDistance, setTouchDistance] = useState(null);

  // Carga la imagen al inicializar
  useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      setImgElement(img);
      // Calcular escala inicial para ajustar la imagen al contenedor
      const containerSize = 280;
      const minScale = containerSize / Math.min(img.width, img.height);
      setScale(minScale);
      setOffset({ x: 0, y: 0 });
    };
  }, [imageSrc]);

  // Dibuja en el canvas cuando cambian escala u offset
  useEffect(() => {
    if (!imgElement || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const size = canvas.width; // 280px por defecto

    // Limpiar canvas
    ctx.clearRect(0, 0, size, size);

    // Calcular dimensiones dibujadas con la escala
    const drawWidth = imgElement.width * scale;
    const drawHeight = imgElement.height * scale;

    // Centrar imagen base + el offset del usuario
    const x = (size - drawWidth) / 2 + offset.x;
    const y = (size - drawHeight) / 2 + offset.y;

    ctx.drawImage(imgElement, x, y, drawWidth, drawHeight);
  }, [imgElement, scale, offset]);

  // Manejo de Interacción táctil y de mouse unificados
  const handleStart = (e) => {
    if (e.touches && e.touches.length === 2) {
      // Inicia Pinch to Zoom
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      setTouchDistance(dist);
      setIsDragging(false);
    } else {
      // Arrastre simple (mouse o touch de 1 dedo)
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      setIsDragging(true);
      setDragStart({ x: clientX - offset.x, y: clientY - offset.y });
    }
  };

  const handleMove = (e) => {
    if (e.touches && e.touches.length === 2) {
      if (touchDistance === null) return;
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      
      const factor = dist / touchDistance;
      setScale((prev) => {
        let newScale = prev * factor;
        // Limites del zoom: 0.1x a 5x
        return Math.max(0.1, Math.min(5, newScale));
      });
      setTouchDistance(dist);
    } else if (isDragging) {
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      setOffset({
        x: clientX - dragStart.x,
        y: clientY - dragStart.y
      });
    }
  };

  const handleEnd = () => {
    setIsDragging(false);
    setTouchDistance(null);
  };

  // Confirmar Recorte y Devolver Blob
  const handleConfirm = () => {
    if (!canvasRef.current || !imgElement) return;

    // Crear un canvas temporal para la exportación final de alta calidad (1080x1080)
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = 1080;
    exportCanvas.height = 1080;
    const ctx = exportCanvas.getContext('2d');

    // Calcular escala proporcional al tamaño de exportación (1080 / 280 = 3.857)
    const ratio = 1080 / 280;
    const drawWidth = imgElement.width * scale * ratio;
    const drawHeight = imgElement.height * scale * ratio;

    const x = (1080 - drawWidth) / 2 + offset.x * ratio;
    const y = (1080 - drawHeight) / 2 + offset.y * ratio;

    // Dibujar en alta calidad
    ctx.drawImage(imgElement, x, y, drawWidth, drawHeight);

    // Convertir a blob de WebP
    exportCanvas.toBlob((blob) => {
      if (blob) {
        onCrop(blob);
      }
    }, 'image/webp', 0.9); // Calidad del 90% para optimizar tamaño
  };

  return (
    <div className={styles.cropperOverlay}>
      <div className={styles.cropperCard}>
        <h2 className={styles.title}>Encuadra la Foto</h2>
        <p className={styles.subtitle}>Desplaza la foto con un dedo y haz zoom con dos dedos (pellizco) o usa el control de abajo.</p>

        <div 
          ref={containerRef}
          className={styles.canvasContainer}
          onMouseDown={handleStart}
          onMouseMove={handleMove}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={handleStart}
          onTouchMove={handleMove}
          onTouchEnd={handleEnd}
        >
          <canvas 
            ref={canvasRef} 
            width={280} 
            height={280} 
            className={styles.canvasElement}
          />
          <div className={styles.cropOverlayFrame} />
        </div>

        <div className={styles.controlGroup}>
          <div className={styles.sliderLabel}>
            <span>Zoom</span>
            <span>{Math.round(scale * 100)}%</span>
          </div>
          <input 
            type="range" 
            min="0.1" 
            max="3" 
            step="0.01" 
            value={scale} 
            onChange={(e) => setScale(parseFloat(e.target.value))}
            className={styles.sliderInput}
            aria-label="Ajustar zoom de la foto"
          />
        </div>

        <div className={styles.actionGroup}>
          <button onClick={onCancel} className={styles.btnCancel}>Cancelar</button>
          <button onClick={handleConfirm} className={styles.btnConfirm}>Guardar</button>
        </div>
      </div>
    </div>
  );
}
