import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const size = {
  width: 180,
  height: 180,
}

export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 80,
          background: '#dc2626',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 'bold',
          flexDirection: 'column',
        }}
      >
        <div>RFB</div>
        <div style={{ fontSize: 24, marginTop: 8 }}>Inventory</div>
      </div>
    ),
    {
      ...size,
    }
  )
}

