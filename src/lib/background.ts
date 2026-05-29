interface BackgroundApiResponse {
  url?: string
  imgurl?: string
}

export async function loadBackground(api: string): Promise<string | null> {
  if (!api) return null
  try {
    const response = await fetch(api, { headers: { Accept: 'application/json' } })
    if (!response.ok) return null
    const data = (await response.json()) as BackgroundApiResponse
    return data.url || data.imgurl || null
  } catch {
    return null
  }
}
