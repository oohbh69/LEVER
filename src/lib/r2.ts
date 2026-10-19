import { supabase } from './supabase'

export interface UploadR2Result {
  url: string
  key: string
  bucket: string
  mimeType: string
  fileSize: number
}

/**
 * Realiza upload direto de um arquivo (imagem ou vídeo) para o Cloudflare R2
 * usando uma URL pré-assinada (Presigned URL) gerada de forma segura pelo backend/Edge Function.
 *
 * @param file Arquivo selecionado no input
 * @param folder Pasta destino no bucket ('products' | 'categories' | 'reels')
 * @param onProgress Callback opcional de progresso (0 a 100%)
 */
export async function uploadFileToR2(
  file: File,
  folder: 'products' | 'categories' | 'reels' = 'products',
  onProgress?: (percent: number) => void
): Promise<UploadR2Result> {
  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const randomId = crypto.randomUUID()
  const key = `${folder}/${Date.now()}-${randomId}.${fileExt}`

  // 1. Solicita a URL pré-assinada
  const { data: presignData, error: presignError } = await supabase.functions.invoke(
    'r2-presign',
    {
      body: {
        key,
        contentType: file.type || 'application/octet-stream',
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
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')

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

    xhr.send(file)
  })

  return {
    url: publicUrl,
    key,
    bucket: bucket || 'lever-media',
    mimeType: file.type,
    fileSize: file.size,
  }
}
