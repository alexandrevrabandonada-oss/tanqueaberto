/**
 * Utilitário para compressão e padronização de imagens antes do upload.
 */

export interface ImageProcessOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'image/jpeg' | 'image/webp';
}

export async function processImageForUpload(file: File, options: ImageProcessOptions = {}): Promise<File> {
  const {
    maxWidth = 1600,
    maxHeight = 1600,
    quality = 0.82,
    format = 'image/jpeg'
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error("Não foi possível obter o contexto do canvas"));
        return;
      }

      let width = img.width;
      let height = img.height;

      // Calcular proporções respeitando limites máximos
      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Erro ao gerar blob da imagem"));
          return;
        }

        const processedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
          type: format,
          lastModified: Date.now()
        });

        resolve(processedFile);
      }, format, quality);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Erro ao processar imagem"));
    };

    img.src = objectUrl;
  });
}
