import { supabase } from './supabase'
import {
  optimizeImageToWebP,
  isOptimizableImage,
  type OptimizeOptions,
} from './imageOptimizer'

export interface UploadR2Result {
  url: string
  key: string
  bucket: string
  mimeType: string
  fileSize: number
  originalSize?: number
  savedBytes?: number
  compressionRatioPercent?: number
}

export interface UploadOptions extends OptimizeOptions {
  skipOptimization?: boolean
}

/**
 * Realiza upload de um arquivo para o Cloudflare R2.
 * Converte e otimiza imagens automaticamente para o formato moderno WebP via HTML5 Canvas (zero custo de servidor).
 *
 * @param file Arquivo selecionado no input
 * @param folder Pasta destino no bucket ('products' | 'categories' | 'reels')
 * @param onProgress Callback opcional de progresso (0 a 100%)
 * @param options Opções de otimização de imagem (maxWidth, quality, cropAspectRatio, etc.)
 */
export async function uploadFileToR2(
  file: File,
  folder: 'products' | 'categories' | 'reels' = 'products',
  onProgress?: (percent: number) => void,
  options?: UploadOptions
): Promise<UploadR2Result> {
  let fileToUpload = file
  let originalSize = file.size
  let compressionRatioPercent = 0
  let savedBytes = 0

  // Se for imagem e a otimização não estiver desativada, converte para WebP
  if (isOptimizableImage(file) && !options?.skipOptimization) {
    try {
      const optimization = await optimizeImageToWebP(file, {
        maxWidth: options?.maxWidth || 1600,
        maxHeight: options?.maxHeight || 1600,
        quality: options?.quality !== undefined ? options?.quality : 0.82,
        cropAspectRatio: options?.cropAspectRatio,
      })

      fileToUpload = optimization.file
      originalSize = optimization.originalSize
      compressionRatioPercent = optimization.compressionRatioPercent
      savedBytes = Math.max(0, originalSize - optimization.optimizedSize)

      console.info(
        `[LEVER WebP] Imagem convertida com sucesso: ${(originalSize / 1024).toFixed(1)} KB -> ${(optimization.optimizedSize / 1024).toFixed(1)} KB (-${compressionRatioPercent}%)`
      )
    } catch (optErr) {
      console.warn('Falha na otimização WebP client-side, prosseguindo com arquivo original:', optErr)
    }
  }

  const fileExt = fileToUpload.name.split('.').pop()?.toLowerCase() || 'webp'
  const randomId = crypto.randomUUID()
  const key = `${folder}/${Date.now()}-${randomId}.${fileExt}`
  const contentType = fileToUpload.type || (fileExt === 'webp' ? 'image/webp' : 'application/octet-stream')

  // 1. Solicita a URL pré-assinada
  const { data: presignData, error: presignError } = await supabase.functions.invoke(
    'r2-presign',
    {
      body: {
        key,
        contentType,
      },
    }
  )

  if (presignError || !presignData?.uploadUrl) {
    throw new Error(
      presignError?.message ||
        'Não foi possível obter a URL pré-assinada do R2. Certifique-se de que a Edge Function r2-presign está configurada.'
    )
  }

  const { uploadUrl, publicUrl, bucket } = presignData

  // 2. Faz o PUT direto no Cloudflare R2 (sem passar banda pelo servidor)
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', uploadUrl, true)
    xhr.setRequestHeader('Content-Type', contentType)

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100)
          onProgress(percent)
        }
      }
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve()
      } else {
        reject(
          new Error(
            `Falha no envio para o Cloudflare R2 (Código HTTP ${xhr.status}). Verifique as permissões do token e CORS do bucket.`
          )
        )
      }
    }

    xhr.onerror = () =>
      reject(
        new Error(
          'Erro de rede ao enviar arquivo para o Cloudflare R2. Verifique se o CORS do bucket foi configurado.'
        )
      )

    xhr.send(fileToUpload)
  })

  return {
    url: publicUrl,
    key,
    bucket: bucket || 'lever-media',
    mimeType: contentType,
    fileSize: fileToUpload.size,
    originalSize,
    savedBytes,
    compressionRatioPercent,
  }
}
