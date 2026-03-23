/**
 * Heurísticas leves para avaliar a qualidade de uma foto no cliente.
 */

export interface PhotoQualityResult {
  score: number; // 0-100
  brightness: number; // 0-255
  contrast: number; // 0-255
  width: number;
  height: number;
  warnings: string[];
  isGood: boolean;
}

export async function analyzePhotoQuality(file: File): Promise<PhotoQualityResult> {
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

      // Rezise para um sample menor para análise rápida de performance
      const sampleWidth = 100;
      const sampleHeight = (img.height / img.width) * sampleWidth;
      canvas.width = sampleWidth;
      canvas.height = sampleHeight;
      
      ctx.drawImage(img, 0, 0, sampleWidth, sampleHeight);
      const imageData = ctx.getImageData(0, 0, sampleWidth, sampleHeight);
      const data = imageData.data;

      let totalBrightness = 0;
      let minB = 255;
      let maxB = 0;

      for (let i = 0; i < data.length; i += 4) {
        // Luminância (fórmula perceptiva padrão)
        const b = 0.2126 * data[i] + 0.7152 * data[i+1] + 0.0722 * data[i+2];
        totalBrightness += b;
        if (b < minB) minB = b;
        if (b > maxB) maxB = b;
      }

      const avgBrightness = totalBrightness / (data.length / 4);
      const contrast = maxB - minB;
      const warnings: string[] = [];

      // Critérios Empíricos
      if (avgBrightness < 35) warnings.push("MUITO_ESCURA");
      if (avgBrightness > 230) warnings.push("MUITO_ESTOURADA");
      if (contrast < 40) warnings.push("BAIXO_CONTRASTE");
      if (img.width < 600 || img.height < 600) warnings.push("BAIXA_RESOLUCAO");

      const isGood = warnings.length === 0;
      const score = Math.max(0, 100 - (warnings.length * 25));

      resolve({
        score,
        brightness: avgBrightness,
        contrast,
        width: img.width,
        height: img.height,
        warnings,
        isGood
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Erro ao carregar imagem para análise"));
    };

    img.src = objectUrl;
  });
}
