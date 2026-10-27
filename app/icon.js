import { ImageResponse } from 'next/og';

export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 300, height: 300, borderRadius: 150, border: '14px solid #F5F5F7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: '#F5F5F7', fontSize: 170, fontWeight: 700, letterSpacing: -8 }}>N</div>
        </div>
      </div>
    ),
    size
  );
}
