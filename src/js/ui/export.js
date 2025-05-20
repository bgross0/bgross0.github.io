// Export functionality

function exportPNG(canvas, options = {}) {
  return new Promise((resolve) => {
    // Create a temporary canvas for high-resolution export
    const exportCanvas = document.createElement('canvas');
    const exportCtx = exportCanvas.getContext('2d');
    
    // Set export resolution (300 DPI)
    const dpi = options.dpi || 300;
    const scale = dpi / 96; // 96 is default screen DPI
    
    exportCanvas.width = canvas.width * scale;
    exportCanvas.height = canvas.height * scale;
    
    // Scale the context to match the new resolution
    exportCtx.scale(scale, scale);
    
    // Draw the original canvas content at the new scale
    exportCtx.drawImage(canvas, 0, 0, canvas.width, canvas.height);
    
    // Convert to blob
    exportCanvas.toBlob((blob) => {
      resolve(blob);
    }, 'image/png');
  });
}

function exportCSV(materialTakeoff) {
  if (!materialTakeoff || !materialTakeoff.length) {
    return 'item,qty\n';
  }
  
  const header = 'item,qty\n';
  const rows = materialTakeoff.map(row => `"${row.item}",${row.qty}`).join('\n');
  
  return header + rows;
}

function downloadFile(content, filename, mimeType) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up the URL
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

// Export manager
class ExportManager {
  constructor(drawingSurface, store) {
    this.drawingSurface = drawingSurface;
    this.store = store;
    
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    eventBus.subscribe('canvas:export', async ({ format }) => {
      try {
        if (format === 'png') {
          await this.exportPNG();
        } else if (format === 'csv') {
          this.exportCSV();
        }
      } catch (error) {
        console.error('Export error:', error);
        alert('Export failed: ' + error.message);
      }
    });
  }
  
  async exportPNG() {
    const canvas = this.drawingSurface.canvas;
    const blob = await exportPNG(canvas, { dpi: 300 });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `deck-design-${timestamp}.png`;
    
    downloadFile(blob, filename, 'image/png');
  }
  
  exportCSV() {
    const state = this.store.getState();
    const materialTakeoff = state.engineOut?.material_takeoff || [];
    
    const csv = exportCSV(materialTakeoff);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `deck-materials-${timestamp}.csv`;
    
    downloadFile(csv, filename, 'text/csv');
  }
}