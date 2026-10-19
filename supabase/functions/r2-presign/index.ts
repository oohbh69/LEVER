// Supabase Edge Function: r2-presign
// Gera URLs pré-assinadas para envio direto e seguro do navegador para o Cloudflare R2 (S3 API).

import { S3Client, PutObjectCommand } from 'npm:@aws-sdk/client-s3@3.540.0'
import { getSignedUrl } from 'npm:@aws-sdk/s3-request-presigner@3.540.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  // Trata requisição de preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { key, contentType } = await req.json()

    if (!key) {
      return new Response(
        JSON.stringify({ error: 'Parâmetro "key" é obrigatório.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Variáveis de ambiente configuradas no Supabase Secrets
    const accountId = Deno.env.get('R2_ACCOUNT_ID')
    const accessKeyId = Deno.env.get('R2_ACCESS_KEY_ID')
    const secretAccessKey = Deno.env.get('R2_SECRET_ACCESS_KEY')
    const bucketName = Deno.env.get('R2_BUCKET_NAME') || 'lever'
    const publicDomain = Deno.env.get('R2_PUBLIC_DOMAIN') || 'https://pub-1237dc68871b4260bd14e699f8eed1d7.r2.dev'

    if (!accountId || !accessKeyId || !secretAccessKey) {
      return new Response(
        JSON.stringify({
          error: 'Credenciais do Cloudflare R2 não configuradas no servidor.'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Cliente compatível com S3 da Cloudflare
    const s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    })

    const putCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: contentType || 'application/octet-stream',
    })

    // Gera a URL pré-assinada válida por 15 minutos (900 segundos)
    const uploadUrl = await getSignedUrl(s3, putCommand, { expiresIn: 900 })
    const publicUrl = `${publicDomain.replace(/\/$/, '')}/${key}`

    return new Response(
      JSON.stringify({
        uploadUrl,
        publicUrl,
        key,
        bucket: bucketName,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || 'Erro interno ao gerar URL pré-assinada.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
