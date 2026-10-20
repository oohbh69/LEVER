/**
 * imageOptimizer.ts
 * Motor de processamento, redimensionamento e conversão de imagens para WebP no navegador.
 * Executa 100% no client-side (HTML5 Canvas nativo), com custo zero de infraestrutura e zero latência de servidor.
 */

export interface OptimizeOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number // 0.1 a 1.0 (padrão: 0.82)
  cropAspectRatio?: number // Ex: 4/5 (0.8) ou 1/1 (1.0) para banners mobile
  preserveAlpha?: boolean // Mantém canal transparente (suportado nativamente em WebP)
}

export interface OptimizationResult {
  file: File
  originalSize: number
  optimizedSize: number
  width: number
  height: number
  compressionRatioPercent: number
  format: 'image/webp' | string
}

/**
 * Verifica se um arquivo é uma imagem raster passível de conversão para WebP.
 * Ignora SVGs e vídeos.
 */
export function isOptimizableImage(file: File): boolean {
  if (!file || !file.type) return false
  if (file.type.startsWith('video/')) return false
  if (file.type === 'image/svg+xml') return false
  if (file.type === 'image/gif') return false // Preserva animações GIF
  return file.type.startsWith('image/') || /\.(png|jpe?g|webp|bmp|heic|tiff)$/i.test(file.name)
}

/**
 * Converte e otimiza qualquer arquivo de imagem para WebP com redimensionamento proporcional.
 */
export async function optimizeImageToWebP(
  file: File,
  options: OptimizeOptions = {}
): Promise<OptimizationResult> {
  const originalSize = file.size

  // Se não for imagem raster otimizável, retorna o arquivo original intacto
  if (!isOptimizableImage(file)) {
    return {
      file,
      originalSize,
      optimizedSize: originalSize,
      width: 0,
      height: 0,
      compressionRatioPercent: 0,
      format: file.type || 'application/octet-stream',
    }
  }

  const maxWidth = options.maxWidth || 1440
  const maxHeight = options.maxHeight || 1440
  const quality = options.quality !== undefined ? options.quality : 0.82

  return new Promise((resolve) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)

      try {
        let srcX = 0
        let srcY = 0
        let srcW = img.naturalWidth || img.width
        let srcH = img.naturalHeight || img.height

        // Se houver recorte por aspect ratio (ex: 4:5 ou 1:1 para mobile)
        if (options.cropAspectRatio && options.cropAspectRatio > 0) {
          const targetRatio = options.cropAspectRatio
          const currentRatio = srcW / srcH

          if (currentRatio > targetRatio) {
            // A imagem é mais larga do que o alvo -> corta as laterais (centralizado)
            const targetW = srcH * targetRatio
            srcX = (srcW - targetW) / 2
            srcW = targetW
          } else {
            // A imagem é mais alta do que o alvo -> corta topo/baixo (centralizado)
            const targetH = srcW / targetRatio
            srcY = (srcH - targetH) / 2
            srcH = targetH
          }
        }

        // Calcula dimensões finais redimensionadas proporcionalmente
        let dstW = srcW
        let dstH = srcH

        if (dstW > maxWidth) {
          const ratio = maxWidth / dstW
          dstW = maxWidth
          dstH = Math.round(dstH * ratio)
        }

        if (dstH > maxHeight) {
          const ratio = maxHeight / dstH
          dstH = maxHeight
          dstW = Math.round(dstW * ratio)
        }

        dstW = Math.max(1, Math.round(dstW))
        dstH = Math.max(1, Math.round(dstH))

        // Cria o canvas para renderização de alta qualidade
        const canvas = document.createElement('canvas')
        canvas.width = dstW
        canvas.height = dstH

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          return resolve({
            file,
            originalSize,
            optimizedSize: originalSize,
            width: srcW,
            height: srcH,
            compressionRatioPercent: 0,
            format: file.type,
          })
        }

        // Configura interpolação de alta qualidade
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'

        // Renderiza com suporte a transparência
        ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, dstW, dstH)

        // Converte para WebP
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              // Fallback se toBlob falhar
              return resolve({
                file,
                originalSize,
                optimizedSize: originalSize,
                width: dstW,
                height: dstH,
                compressionRatioPercent: 0,
                format: file.type,
              })
            }

            // Gera o novo nome de arquivo com extensão .webp
            const baseName = file.name.replace(/\.[^/.]+$/, '')
            const newFileName = `${baseName}.webp`
            const optimizedFile = new File([blob], newFileName, {
              type: 'image/webp',
              lastModified: Date.now(),
            })

            const optimizedSize = optimizedFile.size
            const saved = Math.max(0, originalSize - optimizedSize)
            const ratioPercent = originalSize > 0 ? Math.round((saved / originalSize) * 100) : 0

            resolve({
              file: optimizedFile,
              originalSize,
              optimizedSize,
              width: dstW,
              height: dstH,
              compressionRatioPercent: ratioPercent,
              format: 'image/webp',
            })
          },
          'image/webp',
          quality
        )
      } catch (err) {
        console.error('Erro ao processar imagem no canvas:', err)
        resolve({
          file,
          originalSize,
          optimizedSize: originalSize,
          width: 0,
          height: 0,
          compressionRatioPercent: 0,
          format: file.type,
        })
      }
    }

    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl)
      console.warn('Não foi possível carregar a imagem para conversão:', err)
      resolve({
        file,
        originalSize,
        optimizedSize: originalSize,
        width: 0,
        height: 0,
        compressionRatioPercent: 0,
        format: file.type,
      })
    }

    img.src = objectUrl
  })
}

/**
 * Gera automaticamente uma versão otimizada para mobile a partir de qualquer imagem de banner.
 * Por padrão, preserva a proporção integral do banner sem cortar texto ou imagens laterais, com largura máxima de 800px em WebP de alta nitidez (~20-40KB).
 */
export async function generateMobileBannerWebP(
  file: File,
  aspectRatio?: number,
  maxWidth: number = 800
): Promise<OptimizationResult> {
  return optimizeImageToWebP(file, {
    maxWidth,
    maxHeight: aspectRatio ? Math.round(maxWidth / aspectRatio) : 800,
    quality: 0.82,
    cropAspectRatio: aspectRatio,
  })
}
